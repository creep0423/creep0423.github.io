---
title: 'Chunking 策略：切分决定召回上限'
description: '片段切得太大，语义被稀释；切得太小，上下文断裂。这篇短文对比几种切分策略，并给出一个能直接跑的递归切分实现。'
pubDate: 2026-03-18
tags: ['RAG', 'Chunking', 'Retriever']
category: 'RAG'
series: 'rag-from-zero'
seriesOrder: 3
draft: false
---

Embedding 决定了「怎么比较」，切分决定了「比较的是什么」。这一步做错，后面换再大的模型也救不回来。

## 三种常见策略

| 策略     | 做法                         | 代价                   |
| -------- | ---------------------------- | ---------------------- |
| 固定长度 | 每 N 个 token 切一刀         | 会在句子中间断开       |
| 递归切分 | 按段落 → 句子 → 词依次尝试   | 片段长度不均           |
| 语义切分 | 相邻句子相似度低于阈值时切开 | 需要额外一次 embedding |

对绝大多数项目，**递归切分是性价比最高的起点**：它优先在段落边界切开，只有在段落本身超长时才退回到句子。

## 重叠是免费的召回率

无论用哪种策略，保留 10%–20% 的重叠通常都能明显改善召回。原因很简单：如果一个答案恰好跨在边界上，重叠能让至少一个片段包含完整信息。

代价是索引变大、检索结果可能出现重复片段——去重比漏召回容易得多，这笔交易划算。

> 切分的粒度要和问题的粒度对齐：事实型问题适合小片段，总结型问题适合大片段。

## 一个递归切分实现

```python
def split_recursive(text: str, size: int, overlap: int) -> list[str]:
    """先按段落切，超长段落再按句子切，最后保留重叠。"""
    separators = ['\n\n', '\n', '。', '. ']
    chunks: list[str] = []

    for block in split_by(text, separators, size):
        if len(block) <= size:
            chunks.append(block)
            continue
        chunks.extend(split_by(block, separators[1:], size))

    return add_overlap(chunks, overlap)


def add_overlap(chunks: list[str], overlap: int) -> list[str]:
    """把上一个片段的尾部拼到当前片段前面。"""
    merged = []
    for index, chunk in enumerate(chunks):
        if index == 0 or overlap <= 0:
            merged.append(chunk)
            continue
        merged.append(chunks[index - 1][-overlap:] + chunk)
    return merged
```

参数怎么定：先固定 `size=500`、`overlap=80` 跑一遍评测集，再上下调 25% 对比召回率。**不要在没有任何度量之前凭直觉调参。**

到这里，向量和片段都准备好了。接下来该把它们放进 Vector Database，并在检索时决定召回多少条——这会是本系列的下一篇。
