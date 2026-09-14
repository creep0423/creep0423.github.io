---
title: '从零理解 Transformer：Self-Attention 到底在做什么？'
description: '从 Query / Key / Value 的直觉出发推导 Scaled Dot-Product Attention，并说明为什么要除以 sqrt(d_k)，最后用一段最小的 PyTorch 代码把它跑起来。'
pubDate: 2026-02-08
updatedDate: 2026-02-20
tags: ['Transformer', 'Attention', 'PyTorch', 'Deep Learning']
category: 'Deep Learning'
series: 'transformer-from-zero'
seriesOrder: 1
featured: true
draft: false
---

很多关于 Attention 的解释停在「Q 和 K 做点积，softmax 一下，再乘 V」。这篇笔记想补上的是三个具体问题：**为什么用点积衡量相似度、为什么要除以 $\sqrt{d_k}$、以及 V 究竟在做什么。**

## 背景：序列建模的老问题

在 Transformer 之前，序列建模主要依赖 RNN / LSTM，它们有两个绕不开的限制：

- **串行计算**：第 $t$ 步必须等第 $t-1$ 步算完，无法沿时间维度并行
- **长距离衰减**：位置 1 的信息要经过上百次传递才能影响位置 100

卷积可以用并行换感受野，但感受野依然是局部的，堆叠层数决定了能看到多远。

> Attention 的思路不是把信息一步步传下去，而是让每个位置**直接**去所有位置取它需要的东西。

代价是计算量随序列长度近似平方增长，换来的是完全并行，以及任意两个位置之间恒定为 1 的路径长度。

## Query、Key、Value 的直觉

一套好用的类比是信息检索：

- **Query**：我现在想找什么
- **Key**：每条信息被检索时挂的标签
- **Value**：真正被取走的内容

注意 Key 和 Value 是同一份信息的两副面孔：Key 用来**匹配**，Value 用来**取用**。这正是它比「对所有位置做加权平均」更灵活的原因——权重由相关性决定，而不是由距离决定。

### 它们从哪里来

三个矩阵都来自同一个输入 $X$，只是经过不同的线性投影：

$$
Q = XW_Q, \qquad K = XW_K, \qquad V = XW_V
$$

其中 $X \in \mathbb{R}^{n \times d_{\text{model}}}$，$W_Q, W_K \in \mathbb{R}^{d_{\text{model}} \times d_k}$，$W_V \in \mathbb{R}^{d_{\text{model}} \times d_v}$。投影让模型可以学到「拿什么去匹配」和「拿什么去输出」是两件不同的事。

## Scaled Dot-Product Attention

完整公式只有一行：

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

拆成四步看：

1. $QK^\top$ 得到 $n \times n$ 的相似度矩阵，第 $(i, j)$ 项是位置 $i$ 对位置 $j$ 的关注程度
2. 除以 $\sqrt{d_k}$ 把数值缩放到 softmax 舒适的区间
3. 按行做 softmax，得到每行和为 1 的注意力权重
4. 用权重对 $V$ 加权求和，输出是 Value 的凸组合

### 为什么必须除以 sqrt(d_k)

假设 $q$ 和 $k$ 的每个分量独立、均值为 0、方差为 1，那么点积

$$
q \cdot k = \sum_{i=1}^{d_k} q_i k_i
$$

的方差就是 $d_k$，标准差为 $\sqrt{d_k}$。当 $d_k = 64$ 时，点积的典型幅度约为 8，取到 ±20 也很正常。

问题出在 softmax 上：输入差距越大，输出越接近 one-hot，反向传播时梯度就越接近 0。除以 $\sqrt{d_k}$ 把点积重新拉回方差为 1 的尺度，让训练早期也能有稳定的梯度。

> 这是一个很小的改动，但它决定了深层 Transformer 能否训得动。

## 一个最小的 PyTorch 实现

不用 `nn.MultiheadAttention`，先手写一遍：

```python
import math

import torch
import torch.nn.functional as F


def scaled_dot_product_attention(query, key, value, mask=None):
    """输入形状 (batch, heads, seq, dim)，输出同形状。"""
    d_k = query.size(-1)

    # 1. 相似度：每个 query 与所有 key 做点积，并缩放
    scores = query @ key.transpose(-2, -1) / math.sqrt(d_k)

    # 2. 屏蔽 padding 或未来位置
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))

    # 3. 按行归一化，得到注意力权重
    weights = F.softmax(scores, dim=-1)

    # 4. 用权重对 value 加权求和
    return weights @ value, weights
```

用随机张量确认形状和归一化：

```python
batch, heads, seq_len, dim = 2, 4, 6, 16
q = torch.randn(batch, heads, seq_len, dim)
k = torch.randn(batch, heads, seq_len, dim)
v = torch.randn(batch, heads, seq_len, dim)

out, weights = scaled_dot_product_attention(q, k, v)

print(out.shape)              # torch.Size([2, 4, 6, 16])
print(weights.shape)          # torch.Size([2, 4, 6, 6])
print(weights.sum(-1)[0, 0])  # tensor([1., 1., 1., 1., 1., 1.])
```

再加一个因果 mask，就得到 decoder 里用的版本：

```python
causal_mask = torch.tril(torch.ones(seq_len, seq_len)).bool()
out, weights = scaled_dot_product_attention(q, k, v, mask=causal_mask)

# 每个位置只能看到自己和左边
assert weights[0, 0].triu(1).count_nonzero() == 0
```

一个容易踩的坑：如果某一行的 mask 全是 0（比如 padding 长度等于序列长度），softmax 的输入全是 $-\infty$，输出会是 `NaN`。生产实现里要保证每个 query 至少有一个可见位置，或在 softmax 前把整行掩码替换为 0。

## 小结

- Attention 的本质是**按相关性加权求和**，相关性用缩放后的点积衡量
- 除以 $\sqrt{d_k}$ 是为了控制 softmax 的输入尺度，避免梯度消失
- 多头注意力只是把上面这套计算并行地做 $h$ 次，再拼接投影回 $d_{\text{model}}$
- 掩码决定了「能看到什么」，编码器看全序列，解码器只能看左侧

下一步可以继续看 [从零理解 RAG：从 Embedding 到 Vector Database](/blog/rag-from-scratch/)，那里的向量检索用的其实是同一套「用点积衡量相似度」的思想。
