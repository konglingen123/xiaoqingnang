/**
 * 小青囊 · 领域模型
 * 所有数据类型集中定义于此，数据层 / 工具层 / 页面层共同引用
 */

/** 体质类型（PRD 确认：只做两种，不做"平和"兜底） */
export type ConstitutionId = 'bingbing' | 'yiran'

/** 体质（去医疗化命名） */
export interface Constitution {
  id: ConstitutionId
  name: string          // 冰冰体质 / 易燃体质
  motto: string         // 宜温通 / 宜清透
  desc: string          // 身体说明书文案
  preferredCategories: string[]  // 千人千面：首页置顶的方案品类
}

/** 建档问题（3 问，每题选项严格倾向冷/热之一，保证必有结果） */
export interface OnboardOption {
  label: string
  cold: number
  heat: number
}

export interface OnboardQuestion {
  id: string
  text: string
  options: OnboardOption[]
}

/** 人体图部位 */
export interface AreaItem {
  id: string
  name: string
  hint: string
  subtitle: string   // 部位方案页副题文案（人话调性）
}

/** 安全红绿灯（合规红线 3） */
export type SafetyLevel = 'green' | 'yellow' | 'red'

/** 自愈方案的动作步骤 */
export interface RemedyStep {
  title: string
  detail: string
}

/** 自愈方案（内容全部数据驱动，禁用词由扫描脚本把关） */
export interface RemedyPlan {
  id: string
  name: string
  motto: string
  desc: string
  areas: string[]        // 适用部位
  categories: string[]   // 品类标签（驱动千人千面）
  safety: SafetyLevel    // 红绿灯
  contraindications: string[]  // 强制字段：每个方案必须标明禁忌
  phases: {
    breathe: string      // 调息阶段引导文案
    steps: RemedyStep[]  // 动作阶段步骤（90 秒内均匀分配）
    ending: string       // 收尾阶段引导文案
  }
}

/** 用户档案 */
export interface UserProfile {
  constitutionId: ConstitutionId
  createdAt: string      // YYYY-MM-DD
  answers: number[]      // 建档 3 问的选项下标
}

/** 打卡记录（蓄电条与竹叶日历的唯一数据源） */
export interface CheckinRecord {
  date: string           // YYYY-MM-DD
  planId: string
  planName: string
  after: string          // 完成后体感自评
  ts: number
}
