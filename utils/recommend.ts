/**
 * 推荐引擎（客户端规则，不上算法）
 * v2：体感维度已删除（原 sortPlans 的体感打分随之移除）。
 * 部位页用 sortForArea（部位方案优先 + 全身兜底），首页千人千面用 topByConstitution（体质品类偏好）。
 */
import { CONSTITUTIONS } from '../data/constitution'
import { RemedyPlan, ConstitutionId } from '../typings/models'

/** 千人千面：按体质品类偏好取出首页置顶方案（保持数据顺序，稳定可控） */
export function topByConstitution(plans: RemedyPlan[], constitutionId: ConstitutionId | undefined, limit = 3): RemedyPlan[] {
  if (!constitutionId) return []
  const con = CONSTITUTIONS[constitutionId]
  return plans
    .filter((p) => p.categories.some((c) => con.preferredCategories.indexOf(c) >= 0))
    .slice(0, limit)
}

/** 部位方案页排序：该部位方案在前，全身通用兜底在后（均保持方案库策展顺序 = 最常用优先） */
export function sortForArea(plans: RemedyPlan[], areaId: string): RemedyPlan[] {
  if (areaId === 'whole') return plans.filter((p) => p.areas.indexOf('whole') >= 0)
  const own = plans.filter((p) => p.areas.indexOf(areaId) >= 0)
  const fallback = plans.filter((p) => p.areas.indexOf(areaId) < 0 && p.areas.indexOf('whole') >= 0)
  return own.concat(fallback)
}
