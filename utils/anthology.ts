import { PublishedContentItem } from '../typings/models'
import { getAnthologyColumns } from './content'

export interface AnthologyColumn {
  id: string
  name: string
  description: string
  color: string
  items: PublishedContentItem[]
}

const COLUMN_RULES = [
  ['xuedao', '穴道的奥秘', '沿着经络，慢慢认识身体里的穴位。', '#DCEEDB'],
  ['jisha', '积沙成塔学中医', '从一个知识点开始，积累日常中医认识。', '#FFF0C9'],
  ['yilu', '医路串珠', '从医案和临证记录中理解中医思路。', '#F2E7FA'],
  ['zhenjiu', '跟傻大爷学针灸', '一段从学习到实践的真实成长记录。', '#FFE1D7'],
  ['zibing', '自病自医', '个人与家庭养护经历的第一人称记录。', '#DDEFF0'],
  ['song', '宋永正医案', '以病例为线索阅读诊疗思路与经验。', '#E9E6D8'],
  ['zhoumo', '周末分享', '经典医案、医话与传统认识的周末长读。', '#F6E5CB'],
  ['youxiong', '有熊灸', '围绕艾灸实践与人物经历的专题文章。', '#E3EBD1'],
  ['chenxi', '宸熙日记', '从节气、饮食与生活细节观察身体。', '#F7DDD9'],
  ['a-wen', '阿文直播', '关于吃饭、睡觉和穿衣的生活讨论。', '#DFE8F6'],
  ['reader', '网友分享', '读者提交的个体经历与经验记录。', '#EEE5F3']
] as const

function inferredColumn(item: PublishedContentItem) {
  const explicit = item.anthology?.columnName
  if (explicit) return { id: item.anthology?.columnId || explicit, name: explicit }
  const rule = COLUMN_RULES.find(([, name]) => item.title.startsWith(name))
  return rule ? { id: rule[0], name: rule[1] } : { id: 'other', name: '青囊选读' }
}

export function articleAuthor(item: PublishedContentItem): string {
  return item.source.author || '罾事物语'
}

export function articleTopics(item: PublishedContentItem): string[] {
  return item.anthology?.topics?.length ? item.anthology.topics : item.keywords.slice(0, 3)
}

export function buildColumns(items: PublishedContentItem[]): AnthologyColumn[] {
  const configured=getAnthologyColumns()
  const groups = new Map<string, PublishedContentItem[]>()
  items.forEach((item) => {
    const column = inferredColumn(item)
    groups.set(column.id, [...(groups.get(column.id) || []), item])
  })
  return Array.from(groups.entries()).map(([id, entries]) => {
    const rule = COLUMN_RULES.find(([ruleId]) => ruleId === id)
    const config=configured.find(value=>value.id===id||value.name===inferredColumn(entries[0]).name)
    return {
      id,
      name: config?.name || rule?.[1] || inferredColumn(entries[0]).name,
      description: config?.description || rule?.[2] || '值得安静读完的文章与记录。',
      color: config?.color || rule?.[3] || '#E8EEE9',
      items: entries.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    }
  }).filter(column=>configured.find(value=>value.id===column.id||value.name===column.name)?.status!=='hidden').sort((a, b) => {
    const ca=configured.find(value=>value.id===a.id||value.name===a.name),cb=configured.find(value=>value.id===b.id||value.name===b.name)
    return ca&&cb?ca.sort_order-cb.sort_order:b.items.length-a.items.length
  })
}

export function continueReadingId(): string {
  try { return String(uni.getStorageSync('xqn_anthology_last_read') || '') } catch (e) { return '' }
}

export function rememberReading(id: string) {
  try { uni.setStorageSync('xqn_anthology_last_read', id) } catch (e) { /* 隐私模式下不保存。 */ }
}
