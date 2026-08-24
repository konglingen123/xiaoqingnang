import { AreaItem } from '../typings/models'

/**
 * 人体图细分部位（与 body-figure 组件热区的 areaId 一一对应）
 * v2 拆分：原 5 大分区拆为 7 个细分部位（头/颈 分开，新增 腰）
 */
export const AREAS: AreaItem[] = [
  { id: 'head', name: '头', hint: '发紧、昏沉', subtitle: '头脑发紧昏沉，给它松松绑' },
  { id: 'neck', name: '颈', hint: '发僵、发紧', subtitle: '这里紧绷，多半是它在抗议久坐' },
  { id: 'shoulder', name: '肩背', hint: '紧绷、酸胀', subtitle: '扛了一天，肩膀也想放下来' },
  { id: 'waist', name: '腰', hint: '酸乏、发紧', subtitle: '久坐后的腰，需要被好好安放' },
  { id: 'belly', name: '腹', hint: '发胀、发凉', subtitle: '肚子发胀发凉，暖一暖就安稳' },
  { id: 'limbs', name: '手足', hint: '发冷、乏力', subtitle: '手脚发冷乏力，从指尖暖回来' },
  { id: 'whole', name: '全身', hint: '沉重、困乏', subtitle: '说不清哪里累，就整个人都歇一歇' }
]
