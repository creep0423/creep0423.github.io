---
title: '检索到了，不代表应该回答：Production RAG 的证据、引用与置信度设计'
description: 'Retrieved ≠ Relevant ≠ Sufficient：生成前如何判断证据是否足够，引用核验与两阶段置信度又该怎么设计。'
pubDate: 2026-08-28
tags: ['RAG', 'Citation', 'Confidence', 'LLM']
category: 'RAG'
series: 'production-rag'
seriesOrder: 5
featured: true
draft: false
---

RAG 做到后面，我越来越警惕一句话：

> “已经搜到相关文档了，可以让模型回答了。”

因为“搜到了”和“足够回答”，其实差得挺远。

比如用户问：

> “员工异地出差时，住宿标准、交通费用和审批要求分别是什么？”

Retriever 确实返回了 5 个 Chunk。

其中一个讲住宿，一个提到了交通，另外三个只是泛泛说“按照差旅制度执行”。

技术上看：

```text
retrieval_results != []
```

但如果这时候直接把 Context 塞给 LLM，它很可能把几段零散信息拼成一个看起来非常完整的答案。

问题是，那份“完整”可能只是语言上的完整。

证据并不完整。

这类回答最麻烦的地方，不是它胡说八道，而是它往往**七八成是对的，剩下两三成却找不到依据**。

所以我后来更愿意把 RAG 的生成阶段往后推一步。

在 Retrieval 和 Generation 之间，再加一道问题：

> **现在手里的证据，真的够回答吗？**

---

## 1. Retrieved ≠ Relevant ≠ Sufficient

检索链路里有三个很容易被混在一起的概念：

```text
Retrieved
   ≠
Relevant
   ≠
Sufficient
```

`Retrieved` 只代表搜索引擎把它找出来了。

`Relevant` 代表它和当前问题确实有关。

`Sufficient` 则更进一步：

> **这些内容放在一起，已经足以支撑用户真正问的那件事。**

举个简单例子。

用户问：

> “员工请病假需要哪些材料，最多可以请几天？”

结果召回了：

```text
Chunk A：病假需要提交医院证明
Chunk B：请假需要主管审批
Chunk C：员工考勤管理办法
```

这些内容都不算离题。

但“最多可以请几天”这个问题根本没有证据。

如果只判断“是否有相关文档”，很容易放行。

如果判断的是“证据是否足够覆盖问题”，结果就不一样了。

这也是为什么生成前最好有一个真正的 **Evidence Gate**。

![Retrieved、Relevant 与 Sufficient 是三个不同层次](/images/production-rag/05-evidence-confidence-01.png)

> 图 1：Retrieved、Relevant 与 Sufficient 是三个不同层次。检索到相关资料只是开始，进入生成前还需要判断证据是否足以覆盖用户真正的问题。

---

## 2. 信息不足时，最好的答案可能就是“不回答”

这件事说起来简单，实际做的时候反而很容易舍不得。

毕竟 RAG 系统辛辛苦苦完成了：

```text
Embedding
→ Retrieval
→ Rerank
→ Context Selection
```

最后却返回：

> “当前信息不足，无法确认。”

第一感觉多少会有点像“白搜了”。

但换个角度，这恰恰是系统知道自己边界的表现。

如果经过相关性过滤和 Context Selection 后，没有留下足够可靠的上下文，就应该在进入 LLM 前直接收口，而不是再给模型一次“自由发挥”的机会。讲义里的实现也是把这种情况作为明确的 `insufficient_context` 分支，直接返回确定性提示，用来避免无可靠资料时继续生成。

我现在更认同一个原则：

> **不会答，比没依据地答更重要。**

尤其是在制度、合同、合规、财务、工程规范这类场景里，所谓“尽量回答”往往并不是优点。

---

## 3. Evidence Check 应该看什么？

证据判断并不一定需要一开始就做得特别复杂。

至少可以先看几类信号：

```text
Top Retrieval Score
Context Count
Source Type
Intent Confidence
是否经历 Query Rewrite
是否命中明确 FAQ
```

这些信号本质上回答的是：

> 当前答案的“地基”稳不稳？

比如 FAQ 精确命中和模糊的多段文档召回，显然不应该拥有相同的证据可信度。

同样，一条经过历史 Query Rewrite 才得到的答案，也应该比原始问题完全明确的请求更谨慎一些。

