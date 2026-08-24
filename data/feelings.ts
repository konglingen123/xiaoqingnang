import { FeelingItem } from '../typings/models'

/** 罗盘上的 8 种体感（去医疗化的身体语言） */
export const FEELINGS: FeelingItem[] = [
  { id: 'cold', name: '发冷', emoji: '❄️' },
  { id: 'bloat', name: '腹胀', emoji: '🫧' },
  { id: 'tight', name: '紧绷', emoji: '🪢' },
  { id: 'tired', name: '困乏', emoji: '🥱' },
  { id: 'heat', name: '燥热', emoji: '🔥' },
  { id: 'heavy', name: '沉重', emoji: '🪨' },
  { id: 'sore', name: '酸痛', emoji: '🦴' },
  { id: 'restless', name: '烦闷', emoji: '🌫️' }
]
