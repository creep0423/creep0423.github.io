---
title: 'RAG 检索为什么不能“一把梭”？基于 Intent 的动态 RetrievalPlan 设计'
description: '所有 Query 共用一套 top_k / threshold 为什么会失效，以及如何从 Intent 逐层生成 RetrievalPlan。'
pubDate: 2026-08-16
tags: ['RAG', 'RetrievalPlan', 'Intent', 'Retriever']
category: 'RAG'
series: 'production-rag'
seriesOrder: 4
featured: false
draft: false
---

刚开始做 RAG 时，检索参数通常写得很干净：

```python
top_k = 5
threshold = 0.5
rerank = True
```

不管用户问什么，统一搜 5 条，统一过阈值，统一 Rerank。

这套写法最大的优点是简单。

问题是，用户的问题一点也不统一。

“年假有几天？”和“请结合制度说明员工异地出差的住宿、交通和审批要求”，显然不是同一种检索任务；“那审批呢？”和“HR-POLICY-017 第 4.2 条是什么”，也不应该用完全相同的召回范围。

后来我越来越觉得，一个 RAG 系统如果所有 Query 都共用同一套 `top_k / threshold / query_variants`，就有点像数据库里所有 SQL 都强制走同一个执行计划。

能跑。

但很难一直跑得好。

所以比“用什么 Retriever”更前面的一层问题是：

> **这一次请求，到底应该怎么检索？**

这就是 RetrievalPlan 要解决的事情。

---

## 1. Intent 判断完了，为什么还不能直接 Search？

假设前面已经完成了 Intent Classification。

现在我们知道某个问题属于：

```text
FAQ_QUERY
KNOWLEDGE_QUERY
FOLLOW_UP
```

看起来似乎已经可以开始查知识库了。

但 Intent 其实只回答了：

> 用户大概在问什么类型的问题？

它没有回答：

> 这类问题应该查多少？查哪里？能不能快速直出？要不要 Query Variants？最后给 LLM 留多少 Context？

所以我更愿意把 Intent 和 Retrieval 分成两层：

```text
Intent
  ↓
RetrievalPlan
  ↓
Retriever
```

Intent 是判断。

RetrievalPlan 是策略。

Retriever 只负责执行。

![从 Intent 到 RetrievalPlan 的完整关系](/images/production-rag/04-retrieval-plan-01.webp)

> 图 1：从 Intent 到 RetrievalPlan 的完整关系。Intent 负责判断问题类型，RetrievalPlan 再把 Intent、置信度和问题特征翻译成真正可执行的检索策略。

这样后面的检索代码就不需要到处散落：

```python
if intent == "FAQ_QUERY":
    ...
elif intent == "KNOWLEDGE_QUERY":
    ...
elif intent == "FOLLOW_UP":
    ...
```

而是统一读取一份计划。

一份比较完整的 RetrievalPlan，通常会包含 `run_faq`、`run_doc`、FAQ/Doc 的 `top_k`、是否 Rerank、FAQ 直出阈值、最终 Context 数量、最低相关性分数、Context 长度预算，以及是否启用 Query Variants 等参数。它本质上就是后续检索阶段统一消费的一份参数包。

---

## 2. RetrievalPlan 真正决定的，不只是 Top-K

如果只把 RetrievalPlan 理解成：

> 动态改几个参数。

其实有点低估它了。

它真正回答的是一个更麻烦的问题：

> **当前请求应该更快地给出答案，还是更谨慎地多找一些证据？**

这个选择背后其实一直在拉扯四件事：

```text
Recall
Precision
Latency
Cost
```

更多的 `top_k` 往往意味着 Recall 更高，但候选噪声和 Rerank 成本也会上去。

更严格的 FAQ 直出阈值能降低误答风险，却会让更多本来可以快速结束的问题进入完整 RAG。

Query Variants 能扩大召回视角，但每增加一个 Variant，就意味着更多搜索和后续排序。

所以动态检索策略的重点，并不是让参数“更智能”，而是让不同问题承担不同成本。

检索计划常见的输入也不只有 Intent，还可以继续参考 Intent 决策置信度、问题风险类别，以及问题是否偏向表格、清单或字段类资料。这些信号最终都在影响“快一点”还是“多找一点证据”。

---

