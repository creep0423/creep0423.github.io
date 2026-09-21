---
title: '“那审批呢？”：多轮 RAG 中 Query Rewrite 与 Multi-Query Retrieval 怎么做'
description: '多轮追问为什么检索不到，Query Rewrite 与 Multi-Query Retrieval 分别在什么条件下才值得启用。'
pubDate: 2026-08-07
tags: ['RAG', 'Query Rewrite', 'Multi-Query', 'Retriever']
category: 'RAG'
series: 'production-rag'
seriesOrder: 3
featured: false
draft: false
---

有一次排查多轮问答的 Bad Case，现象看起来很奇怪。

第一轮用户问：

> “新员工入职流程有哪些步骤？”

回答没什么问题。

第二轮用户接着问：

> “那审批需要多久？”

结果检索出来的内容里，有请假审批、采购审批、报销审批，甚至还有合同审批。

第一反应通常是：Retriever 怎么突然不准了？

但把真正送进向量库的 Query 打出来以后，问题其实很明显：

```text
那审批需要多久？
```

对人来说，这句话一点问题都没有。因为我们还记得上一轮在聊“入职流程”。

但向量数据库不知道。

它看到的只是“审批”和“多久”。

这也是我后来觉得多轮 RAG 最容易被低估的一件事：

> **聊天有上下文，不代表检索也天然有上下文。**

如果 Retrieval 仍然只拿当前这句话做搜索，那么保存再多 Chat History，也只是“记住了聊天”，并没有真正获得多轮检索能力。

---

## 1. 真正需要修的，不一定是 Retriever

把问题单独拿出来看：

```text
那审批需要多久？
```

缺的并不是一个更强的 Embedding Model，而是“审批”到底指什么。

结合上一轮以后，它真正表达的是：

```text
入职流程中的部门审批需要多久？
```

两句话对人来说几乎等价，对 Retriever 来说却完全不是一回事。

前者可能落进整个“审批”语义区域，后者已经把搜索空间收窄到了“入职流程”。

这类问题本质上属于指代和上下文省略：像“那个呢”“费用呢”“还有吗”这样的表达，都必须结合前文才能确定真正的检索对象。直接搜索“那审批需要多久”，就可能召回完全不同业务里的审批内容。

所以在多轮 RAG 里，我会把 Retrieval 前面再加一道处理：

![为什么 Follow-up Query 往往需要 Rewrite](/images/production-rag/03-query-rewrite-01.webp)

> 图 1：为什么 Follow-up Query 往往需要 Rewrite。对人来说容易理解的追问，对 Retriever 来说可能是一个语义不完整的 Query。

问题不是先去“搜得更准”，而是先确保**搜的是正确的问题**。

---

## 2. Rewrite 不是润色 Query

Query Rewrite 这个名字很容易让人误会。

它不是让 LLM 把：

> “那审批呢？”

润色成：

> “请问关于审批流程的相关事项有哪些？”

后者看起来更完整了，其实对检索帮助可能并不大，因为真正缺失的业务对象还是没有补回来。

一个有效的 Rewrite 应该更像：

```text
Raw Query
那审批需要多久？

        ↓

Rewritten Query
入职流程中的部门审批需要多久？
```

它真正做的是把依赖对话上下文的问题，恢复成一个**可以独立检索的 Query**。

我觉得有一个很实用的检查办法：

> 把聊天记录全部删掉以后，这句话还能不能独立理解？

如果答案是“可以”，Rewrite 基本才算完成。

因此这一步的目标不是语言质量，而是检索语义完整性。

---

## 3. 也别见到短问题就 Rewrite

做到这里以后，很容易走向另一个极端：既然 Rewrite 有用，那所有 Query 先改写一次不就行了？

实际用起来，我不太喜欢这种做法。

比如：

> “年假几天？”

只有四个字，但信息其实很完整。

又比如：

> “HR-POLICY-017 第 4.2 条是什么？”

这种问题甚至应该尽量保留原始编号。无意义的 Rewrite 除了增加一次模型调用，还有可能把原本很重要的关键词改掉。

