# 小青囊

把公众号里的中式日常养护资料，整理成更容易搜索、阅读和照着操作的 H5 内容库。

## 当前产品

- 首页：自然语言搜索 / 人体模型切换。
- 搜索结果：信息资料与养护方法卡片，先显示类型、阅读时间、工具和是否可跟做。
- 人体点击：先选择身体正面/背面和头面细分位置，再进入对应资料搜索。
- 详情：一页一条资料；空 Tab 自动隐藏；来源在当前页弹出。
- 内容库：统一浏览全部、养护方法、信息资料。
- 后台：同域名 `/admin/`，左侧可折叠菜单，按文章、方法、问题、穴位、专栏、来源审核、权限和备份分区；支持富文本、图片、GIF、视频、Word 导入、预览、发布和撤回。
- 会员：当前为会员码内测，风险边界始终公开。

当前版本没有正式步骤执行页。只有在真实步骤数据录入并审核后，才把“跟着做”作为方法的可选能力。

## 数据结构

```text
后台一条资料
  ├─ 信息资料 article
  └─ 方法资料 skill
        ↓ 发布接口
前台 PublishedContentItem
        ↓
搜索 / 人体点击 / 内容库 / 单资料详情
```

后台数据存入 SQLite。前台只读取已发布、检查通过的内容，并在本地缓存用于断网回退。

## 技术与地址

- Next.js 16 + React 19 + TypeScript（前台、后台、API 统一 App Router）
- Node.js 22+ + 原生 `node:sqlite`（保持现有 SQLite 数据）
- Web / H5，同一套 Next 应用同时提供 `/`、`/chat`、`/anthology`、`/article/:id`、`/account`、`/admin/*` 与 `/api/*`
- 生产使用 Next standalone 构建，不再依赖 HBuilderX 或独立原生 HTTP 服务
- 正式地址：`https://xiaoqingnang.cn/`
- 后台地址：`https://xiaoqingnang.cn/admin/`

## 主要目录

```text
app/        Next.js App Router 页面与 API 路由
src/lib/    SQLite 访问、数据规范化、权限与发布校验
public/     Next.js 静态品牌、身体模型与内容素材
typings/    旧领域契约（迁移期间保留作数据参考）
data/       身体部位与固定合规文案
utils/      旧端数据工具（迁移期间保留作回滚参考）
admin/      旧后台静态实现（仅作回滚参考，不是运行入口）
scripts/    接口测试与合规检查
server/     旧 Node.js 服务（仅作回滚参考，不是运行入口）
database/   SQLite 结构
docs/       当前产品与内容制作标准
```

## 本地检查

```bash
node scripts/check-content.js
node scripts/test-search-relations.js
npm run check
npm run build

# 开发模式（默认 http://127.0.0.1:4173）
npm run dev

# 生产模式：先 build，再启动 standalone 服务
npm run build
npm start
```