## 3. FAQ 型问题：别把简单问题做复杂了

比如用户问：

> “试用期有年假吗？”

如果知识库中本来就有稳定的标准 FAQ，这类问题没必要为了“检索充分”而拉几十个长文档回来。

更合理的策略通常是：

```text
FAQ 优先
↓
较小的 Doc 候选池
↓
不生成 Query Variants
↓
满足条件时快速直出
```

注意，“FAQ 优先”并不一定意味着完全关闭文档检索。

保留少量 Doc 作为兜底往往更稳妥：FAQ 如果没有真正命中，系统仍然有机会从制度正文里找到证据。

这类设计的关键不是“尽量多搜”，而是：

> **问题已经很标准时，不要人为制造复杂度。**

一种实际策略就是保留 FAQ 和 Doc 两路，但收缩文档候选，同时关闭不必要的 Query Variants，让标准问法更有机会快速结束。

这也是动态 RetrievalPlan 最容易产生收益的地方：少一次无意义的扩召回，往往比后面优化几十毫秒的模型推理更直接。

---

## 4. Knowledge Query：这时候反而别太省

换一个问题：

> “请说明公司的差旅报销流程，包括住宿标准、交通费用和审批要求。”

这种问题显然很难靠一条 FAQ 回答完整。

它往往需要从制度正文、流程说明甚至多个 Chunk 中拼出证据。

此时如果还坚持：

```text
doc_top_k = 5
context_top_n = 3
```

就可能不是“高效”，而是把正确证据提前裁掉了。

知识型问题更适合：

```text
扩大 Doc 候选
启用 Query Variants
保留更多高质量 Context
再交给 Reranker 收紧
```

这种策略的思路和第二篇讲的 `Recall → Rerank` 是一致的：

**先别漏，再排准。**

知识查询通常会把文档作为主要证据来源，扩大 Doc 候选，同时允许 Query Variants 帮助补召回。

这里有个我觉得很实用的判断：

> 如果一个问题天然需要“综合多段资料”才能回答，那么 Retrieval 的第一目标通常不是快，而是别太早把证据丢掉。

---

## 5. FOLLOW_UP：信息越少，反而可能要搜得更谨慎

第三篇刚讲过这种问题：

> “那审批呢？”

经过 Query Rewrite 后，它可能变成：

> “入职流程中的审批步骤是什么？”

但即使 Rewrite 完成，这类问题通常仍然比标准 FAQ 更不确定。

因为它还经历了：

```text
History
↓
Intent 判断
↓
Query Rewrite
↓
Retrieval
```

中间任何一层理解偏一点，后面的检索方向都会跟着偏。

所以 FOLLOW_UP 往往不适合激进直出。

更稳妥的做法是多取一些 FAQ 和 Doc 候选，允许 Query Variants，同时提高模糊 FAQ 直接返回的门槛。

换句话说：

> **输入信息越少，不代表检索应该越简单；有时候恰好相反。**

![不同问题类型对应不同的检索预算和风险策略](/images/production-rag/04-retrieval-plan-02.webp)

> 图 2：不同问题类型对应不同的检索预算和风险策略。没有一套固定的 Top-K、Threshold 和 Query Variants 能适配所有 Query。

追问场景常见的做法就是同时扩大 FAQ 和文档候选，并对 FAQ 直出更谨慎，先多找证据再判断。

---

## 6. Intent Confidence 低的时候，不应该“赌一把”

还有一种情况很容易忽略。

Intent 系统已经给出了结果：

```text
intent = FAQ_QUERY
```

但它自己其实也不太确定。

比如规则和模型判断发生冲突，最后虽然选择了 FAQ_QUERY，但 Decision Score 很低。

这时候如果 RetrievalPlan 只看 Intent Label：

```python
if intent == FAQ_QUERY:
    fast_answer()
```

其实很危险。

更合理的是把 Intent 的决策置信度也传给 RetrievalPlan。

我的理解是：

> **上游越不确定，下游越应该保守。**

“保守”不一定意味着拒答。

它可以表现为提高 FAQ 直出门槛、扩大文档候选、要求更充分的 Context，或者只允许非常明确的 FAQ Match 直接返回。

这样即使 Intent 判断存在不确定性，Retrieval 仍然有机会把风险兜回来。

