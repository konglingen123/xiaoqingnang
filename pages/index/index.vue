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

    <!-- AI 搜索入口（阶段二：本地规则检索） -->
    <view class="search-card" @tap="goAi">
      <text class="search-emoji">🎋</text>
      <text class="search-ph">说说你哪里不舒坦，帮你找方案…</text>
      <text class="search-arrow">›</text>
    </view>

    <!-- 人体图：点哪里，去哪里（v2 快路径） -->
    <view class="card wizard">
      <view class="figure-hint">哪里不舒坦？轻点图上部位</view>
      <body-figure :selected="selectedArea" @select="onSelectArea" />
    </view>

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
 * 首页 · 人体图快路径（v2）
 * 点击热区 → 直达该部位的方案页；千人千面：已建档用户置顶体质偏好的方案品类。
 * 合规：每次冷启动展示开屏免责提示，需确认后进入。
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { REMEDIES } from '../../data/remedies'
import { CONSTITUTIONS } from '../../data/constitution'
import { getProfile } from '../../utils/storage'
import { topByConstitution } from '../../utils/recommend'
import { appState } from '../../utils/app-state'

const selectedArea = ref('')
const topPlans = ref<any[]>([])
const profile = ref<any>(null)
const constitution = ref<any>(null)
const showSplash = ref(false)

function decorate(p: any) {
  return { ...p, tagsText: p.categories.join(' · ') }
}

function refresh() {
  const p = getProfile()
  profile.value = p
  constitution.value = p ? CONSTITUTIONS[p.constitutionId] : null
  topPlans.value = p ? topByConstitution(REMEDIES, p.constitutionId).map(decorate) : []
}

onShow(() => {
  refresh()
  // 开屏免责：每次冷启动确认一次
  if (!appState.splashConfirmed) {
    showSplash.value = true
  }
})

/** 点击热区 → 单区高亮 + 直达该部位的方案页 */
function onSelectArea(e: any) {
  selectedArea.value = e.zoneId
  uni.navigateTo({ url: '/pages/area/area?id=' + e.areaId })
}

function goAi() {
  uni.navigateTo({ url: '/pages/ai/ai' })
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

/* AI 搜索入口 */
.search-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 8rpx 32rpx 24rpx;
  background: var(--c-card);
  border: 2rpx solid var(--c-line);
  border-radius: 999rpx;
  padding: 20rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(51, 65, 58, 0.05);
}
.search-emoji {
  font-size: 30rpx;
}
.search-ph {
  flex: 1;
  font-size: 26rpx;
  color: var(--c-ink-soft);
}
.search-arrow {
  font-size: 32rpx;
  color: var(--c-bamboo);
}

/* 人体图卡片 */
.figure-hint {
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 24rpx;
}

/* 方案卡片 */
.standalone {
  margin: 32rpx 36rpx 8rpx;
}
.plan-card {
  border-left: 8rpx solid transparent;
}
.plan-name {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--c-ink);
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
