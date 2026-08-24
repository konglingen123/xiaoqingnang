/**
 * 体质打分引擎（纯规则）
 * 3 题奇数 + 每题选项严格倾向冷/热之一 → 冷热总分必然不同，必有结果。
 */
import { ONBOARD_QUESTIONS } from '../data/questionnaire'
import { ConstitutionId } from '../typings/models'

export function scoreConstitution(answers: number[]): ConstitutionId {
  let cold = 0
  let heat = 0
  ONBOARD_QUESTIONS.forEach((q, i) => {
    const opt = q.options[answers[i]]
    if (!opt) return
    cold += opt.cold
    heat += opt.heat
  })
  return cold > heat ? 'bingbing' : 'yiran'
}