这一层设计的核心也是如此：入口决策越不稳定，越不能因为某个 FAQ 相似度看起来不错，就过早结束；而具体阈值必须通过真实业务样本做校准，不能只靠代码里拍一个数字。

---

## 7. 动态计划最好是“规则叠加”，不是一张巨型配置表

实现 RetrievalPlan 时，我不太喜欢为每一种情况维护完整参数：

```text
FAQ_QUERY         → 一整套配置
KNOWLEDGE_QUERY   → 一整套配置
FOLLOW_UP         → 一整套配置
COMPLIANCE_QUERY  → 一整套配置
TABLE_QUERY       → 一整套配置
...
```

这种写法刚开始很直观，后来很容易组合爆炸。

更自然的方式是从一套 Base Params 开始，然后逐层打 Patch：

![RetrievalPlan 的分层生成方式](/images/production-rag/04-retrieval-plan-03.webp)

> 图 3：RetrievalPlan 的分层生成方式。与其维护一张不断膨胀的配置表，不如从 Base Params 出发，通过 Intent、置信度、风险类别和问题形态逐层叠加策略。

比如先因为 `KNOWLEDGE_QUERY` 扩大 Doc 候选，随后发现这是合规类问题，再提高直出保护；如果又检测到问题依赖表格字段，再继续扩大表格资料的候选范围。

这样规则之间的职责比较清楚，也容易解释“为什么这一次最终得到了这套参数”。

比起最后只看到：

```text
doc_top_k = 24
```

我更希望 Trace 中还能看到：

```text
reason:
knowledge_query
+ low_confidence_guard
+ compliance_guard
```

动态策略如果不能解释，出了 Bad Case 时就会很痛苦。

---

## 8. Top-K 不是越大越安全

动态 RetrievalPlan 很容易走到另一个极端：

> 不确定？那就多搜一点。

然后所有 Bad Case 都通过加 `top_k` 解决。

这通常撑不了多久。

因为候选越多，Rerank 越慢；最终 Context 越多，Prompt 越长；噪声太多时，Generation 反而可能变差。

所以调 RetrievalPlan 时，我更习惯先判断失败属于哪一层。

如果是 FAQ 误直出，就应该先看直出阈值。

如果是正确来源根本没进候选集，再考虑扩大 `doc_top_k`。

如果 P95 Latency 已经明显上升，就不能继续无脑扩候选。

评测层面的做法也应该类似：误直出、漏直出、漏召回和性能超标，对应的是不同参数，不能拿一个 `top_k` 解决所有问题。

这也是为什么 RetrievalPlan 最后一定要和评测绑在一起。

否则所谓“动态”，很容易只是把更多 Magic Number 藏进配置文件。

---

## 写在最后

固定 Retrieval 参数最大的诱惑，是简单。

```text
所有 Query
   ↓
同一个 Top-K
同一个 Threshold
同一个 Rerank
```

对于 Demo，这完全够用。

但问题一多，就会发现用户实际在提交的是完全不同的检索任务。

标准 FAQ 更需要速度和确定性。

复杂知识问题更需要 Recall。

追问更需要谨慎。

低置信度判断更需要保护。

高风险问题则更不能轻易直出。

所以 RetrievalPlan 真正做的事情，可以压缩成一句话：

> **把“用户在问什么”，翻译成“这一次应该怎么搜”。**

最终链路也就从：

```text
Intent
  ↓
Search
```

变成：

```text
Intent
   ↓
Confidence / Risk / Query Shape
   ↓
RetrievalPlan
   ↓
FAQ / Doc / Variants / Top-K / Threshold
   ↓
Retrieval
```

我觉得这也是 RAG 从“会检索”走向“会做检索决策”的一个分界点。

因为 Production Retrieval 的目标从来不是：

> 每一次都搜得最多。

而应该是：

> **在足够可靠的前提下，只付出这次请求真正需要的检索成本。**

下一篇会进入这个系列的最后一个问题：

## 《检索到了，不代表应该回答：Production RAG 的证据、引用与置信度设计》

因为即使 Intent 对了、RetrievalPlan 也对了、Retriever 也真的找到了相关资料，仍然还有一道关要过：

> **这些证据，真的已经足够支撑一个答案了吗？**
