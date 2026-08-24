/**
 * 云函数侧合规副本（红线 4）
 * ⚠️ 与前端 data/compliance.ts、data/remedies.ts 保持同步：
 *    红旗词/话术以 data/compliance.ts 为准，方案目录以 data/remedies.ts 为准，
 *    改内容时三处一起改（见 docs/features/ai-search.md §5.3）。
 */
'use strict'

const RED_FLAGS = ['发烧', '高烧', '剧痛', '剧烈疼痛', '出血', '流血', '晕倒', '晕厥', '胸闷', '呼吸困难', '喘不上气']

const AI_REDFLAG_TEXT = '你描述的情况可能需要专业帮助。高烧（>38.5℃）或剧烈腹痛请及时就医；若症状持续或加重，请尽快咨询医生。'

/** 方案目录：LLM 据此输出 matchedPlanIds，禁止编造目录之外的 id */
const PLAN_CATALOG = [
  { id: 'warm-neck', name: '暖颈 · 温敷礼', areas: ['neck', 'shoulder'], aliases: ['落枕', '脖子僵', '脖子酸', '脖子冷', '肩颈酸', '肩颈僵'], scenarios: ['久坐', '空调房', '受凉', '伏案'] },
  { id: 'warm-belly', name: '暖腹 · 掌心仪式', areas: ['belly'], aliases: ['肚子凉', '肚子胀', '腹胀', '小腹冷', '吃凉的', '肚子不舒服'], scenarios: ['吹空调', '吃冰的', '饭后'] },
  { id: 'foot-soak', name: '暖足 · 沐足小憩', areas: ['limbs'], aliases: ['脚冷', '脚凉', '手脚冰凉', '泡脚', '脚累'], scenarios: ['冬天', '睡前', '雨天'] },
  { id: 'cloud-hands', name: '舒展 · 肩颈云手', areas: ['neck', 'shoulder'], aliases: ['肩颈僵硬', '肩膀僵', '肩膀酸', '脖子难受', '耸肩'], scenarios: ['久坐', '电脑前', '伏案', '办公室'] },
  { id: 'side-stretch', name: '归位 · 脊柱轻旋', areas: ['waist', 'shoulder'], aliases: ['腰酸', '腰僵', '腰背酸', '久坐腰', '伸懒腰', '腰不舒服'], scenarios: ['久坐', '办公室', '开车'] },
  { id: 'cool-breath', name: '清透 · 凉感呼吸', areas: ['whole', 'head'], aliases: ['燥热', '心烦', '烦躁', '上火', '口干', '静不下来'], scenarios: ['夏天', '闷热', '午后'] },
  { id: 'face-cool', name: '润爽 · 面颊凉润', areas: ['head'], aliases: ['脸发热', '脸红', '脸燥', '面颊发烫', '晒后'], scenarios: ['夏天', '晒后'] },
  { id: 'cloud-nap', name: '安神 · 云朵小憩', areas: ['whole', 'head'], aliases: ['累', '困', '疲惫', '没精神', '想休息', '提不起劲'], scenarios: ['午后', '下班后', '用脑过度'] },
  { id: 'finger-play', name: '活络 · 十指操', areas: ['limbs'], aliases: ['手酸', '手麻', '手指僵', '手腕酸', '打字多', '手累'], scenarios: ['手机玩多了', '打字', '久坐'] },
  { id: 'belly-breath', name: '深息 · 腹式调息', areas: ['whole', 'belly'], aliases: ['心慌', '紧张', '焦虑', '深呼吸', '气不顺', '平静不下来'], scenarios: ['睡前', '紧张', '开会前'] }
]

const PLAN_ID_SET = new Set(PLAN_CATALOG.map((p) => p.id))

const SYSTEM_PROMPT = `你是「小青囊」的舒缓方案检索助手，不是医生。
职责：理解用户的身体不适描述，从给定的方案目录中检索最合适的舒缓方案。

硬性规则：
1. 禁止任何诊断、用药建议、疾病名称；不回答与身体舒缓无关的问题。
2. 只输出一个 JSON 对象，不要输出任何其他文字。字段：
   {"matchedPlanIds": ["方案id"], "reason": "≤50字推荐理由，用去医疗化的身体语言", "chips": ["追问快选项，≤3个"], "followupQuestion": "追问一句或空串", "redFlag": false}
3. 用户描述包含高烧、剧痛、出血、晕倒、胸闷、呼吸困难等紧急信号时，输出 {"redFlag": true, "matchedPlanIds": [], "reason": "", "chips": [], "followupQuestion": ""}。
4. matchedPlanIds 只能取方案目录中的 id，最多 3 个；找不到合适的输出空数组。
5. 方案目录：
${JSON.stringify(PLAN_CATALOG)}`

module.exports = { RED_FLAGS, AI_REDFLAG_TEXT, SYSTEM_PROMPT, PLAN_CATALOG, PLAN_ID_SET }
