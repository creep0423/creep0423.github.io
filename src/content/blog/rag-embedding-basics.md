---
title: 'Embedding 基础：把文本变成向量'
description: 'Embedding 决定了「什么算相似」，也决定了整个检索系统的上限。这篇短文讲清楚它到底在做什么，以及几个容易踩坑的细节。'
pubDate: 2026-03-09
tags: ['RAG', 'Embedding', 'Vector DB']
category: 'RAG'
series: 'rag-from-zero'
seriesOrder: 2
draft: false
---

系列的第一篇把 RAG 拆成了六个环节。从这篇开始逐个展开，先看最底层的一环：Embedding。

## 它解决的是什么问题

传统检索靠关键词匹配。搜「怎么让模型少胡说」，它永远找不到那篇标题是「缓解幻觉的三种做法」的文章——**两段文字说的是同一件事，但没有一个字相同。**

Embedding 的做法是把文本映射到高维空间里的一个点，让语义相近的文本在空间里也靠得近：

$$
\mathrm{similarity}(a, b) = \cos(\mathbf{e}_a, \mathbf{e}_b)
$$

这样一来，检索就从「字符串匹配」变成了「最近邻搜索」，而最近邻搜索是有成熟索引结构的。

## 三个容易踩的坑

1. **换模型必须重建索引。** 不同模型产生的向量空间互不兼容，混用只会得到随机结果，所以模型名一定要写进 metadata。
2. **归一化之后，余弦相似度和点积等价。** 提前归一化能省掉一次除法，向量库里的距离度量也要和这一步保持一致。
3. **长文本会稀释语义。** 一段 2000 字的文字压成一个向量，细节基本丢失，所以才有下一篇要讲的切分。

> Embedding 的质量决定检索的上限，后面的 LLM 再强也补不回来。

## 一段最小示例

```python
import numpy as np


def embed(text: str, model) -> np.ndarray:
    """返回归一化后的向量，长度固定。"""
    vector = model.encode(text)
    return vector / np.linalg.norm(vector)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    # 两边都已归一化，点积就是余弦相似度
    return float(np.dot(a, b))


query = embed('怎么减少模型的幻觉？', model)
document = embed('缓解幻觉的三种做法', model)

print(cosine_similarity(query, document))  # 明显高于无关文本
```

判断 Embedding 模型是否够用，不要靠感觉：准备 20 组「问题 → 正确片段」，直接看正确片段有没有被检索进 top-k。这个评测集在第三篇里还会用到。