所以是否 Rewrite，最好由前面的 Query Understanding 决定，而不是按字符串长度一刀切。

一种比较自然的流程是：

```text
Query
  ↓
Intent Detection
  ↓
FOLLOW_UP ?
  ├─ No  → 直接使用当前 Query
  └─ Yes → 结合 History Rewrite
```

实际判断时，可以综合短 Query、代词、追问词以及是否存在可用历史。比如“那”“这个”“费用呢”“还有吗”都可以作为信号，但它们只是信号，不应该单独决定结果。相关实现也是在识别为 `FOLLOW_UP` 后设置 `requires_rewrite=True`，再进入后续改写，而不是让所有查询统一经过 LLM。

这里最重要的不是把 Follow-up 分类做到百分之百，而是别把 Rewrite 变成一个默认税。

---

## 4. Rewrite 完了，为什么还要 Query Variants？

假设现在已经得到：

```text
入职流程中的部门审批需要多久？
```

Query 已经完整，可以直接检索了。

但还有一个现实问题：**用户的表达方式，不一定和知识库里的表达方式一致。**

文档标题可能写：

```text
新员工审批流程及时限
入职审核节点说明
新人报到审批处理周期
```

这些内容都可能是正确答案，只是措辞不同。

所以在一些知识型问题上，可以基于改写后的 Query，再生成少量 Query Variants：

```text
Q1：入职流程中的部门审批需要多久？
Q2：新员工入职审批时限
Q3：新人报到审批处理周期
```

这里特别容易把两个概念混在一起。

**Rewrite 是把问题补完整；Variants 是从不同表达角度去搜同一个完整问题。**

顺序应该是：

```text
Raw Query
    ↓
Rewrite
    ↓
Standalone Query
    ↓
Query Variants
```

而不是直接对“那审批呢”生成三种模糊问法。

检索准备链路也是先执行按需 Rewrite，再构建 RetrievalPlan，之后才决定是否生成 Query Variants。

---

## 5. Multi-Query 不是把三个 Query 拼成一个

这一点看起来简单，但实现时很容易偷懒。

假设现在有三个 Query，更合理的做法不是：

```text
Q1 + Q2 + Q3
→ 拼成一大段
→ 搜一次
```

而是：

![多轮 RAG 中的 Query 处理与多路检索链路](/images/production-rag/03-query-rewrite-02.webp)

> 图 2：多轮 RAG 中的 Query 处理与多路检索链路。Rewrite 负责补全问题，Variants 负责扩大表达覆盖，Multi-Query Retrieval 再通过 Merge、去重和 Rerank 收回候选集。

因为每个 Query 的价值就在于提供不同的搜索视角。

比如：

```text
Q1 → doc_A, doc_B, doc_C
Q2 → doc_A, doc_D, doc_E
Q3 → doc_B, doc_F, doc_G
```

`doc_A`、`doc_B` 会重复出现，所以 Multi-Query 后面一定还要有 Merge 和 Deduplicate；而召回范围被主动拉宽以后，也更需要 Reranker 把真正相关的候选重新排到前面。

所以 Multi-Query Retrieval 的思路其实很朴素：

> **先用不同表达扩大候选，再把重复和噪声收回来。**

它追求的不是“搜得更多”，而是减少因为某一种表达方式恰好没有命中文档而造成的漏召回。Query Variants 在检索时会分别参与召回，结果再统一合并、去重和重排。

---

## 6. Variants 多了以后，成本很快就上来了

Multi-Query 有效果以后，还有一个挺容易上头的地方：

三个 Query 有帮助，那六个是不是更好？

通常不是。

原来一次：

```text
1 Query × Top-K 10
```

变成四个 Query 后，就意味着多路 Dense / Sparse Search，后面还有更大的候选集需要 Merge 和 Rerank。

更重要的是，很多 Variant 实际上只是同义词排列：

```text
新员工入职审批流程
新人入职审批流程
新员工的入职审批流程
```

看起来生成了三条，检索结果可能几乎一样。

这种情况下只增加了请求量，没有增加多少新的 Recall。

