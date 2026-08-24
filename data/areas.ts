import { AreaItem } from '../typings/models'

/** 人体图可点选部位（与 body-figure 组件的热区一一对应） */
export const AREAS: AreaItem[] = [
  { id: 'head', name: '头颈', hint: '发紧、昏沉' },
  { id: 'shoulder', name: '肩背', hint: '紧绷、酸胀' },
  { id: 'belly', name: '腹部', hint: '发胀、发凉' },
  { id: 'limbs', name: '手足', hint: '发冷、乏力' },
  { id: 'whole', name: '全身', hint: '沉重、困乏' }
]
