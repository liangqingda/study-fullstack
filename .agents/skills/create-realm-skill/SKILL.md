---
name: create-realm-skill
description: Scaffold a `<realm>-demo` skill for a new learning realm under `.agents/skills/` in the study-lab workspace. Use when adding a demo skill for a realm that is not yet covered (currently only `tech` is covered by `tech-demo`; e.g. a future English realm would produce `english-demo`). Trim the generated content to the realm's nature — coding realms keep the interface-contract / backend / database baselines; non-coding realms drop the backend contract and keep only the content / explanation shape, page layout and quality baselines.
---

# 领域 Demo Skill 脚手架（create-realm-skill）

本仓库按**学习领域**组织 demo：每个领域一个 `<realm>-demo` skill，放在仓库级 `.agents/skills/<realm>-demo/SKILL.md`。本 skill 用于为**尚未覆盖**的领域创建对应的 `<realm>-demo` skill，并按领域特性裁剪内容。当前已覆盖 `tech`（`tech-demo`）。

## 何时使用

- 用户要在 study-lab 里新增一个**学习领域**的 demo/知识点讲解（如英语、会计、地理……），且该领域没有现成 skill。
- 需要先产出领域 skill 再动手写具体 demo。

## 领域属性判断（决定裁剪）

新建 skill 前先判断该领域**是否涉及编码/前后端实现**。这是裁剪的唯一分界：

| 判断维度 | 编码领域（如 tech） | 非编码领域（如 english、历史、地理） |
|---|---|---|
| 是否有可运行的代码/接口 | 有 | 通常没有 |
| 是否要接口契约（schema） | 是 | 否 |
| 是否要后端/数据库基线 | 是 | 否 |
| 是否要「代码结构」弹窗 | 是（展示真实源码） | 否（展示内容/素材来源即可，或不设该入口） |
| 页面目录形态 | `pages/<Realm>/<分类>/<topic>/` | `pages/<Realm>/<topic>/`（可无子分类） |

> 非编码领域**不必照抄 tech-demo**：省去接口契约、后端、数据库、代码结构弹窗等编码专属章节，只保留「展示与讲解」「知识点讲解组织」「页面设计」「文案」「质量要求」「验证与交付」这类通用章节。编码领域则以 `tech-demo` 为完整模板。

## 生成步骤

1. **定领域名**：`realm` 用英文 kebab-case（如 `english`、`accounting`），分类名/目录名由此派生：skill 目录 `.agents/skills/<realm>-demo/`、前端 `pages/<Realm>/`（Realm 为 realm 的 PascalCase，如 `English`）、领域段（若该领域走接口，如未来有接口领域）在 API 路径第一段。
2. **读参照模板**：编码领域读 `.agents/skills/tech-demo/SKILL.md` 作为完整基线；非编码领域不读或只读其通用章节做参考。
3. **写 `<realm>-demo/SKILL.md`**：按领域属性裁剪后写入。frontmatter 的 `name: <realm>-demo`、`description` 说明服务领域与包/目录（如 @study-lab/*）及该领域 demo 的范围。
4. **保留通用章节**（各领域都应保留）：
   - 展示与讲解：每个例子说明问题、触发条件、概念、机制、预期结果；提供可操作入口与可观察的实际结果。
   - 知识点讲解组织：统一用 `take-notes`（全局 `.user_skills/take-notes`）按知识笔记结构（主题概述、核心术语、机制、demo 与结果、常见误区、边界、小结与练习）撰写；知识点讲解须**全面完整**，覆盖该主题完整链路而非仅 demo 触及部分。
   - 前端页面设计：读取 `frontend-design`；设计由学习主题推导，建立小型设计系统，达到可访问性底线；文案平实、动作与结果用词一致。
   - 质量要求：按领域给前端（编码领域还有后端/数据库）基线，明确 should 与 must 的优先级。
   - 验证与交付：构建、静态检查、关键交互；改动仓库文件后按 AGENTS.md 恰好一次提交。
5. **登记 AGENTS.md**：在 `AGENTS.md` 的「按领域规划的 demo skill」说明里追加新领域一行，写明 `<realm>-demo` 的路径与适用领域，便于后续任务发现。
6. **产出校验**：新 skill 的 `SKILL.md` 能被 Read、frontmatter 的 name 与目录一致、覆盖该领域 demo 所需的全部约束，且没有复制 tech 的编码专属内容到非编码领域。

## 约束

- 一个领域只建一个 `<realm>-demo` skill；不给同一领域重复建。
- 非编码领域不要出现接口契约、Zod、后端路由、数据库表、`gen:apis` 等编码专属术语，除非该领域确实涉及。
- 不改动已有领域 skill（如 `tech-demo`）来套新领域；新增只加新 skill 并在 AGENTS.md 登记。
- 生成的是 skill 定义（脚手架），不是具体 demo；具体 demo 由生成的 `<realm>-demo` skill 在后续任务里指导实施。