一种比较实用的做法，是先得到一个 `evidence_confidence`。

它不是模型意义上的概率，而更像一套工程上的风险分层：

```text
strong
medium
weak
insufficient
```

如果一定要映射成数字，也应该明确它只是**诊断分数**。

已有实现里，FAQ 精确匹配、稳定的 RAG 检索、中等检索、弱检索和无 Context 会落到不同的证据档位；经历历史改写或上游意图不稳定时，还会继续做风险降级。最重要的是，这些分值被明确定位为工程诊断分档，而不是模型训练得到的概率。

这一点我觉得非常重要。

否则前端一旦显示：

```text
Confidence: 0.87
```

用户很容易自动理解成：

> “87% 概率是正确的。”

但系统其实并没有能力做出这么严格的概率声明。

---

## 4. 有了证据，还得控制 Context 怎么进 Prompt

证据足够，并不代表所有召回结果都应该直接塞进 Prompt。

一个常见问题是：

> 为了“保险”，把 Top 20 全部交给 LLM。

结果 Context 越来越长。

里面有重复内容、边缘相关内容，甚至不同版本之间略有冲突的描述。

这时候模型反而更难判断重点。

所以 Evidence Gate 前后通常还需要做一层 Context Selection：

```text
Retrieval Hits
   ↓
Score Filter
   ↓
Deduplicate
   ↓
Context Selection
   ↓
Token Budget
   ↓
Prompt
```

我更喜欢把这件事理解成：

> **Retriever 负责找候选，Context Builder 负责决定哪些证据真的上庭。**

不是搜索排名前几名就天然有资格进入最终 Prompt。

这一层越清楚，后面的 Citation 和 Verification 才越有意义。

---

## 5. “附了来源”不等于“答案有依据”

RAG 上线后，还有一个很容易制造安全感的东西：

> Sources。

答案下面列三篇文档，界面看起来立刻可靠了很多。

但如果认真一点，会发现：

**有来源列表，和每一句话都有来源支撑，是两回事。**

例如：

> 公司差旅住宿标准为 600 元/晚，打车费用可以全额报销，部门负责人审批即可。[1]

但 `[1]` 实际上只写了住宿标准。

交通费和审批流程根本没出现。

如果页面底部仍然列着：

```text
参考来源：
[1] 差旅管理制度
```

看起来“有引用”，实际上并不能证明整个回答成立。

![Citation 的生成后核验链路](/images/production-rag/05-evidence-confidence-02.png)

> 图 2：Citation 的生成后核验链路。仅在答案末尾列出来源并不够，还需要检查正文引用的合法性、覆盖度以及引用内容是否真正支撑对应陈述。

所以 Citation 最好不是装饰品，而是真正进入核验逻辑。

一个更严格的思路是：

```text
Generated Answer
   ↓
提取正文 Citation
   ↓
检查引用编号是否合法
   ↓
检查关键事实是否有引用覆盖
   ↓
检查引用内容是否和回答存在支撑关系
```

已有的生成核验也明确区分了“正文行内引用”和答案末尾自动附加的来源列表：后者只能说明整体带了来源，不能证明每个事实都有依据，所以核验时需要单独检查正文中的 `[1]`、`[2]` 等引用。

这个细节看起来小，其实很关键。

否则 Citation 很容易从“证据机制”退化成 UI 装饰。

---

## 6. 生成前和生成后，最好分开评价

我比较喜欢的一种思路，是把 Confidence 拆成两段。

第一段：

```text
Evidence Confidence
```

回答：

> **送给 LLM 的证据质量怎么样？**

第二段：

```text
Generation Verification
```

回答：

> **LLM 最终有没有老老实实基于这些证据回答？**

这两个问题完全不同。

可能出现：

```text
证据很好
但生成结果漏引用、过度发挥
```

也可能出现：

```text
模型回答形式非常规范
但原始证据本身就很弱
```

所以不应该只在最后打一个总分，把前面的原因全部盖掉。

更清楚的结构是：

```text
Evidence
   ↓
evidence_confidence
   ↓
LLM Generation
   ↓
Citation / Context Verification
   ↓
generation_verification
   ↓
answer_confidence
```

这种两阶段设计本身也更方便排查问题：生成前记录证据分，生成后再依据最终答案做核验，而不是让一个最终分数承担所有解释。

---

## 7. 最终 Confidence，我反而倾向于保守一点

