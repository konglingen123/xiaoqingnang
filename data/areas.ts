import { AreaItem } from '../typings/models'

/**
 * 人体图细分部位（与 body-figure 组件热区的 areaId 一一对应）
 * v2 拆分：原 5 大分区拆为 7 个细分部位（头/颈 分开，新增 腰）
 * aliases 供 AI 搜索意图识别（注意去医疗化表述，过禁用词扫描）
 */
export const AREAS: AreaItem[] = [
  {
    id: 'head', name: '头', hint: '发紧、昏沉', subtitle: '头脑发紧昏沉，给它松松绑',
    aliases: ['头', '头疼', '头晕', '头昏', '昏沉', '脑子发胀', '太阳穴']
  },
  {
    id: 'neck', name: '颈', hint: '发僵、发紧', subtitle: '这里紧绷，多半是它在抗议久坐',
    aliases: ['脖子', '颈', '颈椎', '落枕', '脖子僵', '脖子酸', '脖子疼']
  },
  {
    id: 'shoulder', name: '肩背', hint: '紧绷、酸胀', subtitle: '扛了一天，肩膀也想放下来',
    aliases: ['肩膀', '肩', '肩颈', '肩背', '背', '后背', '肩胛', '上臂']
  },
  {
    id: 'waist', name: '腰', hint: '酸乏、发紧', subtitle: '久坐后的腰，需要被好好安放',
    aliases: ['腰', '后腰', '腰背', '腰酸', '腰僵']
  },
  {
    id: 'belly', name: '腹', hint: '发胀、发凉', subtitle: '肚子发胀发凉，暖一暖就安稳',
    aliases: ['肚子', '腹', '小腹', '肚脐', '腹胀', '肚子凉', '吃凉的']
  },
  {
    id: 'limbs', name: '手足', hint: '发冷、乏力', subtitle: '手脚发冷乏力，从指尖暖回来',
    aliases: ['手', '脚', '腿', '胳膊', '四肢', '手指', '手腕', '手脚', '手脚冰凉']
  },
  {
    id: 'whole', name: '全身', hint: '沉重、困乏', subtitle: '说不清哪里累，就整个人都歇一歇',
    aliases: ['全身', '整个人', '浑身', '累', '疲惫', '没精神']
  }
]
