---
title: '从零理解 RAG：从 Embedding 到 Vector Database'
description: '把 RAG 拆成 Document、Chunking、Embedding、Vector Database、Retriever、LLM 六个环节，说明每一环的取舍，并给出可直接运行的 Python 伪代码。'
pubDate: 2026-03-02
tags: ['RAG', 'Embedding', 'Vector DB', 'LLM', 'Python']
category: 'RAG'
series: 'rag-from-zero'
seriesOrder: 1
featured: true
draft: false
---

RAG 常被描述成「把文档塞进向量库，然后搜出来给模型」。这句话没错，但真正决定效果的是中间那些看起来不起眼的细节：**文档怎么切、向量怎么存、召回几条、以及什么时候该放弃检索。**

这篇笔记按数据流的顺序把它们串一遍。

## 整条 Pipeline

```text
Document
   ↓  加载与清洗（PDF / HTML / Markdown → 纯文本 + metadata）
Chunking
   ↓  切成 200–800 token 的片段，保留重叠
Embedding
   ↓  每段映射成一个稠密向量
Vector Database
   ↓  存向量 + 原文 + metadata，建立近似最近邻索引
Retriever
   ↓  用 query 向量召回 top-k 片段
LLM
   ↓  片段 + 问题 → 带引用的回答
```

每一环的错误都会一路传到最后一环，所以顺序很重要：**先把切分和召回做对，再考虑换更大的模型。**

## Document：加载与清洗

朴素地读一个 PDF，往往会得到一堆断行、页眉页脚和连字符。这些都必须在切分之前处理掉，否则它们会被当作「语义内容」进入向量空间。

这一步的产出应该包括：

- 干净的正文文本
- 稳定的 `source` 标识（文件路径或 URL）
- 有用的 metadata：标题、章节、页码、更新时间

metadata 不是装饰，它后面会同时用于过滤检索范围和生成引用。

## Chunking：切分策略

常见做法和各自的代价：

| 策略     | 做法                                  | 优点               | 缺点                   |
| -------- | ------------------------------------- | ------------------ | ---------------------- |
| 固定长度 | 每 N 个 token 切一刀                  | 实现简单、长度可控 | 会在句子中间断开       |
| 递归切分 | 按段落 → 句子 → 词依次尝试            | 尽量保住语义边界   | 片段长度不均           |
| 语义切分 | 相邻句子 embedding 相似度低于阈值时切 | 片段语义完整       | 需要额外一次 embedding |

无论用哪种，**保留 10%–20% 的重叠**通常都能明显改善召回：一个答案恰好跨在边界上时，重叠能让至少一个片段包含完整信息。

## Embedding：把文本变成向量

Embedding 模型决定了「什么算相似」。选型时值得关注：

1. **维度**：维度越高表达力越强，但存储和检索成本也越高
2. **语言**：中文场景要确认模型是多语言的，而不是仅英文
3. **归一化**：归一化之后，余弦相似度等价于点积，可以省掉一次计算
4. **对称性**：检索场景里 query 和 document 长度分布不同，是否需要不同的编码方式

一个容易忽略的点：**换 embedding 模型必须重建整个索引。** 新旧的向量空间无法比较，混用只会得到随机结果。所以模型名一定要作为 metadata 存进索引。

## Vector Database：存储与索引

向量库要解决的是：在几百万条向量里，用可接受的精度损失换取毫秒级检索。

- **精确搜索**（flat）：遍历全部向量，结果最准，但规模上不去
- **近似搜索**（HNSW / IVF）：用图或聚类结构把候选集缩小，速度提升几个数量级

选型时除了索引算法，还要看：

- 是否支持 metadata 过滤（例如「只在 2025 年之后的文档里搜」）
- 过滤和向量检索是**先过滤再检索**还是**检索后再过滤**，前者通常更可靠
- 是否需要持久化、多租户、以及增量更新

## Retriever：召回

Retriever 的职责是把问题变成检索请求，并决定给模型多少上下文。

```python
def retrieve(query: str, k: int = 5, min_score: float = 0.3) -> list[Chunk]:
    query_vector = embed(query, normalize=True)
    hits = index.search(query_vector, top_k=k)

    # 弱相关的结果比没有结果更糟：模型会一本正经地基于噪音回答
    return [hit for hit in hits if hit.score >= min_score]
```

三个经验：

- **k 不是越大越好。** 上下文越长，模型越容易忽略中间部分，还会冲淡真正有用的片段
- **设一个相似度下限。** 全部低于阈值时应该回答「我没有相关资料」，而不是硬答
- **混合检索通常更强。** 向量检索擅长语义，BM25 擅长关键词与专有名词，两者加权融合往往优于任一单独方案

## LLM：生成

最后一步是把片段和问题一起交给模型。Prompt 里至少要明确三件事：

1. 只根据给定资料回答
2. 每条结论要标注来源编号
3. 资料不足时直接说明，不要编造

> RAG 的价值不只在于「让模型知道更多」，更在于**让回答可以被核对**。有引用，才有验证的入口。

## 最小可运行版本

把上面的环节连起来，一个能跑通的 RAG 大约长这样：

```python
from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    source: str
    page: int | None = None


def ingest(paths: list[str]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for path in paths:
        text = load_document(path)              # 1. Document
        for piece in split(text, size=500, overlap=80):   # 2. Chunking
            chunks.append(Chunk(text=piece, source=path))
    return chunks


def build_index(chunks: list[Chunk]):
    vectors = [embed(chunk.text, normalize=True) for chunk in chunks]   # 3. Embedding
    index = VectorIndex(dim=len(vectors[0]))                            # 4. Vector DB
    index.add(vectors, payloads=chunks)
    return index


def answer(question: str, index, k: int = 5) -> str:
    hits = retrieve(question, index, k=k)      # 5. Retriever
    if not hits:
        return '资料库里没有找到相关内容。'

    context = '\n\n'.join(
        f'[{i + 1}] {hit.text}\n(来源: {hit.source})' for i, hit in enumerate(hits)
    )
    prompt = (
        '仅根据下面的资料回答问题，并用 [编号] 标注来源。'
        '如果资料不足以回答，请直接说明。\n\n'
        f'资料：\n{context}\n\n问题：{question}'
    )
    return llm(prompt)                          # 6. LLM


if __name__ == '__main__':
    index = build_index(ingest(['docs/transformers.pdf']))
    print(answer('self-attention 的时间复杂度是多少？', index))
```

## 评估：怎么知道有没有变好

改任何一环之前，先准备一个小的评测集：20–50 个「问题 → 期望出处」的配对，然后分别看两个指标：

- **召回率**：正确的片段有没有被检索出来（检索环节的问题）
- **答案质量**：检索正确时，模型有没有正确使用（生成环节的问题）

两者分开度量，才能知道该去调 retriever 还是改 prompt。这是我在做 [Mini RAG System](/projects/) 时踩过的最大的一个坑——只盯着最终回答，永远不知道问题出在哪一层。