假设：

```text
evidence_confidence = 0.85
generation_verification = 0.65
```

最终该给多少？

一种很诱人的做法是平均：

```text
(0.85 + 0.65) / 2 = 0.75
```

但这有个问题。

证据很强，并不能抵消一个明显有问题的生成结果。

同样，生成格式做得很漂亮，也不能挽救本来就很弱的证据。

所以我更喜欢保守合并，比如直接取较低值：

```python
answer_confidence = min(
    evidence_confidence,
    generation_verification,
)
```

![两阶段置信度设计](/images/production-rag/05-evidence-confidence-03.png)

> 图 3：两阶段置信度设计。生成前先评估证据质量，生成后再检查答案是否忠实于证据，最终采用保守方式合并；这些分值用于工程诊断，而不是答案正确概率。

也就是说：

> **最终可靠性由最薄弱的一环决定。**

已有实现同样采用这种保守策略：证据强度和生成核验取较低值；如果这一轮根本没有调用 LLM，比如 FAQ 直出或信息不足收口，则只保留证据分，不伪造所谓的“生成核验结果”。

这种方式当然也不是唯一答案。

但它至少表达了一种比较明确的风险偏好：

> 我宁愿低估，也不希望因为平均分把明显的问题冲淡。

---

## 8. Generation Verification 也别说得太神

生成后的自动核验很有用，但也特别容易被高估。

比如可以检查：

- Citation ID 是否存在；
- 引用覆盖是否足够；
- 答案关键文字和 Context 是否存在较明显重合；
- 答案是否为空或异常短。

这些都能抓到不少低级错误。

但如果只是做词面重合，它并不能证明：

> “这段答案在逻辑上真的被文档蕴含。”

讲义中的实现也明确把 Context Match 定位为轻量级词汇重合判断，而不是严格的 Semantic Entailment。

这一点最好说清楚。

否则特别容易出现：

```text
verification = passed
```

然后大家下意识把它理解成：

> “答案已经被事实验证。”

实际上它可能只意味着：

> 引用格式正常，答案和 Context 在词面上也比较一致。

这是很不一样的两个结论。

---

## 9. 真正有价值的 Confidence，是能帮助排障

我现在判断一个 Confidence 设计有没有用，不太看它能不能生成一个漂亮的 `0.82`。

更关心它能不能回答：

> **这次为什么只有 0.82？**

比如 Trace 里最好能看到：

```text
evidence_confidence:
  score: 0.65
  reason: medium_retrieval

generation_verification:
  score: 0.35
  status: failed
  reason: invalid_citation

answer_confidence:
  score: 0.35
```

这种信息比单独一个：

```text
confidence = 0.35
```

有用得多。

因为第一种能告诉你应该改哪里。

是 Retriever 没找到好证据？

还是 Context Selection 太激进？

还是 Citation Prompt 没约束住？

还是模型最终引用错了？

Confidence 如果不能辅助定位 Bad Case，最后很容易只剩一个看起来很“AI”的数字。

---

## 写在最后

做到这一层以后，我对 RAG “可靠性”的理解也变得简单了一些。

不是加一句 Prompt：

> “请严格根据上下文回答，不要编造。”

也不是答案后面挂几个 Sources。

而是一条完整链路：

```text
Retrieval
   ↓
Context Selection
   ↓
Evidence Check
   ↓
Insufficient?
 ┌─ Yes → 明确收口
 │
 └─ No
      ↓
   Generation
      ↓
Citation Enforcement
      ↓
Generation Verification
      ↓
Answer Confidence
```

这里每一步其实都在回答同一个问题：

> **系统现在掌握的证据，到底允许它说到什么程度？**

这也是我觉得 Production RAG 和普通 Demo 最大的区别之一。

Demo 更关心：

> 能不能生成一个答案？

Production 更应该关心：

> **什么时候可以回答，回答到什么程度，以及当证据不够时，能不能忍住不答。**

而这也正好是这一组 **《从 Demo 到 Production RAG》** 系列最想收住的地方：

从 Pipeline、Hybrid Retrieval、Query Rewrite、Dynamic RetrievalPlan，一路走到最后的 Evidence、Citation 和 Confidence。

真正把 RAG 做稳的，往往不是某一个更强的模型。

而是这些看起来没那么“炫”，但能让系统知道自己边界的工程机制。
