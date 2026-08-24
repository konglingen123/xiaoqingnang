# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

小青囊：微不适轻养生自愈小程序。用户点选身体部位 + 体感 → 匹配 3 分钟自愈仪式 → 打卡沉淀健康档案。合规底线是**彻底去疾病化**（这是健康类小程序，文案不得出现任何疾病/医疗词汇，见下文「合规红线」）。

技术栈：uni-app（Vue 3 + TypeScript），一套代码跑微信小程序 / H5 / App。**本项目零 npm 依赖**——没有 package.json，不运行 `npm install` / `npm run` 等命令。

## 开发与运行

通过 HBuilderX 运行，无命令行构建：

1. HBuilderX 打开本目录 → 运行 → 运行到浏览器（H5 最快）
2. 运行 → 运行到小程序模拟器 → 微信开发者工具（AppID 用测试号）
3. `pages.json` / `manifest.json` 是 uni-app 约定配置；微信 AppID 在 `manifest.json` 的 `mp-weixin.appid`

唯一命令行工具（合规扫描，**提交前必须通过**）：

```bash
node scripts/check-content.js
```

扫描 `data / pages / components` 下所有 `.ts / .vue` 文案，命中禁用词即 exit 1。无测试框架。

## 架构分层（严格单向依赖）

```
typings/models.ts   ← 领域模型唯一数据契约，所有层共同引用
data/               ← 内容数据（全部数据驱动：方案、体质、题库、部位、体感、合规文案）
utils/              ← 纯逻辑层，与框架解耦（不 import 任何 .vue）
components/         ← 通用组件，easycom 按目录名自动注册（无需手动 import/注册）
pages/              ← 5 个页面，UI + 组装，不含业务规则
```

- **换数据不改代码**：新增/修改方案、题库、部位等，只改 `data/`。
- **换存储不改页面**：所有持久化只经 `utils/storage.ts`（现在是 `uni.setStorageSync` 本地存储，后续迁云开发只需重写这一文件）。
- `typings/index.d.ts` 把 `uni` / `wx` 声明为 `any`（零依赖方案）；未安装 `@dcloudio/types`，写代码时不要依赖 uni API 的完整类型提示。

## 核心数据流

1. **首页 index**：人体图选部位 → 罗盘选体感 → `utils/recommend.ts` 规则排序出 TOP3 → 点方案进 prepare
2. **准备页 prepare**：`?id=` 传方案 id（`onLoad` options 读取），展示禁忌 + 三阶段流程，底部常驻免责条
3. **仪式页 player**：状态机 `count → run → finish → result`；180s 固定结构 = 调息 60s + 动作 90s + 收尾 30s（`PHASE_ENDS = [60, 150, 180]`，动作阶段按 `steps` 均分），结束打卡 `+10`
4. **档案页 profile**：未建档 → 3 问打分；已建档 → 身体说明书 + 蓄电条 + 竹叶日历
5. **锦囊页 gear**：关于 + 免责全文 + 清除本地数据

页面间传参只走 URL query（`?id=xxx`），无状态管理库；跨页共享的只有 `utils/app-state.ts` 的会话级 reactive 状态。

## 关键规则（散落在多处，改动时需一致）

- **推荐排序**（`utils/recommend.ts`）：体感命中 +5 > 部位命中 +3 > 体质品类偏好 +2（每品类），纯规则无算法。千人千面置顶 = 按体质 `preferredCategories` 过滤方案 `categories`。
- **体质打分**（`utils/constitution.ts`）：3 问、每题选项严格倾向冷/热之一（无中立），冷热总分必不同 → 必出 `bingbing` 或 `yiran`，**没有「平和」兜底类型**（PRD 决策）。
- **蓄电条**（`utils/checkin.ts`）：电量由打卡记录**推导**，从不单独存储——今日打卡次数 × 10，上限 100，每日重置。`CheckinRecord` 是蓄电条和竹叶日历的唯一数据源。
- **打卡记录**：`date` 字段格式 `YYYY-MM-DD`（`utils/date.ts` 的 `todayKey()` 生成），全项目统一。
- **动态样式尺寸**：`:style` 绑定里的 `rpx` 在 H5 不生效，动态尺寸必须用 `utils/upx.ts` 的 `upx()/upxPx()` 转换，不要手写。
- **设计令牌**：颜色、通用类（`.card` `.btn-primary` `.btn-ghost` `.hint` 等）全部在 `App.vue` 全局样式中定义（竹青 × 宣纸米白），页面内直接用 CSS 变量，不要另立色值。

## 合规红线（不可触碰）

1. **去疾病化文案**：禁用词表在 `data/compliance.ts` 的 `BANNED_WORDS` 与 `scripts/check-content.js` 中**各存一份、必须同步**（脚本跳过 compliance.ts 以免词表误伤自己）。改禁用词要两处一起改。替换参考 `REPLACE_MAP`（如 感冒→受凉）。
2. **常驻免责**：每次冷启动开屏免责（`appState.splashConfirmed`，仅内存、冷启动重置）；方案页底部 `disclaimer-bar mode="bar"` 不可隐藏。免责文案唯一来源是 `data/compliance.ts`。
3. **安全红绿灯**：每个 `RemedyPlan` 强制有 `contraindications` 字段（缺字段即不合规）；`safety` 为 red 的方案暂不建议进行。

**新增一个自愈方案 checklist**：`data/remedies.ts` 加条目 → 填齐 `contraindications` → 文案用去疾病化身体语言 → 动作步骤需在 90s 内合理分配 → 跑 `node scripts/check-content.js` 通过。
