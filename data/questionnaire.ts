import { OnboardQuestion } from '../typings/models'

/**
 * 轻量无痛建档 · 3 个生活化问题
 * 设计规则：每题每个选项严格倾向冷或热之一（无中立选项），
 * 3 题奇数保证"少数服从多数"必有结果 —— 不需要"平和"兜底类型。
 */
export const ONBOARD_QUESTIONS: OnboardQuestion[] = [
  {
    id: 'q1',
    text: '你的手脚容易发冷吗？',
    options: [
      { label: '总是', cold: 2, heat: 0 },
      { label: '偶尔', cold: 2, heat: 0 },
      { label: '几乎不', cold: 0, heat: 2 }
    ]
  },
  {
    id: 'q2',
    text: '吃了冰的凉的，肚子容易发胀吗？',
    options: [
      { label: '经常', cold: 2, heat: 0 },
      { label: '偶尔', cold: 2, heat: 0 },
      { label: '几乎不', cold: 0, heat: 2 }
    ]
  },
  {
    id: 'q3',
    text: '冷和热，你更怕哪一个？',
    options: [
      { label: '更怕冷', cold: 2, heat: 0 },
      { label: '更怕热', cold: 0, heat: 2 }
    ]
  }
]
