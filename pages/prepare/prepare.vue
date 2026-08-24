<template>
  <view class="page">
    <!-- 方案详情 -->
    <view class="card hero">
      <view class="hero-name">{{ plan.name }}</view>
      <view class="hero-motto">{{ plan.motto }}</view>
      <view class="hero-desc">{{ plan.desc }}</view>
      <view class="meta-row">
        <view :class="['meta-chip', 'chip-' + plan.safety]">{{ safetyLabel }}</view>
        <view class="meta-chip">约 3 分钟</view>
      </view>
    </view>

    <!-- 安全红绿灯（合规红线 3） -->
    <view class="card">
      <view class="section-title">安全红绿灯 · 请留意</view>
      <view v-for="item in plan.contraindications" :key="item" class="contra">
        <text class="contra-icon">⚠️</text>
        <text>{{ item }}</text>
      </view>
    </view>

    <!-- 仪式流程 -->
    <view class="card">
      <view class="section-title">仪式流程</view>
      <view class="phase-line">
        <text class="phase-dot">壹</text>
        <text class="phase-text">调息 1 分钟 · {{ plan.phases.breathe }}</text>
      </view>
      <view class="phase-line">
        <text class="phase-dot">贰</text>
        <text class="phase-text">动作 1.5 分钟 · {{ stepCount }} 个步骤</text>
      </view>
      <view class="phase-line">
        <text class="phase-dot">叁</text>
        <text class="phase-text">收尾 30 秒 · {{ plan.phases.ending }}</text>
      </view>
    </view>

    <!-- 操作 -->
    <view class="actions">
      <view class="btn-ghost btn-swap" @tap="goBack">换一个方案</view>
      <view class="btn-primary btn-start" @tap="start">开始 3 分钟仪式</view>
    </view>

    <!-- 常驻免责提示条（不可隐藏） -->
    <disclaimer-bar mode="bar" />
  </view>
</template>

<script setup lang="ts">
/**
 * 准备页 · 方案确认
 * 展示方案详情、安全红绿灯（禁忌）与仪式流程，底部常驻免责提示条。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { REMEDIES } from '../../data/remedies'
import { DISCLAIMER } from '../../data/compliance'

const SAFETY_LABELS: Record<string, string> = {
  green: '绿灯 · 放心进行',
  yellow: '黄灯 · 请留意禁忌',
  red: '红灯 · 暂不建议'
}

const plan = ref<any>(null)
const safetyLabel = ref('')
const stepCount = ref(0)
const disclaimer = DISCLAIMER

onLoad((options: any) => {
  const p = REMEDIES.find((x) => x.id === options.id)
  if (!p) {
    uni.navigateBack()
    return
  }
  plan.value = p
  safetyLabel.value = SAFETY_LABELS[p.safety]
  stepCount.value = p.phases.steps.length
})

function start() {
  uni.navigateTo({ url: '/pages/player/player?id=' + plan.value.id })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  padding-bottom: 48rpx;
}

/* 方案详情 */
.hero {
  background: linear-gradient(135deg, #EDF4EA, #FFFDF7 55%);
}
.hero-name {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-bamboo-deep);
}
.hero-motto {
  font-size: 28rpx;
  color: var(--c-ginger);
  margin: 8rpx 0 16rpx;
}
.hero-desc {
  font-size: 26rpx;
  color: var(--c-ink-soft);
}
.meta-row {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.meta-chip {
  font-size: 22rpx;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: #F1EEE3;
  color: var(--c-ink-soft);
}
.chip-green {
  background: rgba(111, 191, 142, 0.18);
  color: #2E7A4E;
}
.chip-yellow {
  background: rgba(232, 184, 75, 0.2);
  color: #9A7320;
}
.chip-red {
  background: rgba(217, 106, 90, 0.18);
  color: #A84234;
}

/* 禁忌 */
.contra {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  font-size: 26rpx;
  color: var(--c-ink);
  padding: 10rpx 0;
}
.contra-icon {
  font-size: 24rpx;
  line-height: 1.7;
}

/* 流程 */
.phase-line {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 0;
}
.phase-dot {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  background: var(--c-bamboo-light);
  color: var(--c-bamboo-deep);
  border-radius: 50%;
  font-size: 22rpx;
  flex-shrink: 0;
}
.phase-text {
  flex: 1;
  font-size: 26rpx;
  color: var(--c-ink-soft);
  padding-top: 6rpx;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 20rpx;
  margin: 24rpx 32rpx 8rpx;
}
.btn-swap {
  flex: 1;
}
.btn-start {
  flex: 2;
}
</style>