所以我更倾向于让 Variants 保持少而有差异：规则能覆盖的表达先用规则生成，规则不够时，再让 LLM 补少量变体。相关实现也是规则优先，LLM 只在规则覆盖不足时补充，并在返回前进行去重。

还有一点很重要：不是每种 Intent 都值得启用 Multi-Query。

![Rewrite 与 Query Variants 的启用边界](/images/production-rag/03-query-rewrite-03.webp)

> 图 3：Rewrite 与 Query Variants 的启用边界。不是所有 Query 都值得改写或扩写，是否启用应取决于上下文依赖程度、召回收益和额外成本。

明确的 FAQ、精确编号类查询，本来就追求快速、稳定，没有必要主动扩大搜索空间；Knowledge Query 和 Follow-up 更容易从 Variants 中获益。因此是否使用 Query Variants，最好交给 RetrievalPlan，而不是默认全局开启。

---

## 7. Rewrite 比 Retrieval 更麻烦的地方：它会“合理地改错”

Retrieval 没搜到，通常比较容易发现。

Rewrite 改错反而更危险。

比如前面对话同时出现了“合同审批”和“付款审批”，用户接着问：

> “那个一般要多久？”

如果 Rewrite 得到：

```text
合同审批一般需要多久？
```

但用户实际问的是付款审批，那么后面的系统可能表现得非常正常。

Embedding 正常。

Hybrid Search 正常。

Reranker 也正常。

甚至最后引用都是真的。

只是回答了另一个问题。

这种错误很难靠最后一层 LLM 自己救回来。

所以我觉得 Rewrite 最重要的边界是：

> **只恢复历史里已经存在的信息，不替用户创造新的语义。**

如果上下文本身存在明显歧义，与其自信地猜一个，不如保守一些。

同时，Trace 最好至少保留：

```text
raw_query
rewritten_query
intent
query_variants
retrieved_sources
```

这样碰到多轮 Bad Case 时，不需要先怀疑 Milvus、Embedding 或 Prompt。把这几项放在一起看，经常几分钟就能发现问题其实发生在 Retrieval 之前。

---

## 8. History 不是塞得越多越安全

Rewrite 依赖 History，但我也不建议把几十轮聊天全部塞进去。

一段对话越长，前面遗留下来的主题越多。

本来只是想解决当前一句“那个呢”，结果 Rewrite Model 需要从一大堆旧内容里猜到底指哪个“那个”。

这和 RAG 的 Context 很像：**更多不等于更相关。**

因此一种很实用的做法，是只提供最近的一小段对话，例如最近 8 条消息，然后围绕当前 Query 做改写。对应的 Rewrite 流程也是截取最近历史，再交给模型生成独立 Query。

如果未来对话特别长，再考虑 Conversation Summary、Topic Tracking 之类的东西。

但我不会一开始就把系统做得这么重。

能用一个受控的历史窗口解决的问题，没必要先引入另一套复杂状态管理。

---

## 写在最后

多轮 RAG 一开始很容易被理解成：

```text
Chat History + RAG
```

后来我更愿意把它看成：

```text
Conversational Query
        ↓
理解它依赖什么上下文
        ↓
恢复成完整 Query
        ↓
必要时生成少量检索变体
        ↓
多路召回
        ↓
Merge / Deduplicate / Rerank
        ↓
Final Evidence
```

这里每一步解决的问题都不一样。

Rewrite 解决的是**问题本身不完整**。

Query Variants 解决的是**一种表达可能覆盖不够**。

Multi-Query Retrieval 负责把召回面适度放宽。

Reranker 再把扩大后的候选集收回来。

最后真正需要控制的，不是“能生成多少个 Query”，而是每多一次 Rewrite、每多一个 Variant，究竟有没有给最终 Recall 带来实际收益。

毕竟 Production RAG 里，一个挺重要的经验就是：

> **能把链路做复杂并不难，难的是知道什么时候值得复杂。**

下一篇：

## 《RAG 检索为什么不能“一把梭”？基于 Intent 的动态 RetrievalPlan 设计》

会继续往下拆一个问题：

**既然不同 Query 的风险和目标都不一样，为什么还要让所有问题共享同一套 Top-K、Threshold 和 Rerank 策略？**
