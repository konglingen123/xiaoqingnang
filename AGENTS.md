# AGENTS.md

## 唯一实施基线

小青囊由“青囊文集”和“养护方法”两套内容体系组成，不设置面向用户的“内容库”。它不是医疗服务、生成式方案产品，也不是固定步骤播放器。

当前只存在两种正式内容：

1. **青囊文集**：用于阅读的文章、专栏与专题，保留作者、来源和原始语境，不自动构成操作建议。
2. **养护方法**：用户可以依照图文安全了解或尝试的方法。

跟做步骤属于方法未来的可选附件。没有经过录入和审核的真实步骤时，不建设准备页、播放器、完成页、打卡或体感反馈。

开发前按顺序阅读：

1. `docs/development/v1-redesign-audit.md`
2. `docs/development/project-rebuild-plan.md`
3. `docs/product/skill-production-standard.md`

## 产品原则

- 内容只能来自可追溯资料与人工自审，不由 AI 创造。
- AI 将来只能理解输入、追问和检索数据库白名单；当前版本不接生成式 AI。
- 首页以养护方法搜索为主，人体图是同级辅助入口；首页不得混入文集文章。
- 文集按文章、专栏、专题与作者组织，并独立保存阅读进度。
- 一张卡片对应一条资料，一个详情页只展示这一条资料。
- 空栏目和空 Tab 不出现；资料来源在当前页弹层展示。
- 无匹配时如实返回空结果，不生成兜底方法。
- 风险边界始终公开，不因会员状态隐藏。
- 当前系统不得为了展示补造方法、参数、案例或禁忌。

## 当前数据链

```text
SQLite ContentRecord (article | skill)
  → /api/published-content
  → PublishedContentItem (article | method)
  → 方法：搜索 / 人体点击
  → 文章：青囊文集 / 专栏 / 专题
  → 单资料详情页
```

- `typings/models.ts` 是前台唯一领域契约。
- 后台数据保存在 SQLite；前台只在 `utils/content.ts` 缓存已发布数据。
- 后台位于同域名 `/admin/`，用户端不设置后台入口。
- 当前主流程保留首页、青囊文集、详情页和个人页。未来业务域为 AI、练功打卡和轻养商城预留，但未有真实需求与数据时不展示空入口。

## 后台录入

共同字段：问题名称、说明、搜索词、标准身体位置、访问方式、图文正文、风险边界、资料来源。

方法资料另有：方法名称、类型、工具材料、使用范围、注意事项、停止条件、可选案例集。

图片、GIF、视频直接插入富文本并按阅读顺序展示。发布前必须通过缺项检查和公开用语检查。

## 技术与检查

- Next.js 16、React 19、TypeScript、App Router。
- 唯一发行目标为 Web/H5；前台、后台和 API 由同一个 Next standalone 服务提供。
- SQLite 继续使用 `.runtime/content.db`，通过 `src/lib/db.ts` 统一访问、规范化和权限校验。
- 页面参数使用 URL query；公开列表与详情接口分离，列表不传输正文大字段。
- 固定安全词和公共提示仍来自 `data/compliance.ts`，并在 Next API 与前台检索入口共同执行。
- 用户输入先做安全终止判断，再检索已发布内容。

每次提交前至少运行：

```bash
node scripts/check-content.js
node scripts/test-search-relations.js
npm run check
npm run build
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
