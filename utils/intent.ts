/**
 * AI 搜索规则引擎（阶段二：本地模拟 AI；阶段三：LLM 之前的规则优先层）
 * 匹配顺序：红旗词 → 方案关键词直返 → 部位直返 → 未命中。
 * 打分参考（ai-search.md §3）：方案关键词 +4 > 部位别名 +3，方案命中优先。
 * 已知局限（阶段三由 LLM 补足）：无法理解否定（「不累」会命中「累」）、无法自由追问。
 */
import { AREAS } from '../data/areas'
import { REMEDIES } from '../data/remedies'
import { RED_FLAGS } from '../data/compliance'
import { RemedyPlan } from '../typings/models'

export interface IntentResult {
  redFlag: boolean
  hitType: 'plan' | 'area' | 'none'
  planIds: string[]   // 命中的方案（库序 = 最常用优先）
  areaId: string
  areaName: string
  matchedAlias: string  // 命中的关键词（用于回复文案）
}

const EMPTY: IntentResult = {
  redFlag: false, hitType: 'none', planIds: [], areaId: '', areaName: '', matchedAlias: ''
}

/** 口语 → 意图（纯规则，不生成任何内容） */
export function parseIntent(text: string): IntentResult {
  const q = (text || '').trim()

  // 1. 红旗词：最高优先级，命中即终止推荐
  const flag = RED_FLAGS.find((w) => q.indexOf(w) >= 0)
  if (flag) return { ...EMPTY, redFlag: true, matchedAlias: flag }

  // 2. 方案关键词：先过别名（具体词，如「腰酸」「落枕」），再过场景词（泛词，如「久坐」）
  //    两遍制保证具体别名优先于泛场景词；库序 = 最常用优先
  let hit: { plan: RemedyPlan; kw: string } | null = null
  for (const p of REMEDIES) {
    const kw = p.aliases.find((w) => q.indexOf(w) >= 0)
    if (kw) { hit = { plan: p, kw }; break }
  }
  if (!hit) {
    for (const p of REMEDIES) {
      const kw = p.scenarios.find((w) => q.indexOf(w) >= 0)
      if (kw) { hit = { plan: p, kw }; break }
    }
  }
  if (hit) {
    const p = hit.plan
    // 命中方案置顶 + 同部位方案作备选（最多 3 个）
    const rest = REMEDIES.filter(
      (x) => x.id !== p.id && x.areas.some((a) => p.areas.indexOf(a) >= 0)
    ).map((x) => x.id)
    return { ...EMPTY, hitType: 'plan', planIds: [p.id].concat(rest).slice(0, 3), matchedAlias: hit.kw }
  }

  // 3. 部位别名：返回该部位的方案（库序，最多 3 个）
  for (const a of AREAS) {
    const kw = a.aliases.find((w) => q.indexOf(w) >= 0)
    if (kw) {
      const planIds = REMEDIES.filter((p) => p.areas.indexOf(a.id) >= 0).slice(0, 3).map((p) => p.id)
      return { ...EMPTY, hitType: 'area', areaId: a.id, areaName: a.name, planIds, matchedAlias: kw }
    }
  }

  return EMPTY
}

export interface PreferenceResult {
  planIds: string[]
  note: string   // 回复导语；空串表示无有效偏好命中
}

/** 偏好追问（阶段二模拟多轮）：对候选方案做本地过滤 */
export function applyPreference(candidates: string[], text: string): PreferenceResult {
  const q = (text || '').trim()
  const plans = REMEDIES.filter((p) => candidates.indexOf(p.id) >= 0)

  // 不想泡脚 → 排除沐足
  if (/不(想|能|会|可以)?泡脚/.test(q)) {
    const left = plans.filter((p) => p.id !== 'foot-soak')
    if (left.length) return { planIds: left.map((p) => p.id), note: '好的，去掉了需要泡脚的方案：' }
    return { planIds: [], note: '不泡脚的话暂时没有更合适的方案，先试试全身放松的：' }
  }
  // 办公室 / 坐着 → 优先久坐场景
  if (/(办公室|上班|坐着|办公)/.test(q)) {
    const hit = plans.filter((p) =>
      p.scenarios.some((s) => ['办公室', '久坐', '伏案', '电脑前', '打字'].indexOf(s) >= 0)
    )
    if (hit.length) return { planIds: hit.map((p) => p.id), note: '适合办公室的来了：' }
  }
  // 睡前 → 优先睡前场景
  if (/睡前/.test(q)) {
    const hit = plans.filter((p) => p.scenarios.indexOf('睡前') >= 0)
    if (hit.length) return { planIds: hit.map((p) => p.id), note: '睡前做最合适的：' }
  }
  // 想安静 → 安神类
  if (/(安静|静一静|放松一下)/.test(q)) {
    const hit = plans.filter((p) => p.categories.indexOf('安神') >= 0)
    if (hit.length) return { planIds: hit.map((p) => p.id), note: '安神类的方案来了：' }
  }

  return { planIds: plans.map((p) => p.id), note: '' }
}
