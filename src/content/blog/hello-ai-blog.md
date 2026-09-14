---
title: 'Hello, AI Tech Blog'
description: '为什么开一个技术博客，这里会写什么，以及这个网站本身是怎么搭起来的。'
pubDate: 2026-01-12
tags: ['Meta', 'Astro', 'Writing']
category: 'Meta'
featured: true
draft: false
---

这是这个博客的第一篇文章。

## 为什么要写

学习大模型的过程中，我经常遇到同一种情况：一个概念看懂了，但真正把它写进代码、跑出结果时，才发现还有一堆没想清楚的地方。**看懂和做出来之间，隔着一整个工程的距离。**

写作是把这段距离补上的方式。为了讲清楚一件事，你必须先弄清楚每个环节为什么存在——这比再读一遍教程有用得多。

> 如果你不能简单地解释一件事，说明你还没有真正理解它。
>
> —— 常被归给费曼的说法，但确实有道理

所以这个博客的目标很具体：

- 记录实现过程，而不是复述文档
- 优先写那些“第一次做时会踩坑”的部分
- 给出可以运行的代码，而不是伪代码片段

## 会写什么

目前关注的方向：

1. **Large Language Models** — 模型行为、推理成本与参数取舍
2. **Retrieval-Augmented Generation** — 切分策略、向量检索与召回质量
3. **AI Agents** — 工具调用、任务规划与多步执行的可靠性
4. **Deep Learning** — Transformer 内部机制与 PyTorch 实验

## 这个网站是怎么搭的

站点本身也是一个可以拿出来讲的工程：静态生成、零后端、尽量少的客户端 JavaScript。

```text
Markdown 文章
      │
      ▼
Astro Content Collections   ──→  类型安全的 frontmatter 校验
      │
      ▼
静态构建（Astro + Tailwind）
      │
      ▼
GitHub Actions  ──→  GitHub Pages
```

几个刻意的选择：

- **没有数据库、没有后端、没有登录。** 静态站点能解决的问题，不该用服务器解决。
- **只在真正需要交互的地方加载 JavaScript**，比如主题切换和文章搜索。
- **SEO 是构建产物的一部分**，不是上线后再补的：`sitemap`、RSS、canonical 和 Open Graph 都由构建生成。

## 接下来

已经写好的两篇可以从[文章列表](/blog/)进入：一篇讲 Self-Attention 到底在算什么，另一篇从零串起一条 RAG 流程。

如果某篇文章对你有帮助，或者发现了错误，欢迎在 [GitHub](https://github.com/yourname) 上告诉我。
