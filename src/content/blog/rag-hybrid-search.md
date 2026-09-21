---
title: 'Hybrid Search ≠ FAQ + Doc：从 Dense、BM25 到 Reranker 的 RAG 检索实践'
description: 'Dense 与 BM25 各自解决什么问题，为什么 Hybrid Search 不是 FAQ + Doc，以及 Reranker 该放在链路哪一层。'
pubDate: 2026-07-21
tags: ['RAG', 'Retriever', 'Hybrid Search', 'Reranker', 'BM25']
category: 'RAG'
series: 'production-rag'
seriesOrder: 2
featured: true
draft: false
---

有一种 RAG 失败，比“完全搜不到”更让人难受。

系统明明返回了一堆结果，而且每一条看起来都挺相关，但真正需要的那条资料，就是排不上来。

比如用户问：

> “错误码 E1024 怎么处理？”

结果前几名都是“系统异常处理指南”“常见故障排查流程”，真正标题里就写着 **E1024** 的文档反而靠后。

第一次遇到这种情况，很容易怀疑 Embedding 模型是不是不够好。

但很多时候，问题并不在模型，而在检索方式：

> **我们拿“语义相似度”，去解决了一个本质上依赖“精确词项匹配”的问题。**

Dense Search 很擅长理解“意思像不像”。

用户说“入职”，文档写“报到”；用户说“准备材料”，文档写“提交资料”，它仍然有机会找到正确内容。

但下面这些内容就不太一样：

```text
HR-POLICY-017
API v3.2
错误码 E1024
HS 编码 8471.30
```

这些字符串本身就是信息。

这时候，“关键词到底有没有出现”，往往比“整段话语义是否相近”更重要。

反过来也一样。如果系统只靠 BM25，用户问：

> “怎么修改密码？”

而知识库写的是：

> “忘记密码怎么办？”

关键词并不完全重合，纯关键词检索也可能错过一个语义上明显相关的答案。

所以与其让 Dense 和 BM25 二选一，不如让它们各做自己擅长的事。

这也是 Hybrid Search 最直接的出发点。

---

## 1. 先把一个概念说清：Hybrid Search ≠ FAQ + Doc

聊 RAG 检索时，经常会同时看到：

```text
FAQ Retrieval
Document Retrieval
Hybrid Search
```

它们很容易被混在一起，但其实不是一个层次的问题。

**FAQ / Doc 解决的是“去哪里查”。**

**Hybrid Search 解决的是“进去以后怎么查”。**

可以把它理解成：

![FAQ / Doc 与 Hybrid Search 的层次关系](/images/production-rag/02-hybrid-search-01.webp)

> 图 1：FAQ / Doc 与 Hybrid Search 的层次关系。前者决定搜索范围，后者决定在选定 Collection 内如何召回。

Milvus Hybrid Search 指的是在**单个 Collection 内**同时执行 Dense 向量召回和 BM25 Sparse 关键词召回，再对两路结果做融合排序；FAQ / Doc 分层则是业务侧决定检索哪个知识集合。

所以更容易记的一句话是：

> **FAQ / Doc 决定搜索范围，Hybrid Search 决定范围内怎么召回。**

这个边界如果没分清，后面很容易把“业务检索策略”和“底层召回方式”揉成一团。

---

## 2. Dense 和 BM25，本来就在解决两类问题

Dense Search 的优势是语义泛化。

比如：

> “新员工入职需要准备什么？”

知识库里写：

> “员工报到时应提交身份证明……”

字面不一样，但 Embedding 可以通过语义关系把它们联系起来。

它的问题也很明显：

> **Dense 擅长判断“意思像不像”，却不一定最擅长判断“某个关键术语有没有真的出现”。**

BM25 则正好补这一块。

它基于词项匹配，对编号、专有名词、版本号、错误码这类内容特别有价值。与此同时，它本身又不擅长理解同义表达。Dense 和 Sparse 的能力边界正好形成互补。

我更喜欢把它们理解成两个问题：

```text
Dense：
“这段内容和用户的问题，意思接近吗？”

BM25：
“用户真正关心的词，到底有没有命中？”
```

