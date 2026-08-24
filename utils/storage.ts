/**
 * 存储抽象层（uni-app 版）
 * 第一版使用本地存储（uni.setStorageSync），零配置即可运行，
 * 小程序 / App / H5 三端通用。
 * 后续迁移云端数据库时，只需替换本文件的实现，页面层无需改动。
 */
import { UserProfile, CheckinRecord } from '../typings/models'

const PROFILE_KEY = 'xqn_profile'
const CHECKIN_KEY = 'xqn_checkins'

export function getProfile(): UserProfile | null {
  try {
    return uni.getStorageSync(PROFILE_KEY) || null
  } catch (e) {
    return null
  }
}

export function saveProfile(profile: UserProfile): void {
  uni.setStorageSync(PROFILE_KEY, profile)
}

export function removeProfile(): void {
  uni.removeStorageSync(PROFILE_KEY)
}

export function getCheckins(): CheckinRecord[] {
  try {
    return uni.getStorageSync(CHECKIN_KEY) || []
  } catch (e) {
    return []
  }
}

export function saveCheckins(list: CheckinRecord[]): void {
  uni.setStorageSync(CHECKIN_KEY, list)
}

export function clearAll(): void {
  uni.removeStorageSync(PROFILE_KEY)
  uni.removeStorageSync(CHECKIN_KEY)
}
