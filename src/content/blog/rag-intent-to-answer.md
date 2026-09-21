---
title: '从 Intent 到 Answer：企业级 RAG Pipeline 是怎么工作的'
description: 'Production RAG 的主链路不是 Retrieval → Generation，而是路由、Intent 理解、检索规划到验证收口的一连串决策。'
pubDate: 2026-07-12
tags: ['RAG', 'Production RAG', 'Pipeline', 'LLM']
category: 'RAG'
series: 'production-rag'
seriesOrder: 1
featured: true
draft: false
---

第一次把一个 RAG Demo 接到真正的对话入口时，我发现最先暴露出来的问题，甚至不是“检索准不准”。

而是有人只发了一句：

> “你好。”

系统却非常认真地走完了：

```text
Embedding
→ Vector Search
→ Top-K Documents
→ Prompt
→ LLM
```

最后花了一圈计算资源，回答：

> “你好，有什么可以帮你？”

当然没错。

只是怎么看都有点像——**开着挖掘机去拧一颗螺丝。**

这也是我后来重新理解 RAG Pipeline 的一个起点：

> **Production RAG 的主链路，并不是 Retrieval → Generation，而是一连串“要不要做、该怎么做、什么时候停”的决策。**

真正完整的一次请求，往往更接近：

```text
Query
  ↓
Route Decision
  ↓
Intent / Query Understanding
  ↓
Retrieval Plan
  ↓
FAQ / Document Retrieval
  ↓
Evidence Check
  ↓
Prompt + Generation
  ↓
Citation / Verification
  ↓
History / Trace
```

有些请求甚至走不到 Retrieval。

有些检索完成以后，也根本不应该进入 LLM。

---

## 1. RAG Pipeline 首先是一条决策链

最简单的 RAG Demo 通常很好理解：

```python
docs = retriever.invoke(query)
answer = llm.invoke(build_prompt(query, docs))
```

对于学习原理，这完全够用。

但一旦开始处理真实请求，很快就会碰到一些尴尬的问题：

用户说“你好”，还要不要查知识库？

标准 FAQ 已经能确定答案，还要不要继续搜十几篇文档？

这一轮只说“那审批呢？”，应该拿这四个字直接做 Embedding 吗？

搜到的资料分数都很低，还要不要让 LLM 硬答？

这时，一条简单的 Retrieval Chain 就不太够用了。

更完整的主线通常会拆成类似这样的阶段：

![Production RAG 的完整请求生命周期](/images/production-rag/01-intent-to-answer-01.webp)

> 图 1：Production RAG 的完整请求生命周期。生成只是其中一个阶段，前面有路由、理解和检索，后面还有引用、验证与 Trace

生成只是其中一个阶段，而不是整套系统的中心。完整 Pipeline 还需要在生成之前完成路由、检索准备和证据判断，生成之后继续做引用、核验与统一收口。

---

## 2. 第一件事不是检索，而是判断要不要检索

所以在线请求进来以后，我更愿意先问：

> **这条 Query 真的需要 RAG 吗？**

比如下面几种请求：

```text
“你好”
“转人工”
“不属于当前知识范围的问题”
“一个已经精确匹配到标准答案的 FAQ”
```

它们都没有必要跑完整的 RAG。

这就是 Route / Early Exit 的价值。

一个比较实用的结构是：

![Route 与 Early Exit](/images/production-rag/01-intent-to-answer-02.webp)

> 图 2：Route 与 Early Exit。并不是所有 Query 都应该进入完整 RAG，能确定性解决的问题应该尽早收口。

这里有个很重要的思路：

> **不是“能走完整链路”才叫设计完整，而是知道什么时候不该继续走。**

而且 Early Exit 不只发生在入口。

进入 Retrieval 以后，如果 FAQ 已经给出了足够确定的标准答案，可以再次提前结束；如果后面发现证据不足，也应该在 LLM 生成之前收口。完整链路本身就允许直答、FAQ 直出和信息不足等分支提前结束。

这类设计带来的好处并不复杂：少一次无意义的检索，少一次没必要的模型调用，也少一次生成出错的机会。

---

## 3. Route 和 Intent 不是一回事

这里还有一个很容易混淆的地方。

Route 回答的是：

> **要不要进入 Retrieval？**

Intent 回答的是：

> **既然要检索，这到底是什么类型的问题？**

比如进入检索链路以后，可能还需要区分：

```text
FAQ_QUERY
KNOWLEDGE_QUERY
FOLLOW_UP
```