Hybrid Search 并不神秘。

它只是承认：

> **语义相关性和词项相关性，本来就是两种不同的检索信号。**

---

## 3. Dense + BM25 在 Milvus 里怎么配合？

一种常见实现是：

```text
BGE-M3 Dense Embedding
        +
Milvus BM25BuiltInFunction
        ↓
Hybrid Search
```

Dense 路径大致是：

```text
Query
  ↓
Embedding Model
  ↓
Dense Vector
  ↓
Vector Search
```

BM25 路径则是：

```text
Raw Query
  ↓
BM25 Analyzer
  ↓
Sparse Representation
  ↓
Sparse Search
```

最后两路一起进入 Hybrid Search。

如果只抽象底层逻辑，可以用下面这段**伪代码**理解：

```python
dense_query = embedding.embed_query(query)
sparse_query = query

requests = [
    AnnSearchRequest("dense", dense_query),
    AnnSearchRequest("sparse", sparse_query),
]

milvus.hybrid_search(requests, ranker)
```

Dense 字段由 Embedding 模型生成 Query Vector，而 BM25 路径可以直接接收原始 Query，由 Milvus 生成 Sparse Query Representation，再统一做融合排序。

实际工程里还有一个挺实用的点：Embedding 不一定要在业务代码中显式调用。

把带缓存能力的 Embedding 实现交给 VectorStore 后，可以在真正检索 Dense 字段时再触发 `embed_query()`；已经缓存过的 Query Vector 还能直接复用。

这样上层只关心“我要检索”，Embedding 和缓存仍然留在 Retrieval 层。

---

## 4. 为什么 BM25 也放在 Milvus 里？

Python 自己跑一套 BM25 并不难。

真正麻烦的是上线以后：

```text
中文分词
数据新增和删除
版本切换
Metadata Filter
Dense / Sparse 结果合并
两套索引的数据一致性
```

如果 Dense 和 BM25 分别维护在不同系统里，很快就会变成：

```text
Milvus Dense ──────┐
                   ├→ Merge / Dedup
External BM25 ─────┘
```

两套路由也意味着两套生命周期。

使用 Milvus 的 `BM25BuiltInFunction`，文本、Dense、Sparse 和 Metadata 可以放在同一个 Collection 中管理，Sparse Representation 的生成也由 Milvus 负责。

中文场景还要注意 Analyzer，例如：

```python
analyzer_params={"type": "chinese"}
```

否则拿英文空格分词的思路处理中文，BM25 从最底层就可能已经跑偏。

所以真正省下来的，不只是几行 BM25 代码，而是少维护了一套独立检索基础设施。

---

## 5. 两路结果怎么融合？

Dense 和 BM25 都返回结果以后，还需要决定：

> **到底更相信哪一路？**

一种方式是 WeightedRanker。

例如希望 Dense 稍微占优，可以使用类似：

```python
WeightedRanker(0.55, 0.45)
```

直觉上可以理解为：

```text
final_score
≈
0.55 × normalized_dense_score
+
0.45 × normalized_sparse_score
```

重点在于，这里是在融合**归一化后的不同检索信号**，而不是简单把两种原始分数直接相加。WeightedRanker 的价值，是可以明确表达 Dense 和 Sparse 的相对偏好。

另一种常见方法是 RRF（Reciprocal Rank Fusion）。

它弱化原始 Score，更关注某条结果在各自检索列表中的排名，因此当不同 Retriever 的分数尺度不太容易直接比较时，通常更稳妥。

但不管用哪一种，都有一个前提：

> **权重不能靠感觉定。**

`0.55 / 0.45` 可以是实验起点，但最终还是要通过 Recall@K、MRR、关键词覆盖率和延迟等指标验证，而不是因为“看起来效果不错”就写死。

---

## 6. 已经 Hybrid Search 了，为什么还要 Reranker？

这是很容易被问到的问题。

Dense 和 BM25 都融合完了，为什么还要再跑 CrossEncoder？

因为它们的目标不同。

Hybrid Search 要解决的是：

> **从很大的知识库里，快速找出一批可能相关的候选。**

Reranker 要解决的是：

