<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header">
      <view>
        <view class="title">小青囊</view>
        <view class="subtitle">3 分钟，安抚身体的小情绪</view>
      </view>
      <view v-if="constitution" class="chip" @tap="goProfile">
        {{ constitution.name }} · {{ constitution.motto }}
      </view>
      <view v-else class="chip chip-empty" @tap="goProfile">建立身体说明书</view>
    </view>

    <!-- 体感直觉卡片 -->
    <view class="card wizard">
      <view class="wizard-step">
        <text class="step-no">壹</text>
        <view class="step-body">
          <view class="step-label">今天，哪里不舒展？</view>
          <view class="step-state">{{ areaName || '轻点图中部位' }}</view>
        </view>
      </view>

      <body-figure :selected="selectedArea" @select="onSelectArea" />

      <template v-if="selectedArea">
        <view class="wizard-step">
          <text class="step-no">贰</text>
          <view class="step-body">
            <view class="step-label">它是什么感觉？</view>
            <view class="step-state">{{ feelingName || '拨动罗盘，选一种感觉' }}</view>
          </view>
        </view>
        <compass-card :feelings="feelings" :selected="selectedFeeling" @select="onSelectFeeling" />
      </template>
      <view v-else class="hint">先轻点图上不舒服的部位</view>

      <view class="random-btn" @tap="onRandomAll">🎋 听罗盘的，替我选</view>
    </view>

    <!-- 匹配方案 -->
    <template v-if="matched.length">
      <view class="section-title standalone">为你匹配的自愈方案</view>
      <view
        v-for="(item, index) in matched"
        :key="item.id"
        :class="['card', 'plan-card', index === 0 ? 'plan-top' : '']"
        @tap="goPrepare(item.id)"
      >
        <view class="plan-name">
          <text>{{ item.name }}</text>
          <text v-if="index === 0" class="tag">最合身</text>
        </view>
        <view class="plan-motto">{{ item.motto }}</view>
        <view class="plan-meta">
          <text :class="['dot', 'dot-' + item.safety]"></text>
          <text>{{ item.tagsText }}</text>
          <text class="plan-go">开始 ›</text>
        </view>
      </view>
    </template>

    <!-- 千人千面 -->
    <view v-if="!profile" class="card onboard-hint" @tap="goProfile">
      <view class="hint-title">🌱 建立你的身体说明书</view>
      <view class="hint-desc">回答 3 个小问题，首页会为你优先推荐合适的方案</view>
    </view>
    <template v-else>
      <view class="section-title standalone">为你优选 · 按体质定制</view>
      <view
        v-for="item in topPlans"
        :key="item.id"
        class="card plan-card"
        @tap="goPrepare(item.id)"
      >
        <view class="plan-name"><text>{{ item.name }}</text></view>
        <view class="plan-motto">{{ item.motto }}</view>
        <view class="plan-meta">
          <text :class="['dot', 'dot-' + item.safety]"></text>
          <text>{{ item.tagsText }}</text>
          <text class="plan-go">开始 ›</text>
        </view>
      </view>
    </template>

    <view class="footer-space"></view>

    <!-- 开屏免责（合规红线 2） -->
    <disclaimer-bar v-if="showSplash" mode="splash" @confirm="onConfirmSplash" />
  </view>
</template>