我不太赞成把这种判断全部扔给一个大模型。

对于明显的问候、追问形态、强 FAQ 模式，一些确定性规则其实更便宜，也更容易解释；模糊部分可以交给轻量分类模型，最后再通过 Decision Gateway 处理规则与模型冲突，并保留一个相对保守的 fallback。

一种可落地的结构就是：

```text
规则候选
   +
轻量 Intent Model
   ↓
Decision Gateway
   ↓
Final Intent
```

这样 Intent 不再只是一个标签，而是后续检索策略的输入。规则候选、模型判断和决策网关分开处理，也能避免“模型分最高就无条件采用”的问题。

---

## 4. “那审批呢？”为什么不能直接拿去检索

多轮对话里最典型的问题，是用户根本不会每次都说完整句子。

上一轮：

> “入职流程有哪些步骤？”

下一轮很可能只是：

> “那审批呢？”

如果直接拿“那审批呢”去做 Embedding，Retriever 实际上根本不知道这里的“审批”属于哪件事。

所以 Intent 一旦判断这是一个 `FOLLOW_UP`，下一步通常不是马上检索，而是先把它恢复成一个独立问题，例如：

```text
Raw Query:
那审批呢？

Rewritten Query:
入职流程中的审批步骤是什么？
```

这里需要注意，Rewrite 的目标不是“把句子写得更漂亮”。

真正的目标是：

> **把依赖聊天历史才能理解的问题，转换成 Retriever 自己也能理解的问题。**

这个动作虽然发生在 Retrieval 之前，却经常直接决定后面的召回质量。

第三篇我会专门展开这一块，这里先把它放回整条 Pipeline 的位置上。

---

## 5. Intent 之后，不应该直接写死 Top-K

知道用户在问什么以后，还有一个问题：

> **到底该怎么搜？**

一个很自然但后期会变得很难维护的写法是：

```python
if intent == "FAQ_QUERY":
    ...
elif intent == "KNOWLEDGE_QUERY":
    ...
elif intent == "FOLLOW_UP":
    ...
```

然后这些判断逐渐散落到各个 Retriever 里。

更干净的做法，是在检索前先产出一份 `RetrievalPlan`。

它可以包含：

```text
是否查 FAQ
是否查 Document
各自 Top-K
是否 Rerank
最低相关性阈值
是否生成 Query Variants
最终 Context 数量
Context 长度预算
```

后面的 Retriever 不再关心“这个 Intent 为什么这么搜”，只需要执行计划。`RetrievalPlan` 本质上就是把业务判断转换成一份稳定的检索参数包。

这一步真正解决的，其实是一个工程上的权衡：

> **Recall、Precision、Latency 和 Cost 不可能永远同时最大化。**

知识型问题可能值得扩大召回。

FAQ 类型的问题可能更在乎速度和确定性。

一个置信度不高的追问，反而可以采用更保守的策略，多找几条证据再决定。

所以 Retrieval 不应该只有一套固定参数。

---

## 6. RetrievalPlan 决定“查哪里”，Hybrid Search 决定“怎么查”

到了真正的检索阶段，还要再区分两层概念。

FAQ / Doc 是业务层的搜索范围。

Dense / BM25 Hybrid Search 是 Collection 内部的召回方式。

也就是说：

```text
RetrievalPlan
     ↓
选择 FAQ / Doc
     ↓
在选中的 Collection 内
执行 Dense + Sparse Retrieval
     ↓
Rerank
```

把这两层拆开以后，一个问题就可以 FAQ 优先，也可以 Doc-heavy，甚至只执行其中一路，而不需要改变底层 Hybrid Search 的实现。

具体 Dense、BM25、Fusion 和 Reranker 怎么配合，我放在第二篇单独展开，这篇更关心的是它们在整个 Pipeline 中的位置。

---

## 7. 搜到东西，不代表已经可以回答

这是我觉得 RAG 从 Demo 走向 Production 时，一个非常关键的变化。

很多简单实现默认：

```text
有 Hits
=
有 Context
=
可以问 LLM
```

但这三个等号并不成立。

可能确实搜到了五条文档，可它们的相关性都很勉强；也可能每一条只沾到一点边，没有任何内容真正支撑用户的问题。

所以 Retrieval 结束以后，最好还有一个 Evidence Check。

它要回答的不是：

> “有没有搜到东西？”

而是：

> **“现在这些证据，够不够支撑一次回答？”**

如果筛选、阈值和 Context Selection 之后已经没有可靠证据，更安全的做法是直接返回类似：