> **候选已经不多了，到底哪几条最值得放进 Context？**

Dense Retriever 一般采用 Bi-Encoder 思路，Query 和 Document 分别编码，文档向量可以提前计算，因此非常适合大规模召回。

CrossEncoder 则把 `(query, document)` 成对输入模型，相关性判断更细，但每条候选都需要单独推理。

因此合理的链路是：

![Dense + BM25 + Reranker 的两阶段检索链路](/images/production-rag/02-hybrid-search-02.webp)

> 图 2：Dense + BM25 + Reranker 的两阶段检索链路。Recall 阶段尽量找全候选，Rerank 阶段再把真正相关的证据排到前面。

而不是拿 CrossEncoder 直接扫整个知识库。

Reranker 负责小候选集精排，本身并不能替代向量数据库的全库召回。

我觉得这里最容易记住的一句话是：

> **召回阶段宁愿多抓几个“嫌疑人”，精排阶段再认真审一遍。**

还有一个名字上的坑：

```text
WeightedRanker / RRFRanker
→ 融合 Dense 和 BM25

CrossEncoder Reranker
→ 对融合后的候选重新排序
```

虽然都叫 Ranker，但不是一个阶段。

---

## 7. Production Retrieval 还要先守住数据边界

真正做企业知识库时，相关性不是唯一条件。

还有一个更优先的问题：

> **这条数据当前用户到底能不能搜到？**

所以 Retrieval 往往还会带：

```text
source
kb_version
tenant
dataset
visibility
role
```

这类 Scalar Filter。

更合理的方式也不是把整个知识库搜完以后，再让 Python 删除不允许返回的数据，而是把这些条件转换成 Milvus `expr`，直接下推到检索阶段，让 Dense 和 Sparse 都只在合法的数据范围里搜索。

![Production Retrieval 中的 Filter Pushdown](/images/production-rag/02-hybrid-search-03.webp)

> 图 3：Production Retrieval 中的 Filter Pushdown。过滤条件直接约束检索空间，而不是全库召回后再在应用层删除结果。

换句话说：

> **先保证搜的是正确的数据，再讨论哪个结果最相关。**

这件事不像 Hybrid Search 那么“算法味”，但往往更接近 Production Retrieval 真正需要解决的问题。

---

## 8. 检索器也不是越多越好

既然 BGE-M3 本身也可以输出 Sparse Representation，是不是应该继续堆：

```text
Dense
+
BM25
+
BGE-M3 Sparse
```

理论上当然可以。

但每增加一路 Retriever，都会连带增加 Schema、Query Encoding、融合策略、权重、延迟和评测成本。

所以我更认可的做法是：

> **先把简单方案做扎实，再让评测决定是否值得增加复杂度。**

如果新的 Sparse Retriever 能稳定提升 Recall@K、MRR 或业务命中率，再把它作为独立方案引入；如果收益并不明显，就没必要为了技术栈更丰富，把线上链路继续做复杂。相关讲义同样把 BGE-M3 Sparse 放在需要独立评测验证的扩展路径，而不是默认叠加。

一句话：

> **复杂度应该由收益来买单。**

---

## 写在最后

RAG 的 Retrieval 很容易从一句：

```python
vector_store.similarity_search(query, k=5)
```

开始。

这没什么问题。

但当知识库里出现同义表达、制度编号、错误码、专业术语以及权限边界以后，单一 Vector Search 往往就不够用了。

更完整的链路会变成：

```text
Dense Semantic Recall
        +
BM25 Keyword Recall
        ↓
Hybrid Fusion
        ↓
CrossEncoder Rerank
        ↓
Final Evidence
```

Dense 负责语义覆盖，BM25 补精确词项，Fusion 负责把两种信号合起来，CrossEncoder 再对候选做精排。

至于权重、Top-K，甚至要不要再增加新的 Retriever，最后都应该由评测结果决定，而不是凭感觉。

下一篇：

## 《“那审批呢？”：多轮 RAG 中 Query Rewrite 与 Multi-Query Retrieval 怎么做》

因为还有一类检索问题，Dense 和 BM25 都解决不了：

> **用户给你的 Query，本身就不是一个完整的问题。**
