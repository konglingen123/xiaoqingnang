/**
 * 打卡与蓄电条
 * 蓄电条 = 今日电量：每完成一次自愈仪式 +10，上限 100，每日重置、只涨不掉。
 * 长期沉淀交给竹叶日历（打卡记录是唯一数据源，电量由记录推导，不单独存储）。
 */
import { getCheckins, saveCheckins } from './storage'
import { todayKey } from './date'
import { CheckinRecord } from '../typings/models'

export const BATTERY_PER_RITUAL = 10
export const BATTERY_MAX = 100

/** 由今日打卡次数推导今日电量 */
export function getBattery(): number {
  const today = todayKey()
  const count = getCheckins().filter((r) => r.date === today).length
  return Math.min(BATTERY_MAX, count * BATTERY_PER_RITUAL)
}

/** 打卡并返回最新电量 */
export function addCheckin(planId: string, planName: string, after: string): { battery: number; reached: boolean } {
  const list = getCheckins()
  const record: CheckinRecord = {
    date: todayKey(),
    planId,
    planName,
    after,
    ts: Date.now()
  }
  list.push(record)
  saveCheckins(list)

  const battery = getBattery()
  return { battery, reached: battery >= BATTERY_MAX }
}
