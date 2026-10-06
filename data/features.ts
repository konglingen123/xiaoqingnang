/** 功能开关只控制入口是否出现，不改变各业务域的数据边界。 */
export type FeatureId = 'ai' | 'anthology' | 'practice' | 'commerce'

export interface FeatureDefinition {
  id: FeatureId
  name: string
  enabled: boolean
  navigation: 'home' | 'tab' | 'account'
}

export const FEATURES: Record<FeatureId, FeatureDefinition> = {
  ai: { id: 'ai', name: 'AI 交互', enabled: false, navigation: 'home' },
  anthology: { id: 'anthology', name: '青囊文集', enabled: true, navigation: 'tab' },
  practice: { id: 'practice', name: '练功打卡', enabled: false, navigation: 'tab' },
  commerce: { id: 'commerce', name: '轻养商城', enabled: false, navigation: 'tab' }
}

export const isFeatureEnabled = (id: FeatureId) => FEATURES[id].enabled
