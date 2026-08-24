/**
 * 推荐引擎（客户端规则排序，不上算法）
 * 匹配优先级：体感命中(5) > 部位命中(3) > 体质品类偏好(2)
 */
import { CONSTITUTIONS } from '../data/constitution'
import { RemedyPlan, ConstitutionId } from '../typings/models'

export interface MatchOptions {
  area?: string
  feeling?: string
  constitutionId?: ConstitutionId
}

export function sortPlans(plans: RemedyPlan[], opts: MatchOptions): RemedyPlan[] {
  const { area, feeling, constitutionId } = opts
  const con = constitutionId ? CONSTITUTIONS[constitutionId] : null

  const score = (p: RemedyPlan): number => {
    let s = 0
    if (area && p.areas.indexOf(area) >= 0) s += 3
    if (feeling && p.feelings.indexOf(feeling) >= 0) s += 5
    if (con) {
      p.categories.forEach((c) => {
        if (con.preferredCategories.indexOf(c) >= 0) s += 2
      })
    }
    return s
  }

  return plans.slice().sort((a, b) => score(b) - score(a))
}

/** 千人千面：按体质品类偏好取出首页置顶方案（保持数据顺序，稳定可控） */
export function topByConstitution(plans: RemedyPlan[], constitutionId: ConstitutionId | undefined, limit = 3): RemedyPlan[] {
  if (!constitutionId) return []
  const con = CONSTITUTIONS[constitutionId]
  return plans
    .filter((p) => p.categories.some((c) => con.preferredCategories.indexOf(c) >= 0))
    .slice(0, limit)
}
