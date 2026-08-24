import { Constitution, ConstitutionId } from '../typings/models'

/**
 * 体质体系（PRD 确认：只做冰冰 / 易燃两种）
 * preferredCategories 驱动首页"千人千面"置顶
 */
export const CONSTITUTIONS: Record<ConstitutionId, Constitution> = {
  bingbing: {
    id: 'bingbing',
    name: '冰冰体质',
    motto: '宜温通',
    desc: '你的身体偏爱温暖：受凉容易发冷、发胀。日常宜温敷、暖饮，给身体添一点热乎气。',
    preferredCategories: ['温敷', '驱寒', '温通']
  },
  yiran: {
    id: 'yiran',
    name: '易燃体质',
    motto: '宜清透',
    desc: '你的身体容易燥热、紧绷。日常宜清透、润爽，给身体降一点火气，松一松弦。',
    preferredCategories: ['清透', '润爽', '舒展']
  }
}