<script setup lang="ts">
/**
 * 首页 · 体感直觉卡片主流程
 * 选部位（人体图）→ 选体感（罗盘）→ 自动匹配方案；「听罗盘的」一键随机治选择焦虑。
 * 千人千面：已建档用户首页置顶体质偏好的方案品类。
 * 合规：每次冷启动展示开屏免责提示，需确认后进入。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { AREAS } from '../../data/areas'
import { FEELINGS } from '../../data/feelings'
import { REMEDIES } from '../../data/remedies'
import { CONSTITUTIONS } from '../../data/constitution'
import { getProfile } from '../../utils/storage'
import { sortPlans, topByConstitution } from '../../utils/recommend'
import { appState } from '../../utils/app-state'

const areas = AREAS
const feelings = FEELINGS

const selectedArea = ref('')
const selectedFeeling = ref('')
const areaName = ref('')
const feelingName = ref('')
const matched = ref<any[]>([])
const topPlans = ref<any[]>([])
const profile = ref<any>(null)
const constitution = ref<any>(null)
const showSplash = ref(false)

function decorate(p: any) {
  return { ...p, tagsText: p.categories.join(' · ') }
}

function buildMatched(): any[] {
  return sortPlans(REMEDIES, {
    area: selectedArea.value,
    feeling: selectedFeeling.value,
    constitutionId: profile.value ? profile.value.constitutionId : undefined
  })
    .slice(0, 3)
    .map(decorate)
}

function refresh() {
  const p = getProfile()
  profile.value = p
  constitution.value = p ? CONSTITUTIONS[p.constitutionId] : null
  topPlans.value = p ? topByConstitution(REMEDIES, p.constitutionId).map(decorate) : []
  if (selectedArea.value && selectedFeeling.value) {
    matched.value = buildMatched()
  }
}

onShow(() => {
  refresh()
  // 开屏免责：每次冷启动确认一次
  if (!appState.splashConfirmed) {
    showSplash.value = true
  }
})

function onSelectArea(e: any) {
  const id = e.id
  const area = AREAS.find((a) => a.id === id)
  selectedArea.value = id
  areaName.value = area ? area.name : ''
  selectedFeeling.value = ''
  feelingName.value = ''
  matched.value = []
}

function onSelectFeeling(e: any) {
  const id = e.id
  const feeling = FEELINGS.find((f) => f.id === id)
  selectedFeeling.value = id
  feelingName.value = feeling ? feeling.name : ''
  matched.value = buildMatched()
}

/** 「听罗盘的，替我选」：部位 + 体感全随机，一键出方案 */
function onRandomAll() {
  const area = AREAS[Math.floor(Math.random() * AREAS.length)]
  const feeling = FEELINGS[Math.floor(Math.random() * FEELINGS.length)]
  selectedArea.value = area.id
  areaName.value = area.name
  selectedFeeling.value = feeling.id
  feelingName.value = feeling.name
  matched.value = buildMatched()
}

function goPrepare(id: string) {
  uni.navigateTo({ url: '/pages/prepare/prepare?id=' + id })
}

function goProfile() {
  uni.switchTab({ url: '/pages/profile/profile' })
}

function onConfirmSplash() {
  showSplash.value = false
  appState.splashConfirmed = true
}
</script>

<style scoped>
.page {
  padding-bottom: 48rpx;
}

/* 头部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 32rpx 16rpx;
}
.title {
  font-size: 52rpx;
  font-weight: 700;
  color: var(--c-bamboo-deep);
  letter-spacing: 4rpx;
}
.subtitle {
  font-size: 24rpx;
  color: var(--c-ink-soft);
  margin-top: 4rpx;
}
.chip {
  background: var(--c-bamboo);
  color: #ffffff;
  font-size: 22rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
}
.chip-empty {
  background: transparent;
  border: 2rpx solid var(--c-bamboo);
  color: var(--c-bamboo);
}

/* 体感卡片向导 */
.wizard-step {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 8rpx;
}
.step-no {
  width: 52rpx;
  height: 52rpx;
  line-height: 52rpx;
  text-align: center;
  background: var(--c-bamboo-light);
  color: var(--c-bamboo-deep);
  border-radius: 50%;
  font-size: 24rpx;
  flex-shrink: 0;
}
.step-label {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-ink);
}
.step-state {
  font-size: 24rpx;
  color: var(--c-ginger);
  margin-top: 2rpx;
}

.random-btn {
  margin: 8rpx auto 0;
  text-align: center;
  color: var(--c-bamboo);
  font-size: 26rpx;
  border: 2rpx dashed var(--c-bamboo-light);
  border-radius: 999rpx;
  padding: 16rpx 0;
  width: 420rpx;
}

/* 方案卡片 */
.standalone {
  margin: 32rpx 36rpx 8rpx;
}
.plan-card {
  border-left: 8rpx solid transparent;
}
.plan-top {
  border-left-color: var(--c-bamboo);
  background: linear-gradient(90deg, #F3F8F1, #FFFDF7 40%);
}
.plan-name {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--c-ink);
}
.tag {
  font-size: 20rpx;
  color: #ffffff;
  background: var(--c-bamboo);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-weight: 400;
}
.plan-motto {
  font-size: 26rpx;
  color: var(--c-ink-soft);
  margin: 10rpx 0 16rpx;
}
.plan-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 22rpx;
  color: var(--c-ink-soft);
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
}
.dot-green {
  background: var(--c-green);
}
.dot-yellow {
  background: var(--c-yellow);
}
.dot-red {
  background: var(--c-red);
}
.plan-go {
  margin-left: auto;
  color: var(--c-bamboo);
}

/* 建档引导 */
.onboard-hint {
  background: linear-gradient(135deg, #F0F6EC, #FFFDF7);
  border: 2rpx dashed var(--c-bamboo-light);
}
.hint-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-ink);
}
.hint-desc {
  font-size: 24rpx;
  color: var(--c-ink-soft);
  margin-top: 8rpx;
}

.footer-space {
  height: 40rpx;
}
</style>