> “当前信息不足，无法确认。”

而不是继续让 LLM 根据几条边缘材料即兴发挥。证据不足时提前进入 `insufficient_context`，而不是继续生成，本身就是一种明确的幻觉控制。

换句话说：

> **会拒答，也是 RAG 能力的一部分。**

---

## 8. Prompt 不应该承担前面所有层的问题

如果 Route、Rewrite、Retrieval 和 Evidence 都准备好了，这时才真正轮到 Prompt。

我更喜欢把这里拆成两个概念：

```text
Prompt Profile
→ 决定“用什么回答方式”

Prompt Rendering
→ 把 Query、Context、Sources 真正填进去
```

比如知识解释、故障排查、步骤说明，对答案结构的要求可能完全不同。

但无论选什么 Prompt，有一件事是不变的：

> Prompt 只能基于前面已经准备好的证据组织答案，它不应该负责弥补错误的路由、糟糕的检索或者缺失的上下文。

这也是为什么遇到 Bad Case 时，我现在很少第一反应就去改 Prompt。

很多所谓的“Prompt 问题”，最后查下来其实是上游根本没有把正确材料送进来。

---

## 9. LLM 输出以后，Pipeline 还没有结束

Production RAG 里，`stream_llm_answer()` 更像生成阶段的开始，而不是终点。

最终答案通常还需要经过：

```text
Streaming
→ Citation Enforcement
→ Generation Verification
→ Answer Confidence
→ History / Trace
```

引用尤其重要。

一个回答末尾放着“参考来源”并不等于每个事实都有依据。更严格一点的做法，是检查正文里的引用是否真实存在、是否覆盖关键事实，以及最终文本和上下文之间是否仍有足够支撑。

置信度也应该谨慎理解。

例如可以分别记录生成前的 `evidence_confidence` 和生成后的 `generation_verification`，再得到一个最终的 `answer_confidence`。

但它更适合作为**可解释的工程诊断信号**，而不是告诉用户“这条答案有 87% 概率是正确的”。没有经过真实评测集和概率校准之前，把工程分数直接解释成正确率，会显得比系统实际知道的更多。

---

## 10. 答案错了，先别急着调 Prompt

真正让我觉得一条 RAG Pipeline 开始“像生产系统”的，不是它多了几个组件，而是出错以后能回答：

> **到底是哪一层错了？**

一次 Bad Case 可能来自完全不同的位置：

![RAG Bad Case 的分层诊断路径](/images/production-rag/01-intent-to-answer-03.webp)

> 图 3：RAG Bad Case 的分层诊断路径。先检查 Route、Rewrite 和 Retrieval，再判断问题是否真的出在 Prompt 或 Generation。

如果没有 Trace，最后看到的只有一句错误答案，很容易把锅全甩给 LLM。

更实用的做法，是保留一条不调用最终生成模型的 Retrieval Debug 路径，只跑 Route、Intent、Plan 和 Sources。

这样看到错误答案时，可以先确认：

```text
走了什么 Route？
Intent 是什么？
Query 有没有被 Rewrite？
RetrievalPlan 是什么？
最终召回了哪些 Sources？
```

类似 `debug_retrieval()` 的诊断半链路，本质上就是把“回答问题”和“排查问题”拆开：复用相同的路由和检索逻辑，但不调用最终回答 LLM。

这也解释了为什么我越来越不喜欢一句：

> “效果不好，再调调 Prompt。”

Prompt 当然重要。

但它只是整条链路的最后几站之一。

---

## 写在最后

如果只看最小 Demo，RAG 很像：

```text
Retrieval → Generation
```

但真正把它放进持续运行的系统以后，更接近：

```text
Understanding
   ↓
Decision
   ↓
Retrieval
   ↓
Evidence
   ↓
Generation
   ↓
Verification
   ↓
Observability
```

中间每一层都在回答一个不同的问题：

要不要查？

用户真正问的是什么？

应该怎么查？

找到的证据够不够？

这段答案有没有依据？

如果错了，错在哪？

所以我现在更愿意把 Production RAG 理解成：

> **不是给 LLM 接一个向量数据库，而是在 LLM 前后建立一套可决策、可提前退出、可验证、也可排障的 Pipeline。**

下一篇：

## 《Hybrid Search ≠ FAQ + Doc：从 Dense、BM25 到 Reranker 的 RAG 检索实践》

会把这条 Pipeline 中最核心的 Retrieval 部分拆开，看 Dense、BM25、Fusion 和 Reranker 到底各自解决什么问题。
