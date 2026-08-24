<template>
  <view class="battery">
    <view class="battery-head">
      <text class="battery-title">🌱 身体蓄电 · 今日</text>
      <text class="battery-value">{{ value }}%</text>
    </view>
    <view class="battery-track">
      <view
        v-for="(n, i) in segs"
        :key="n"
        :class="['battery-seg', i < fillCount ? 'on' : '']"
      ></view>
    </view>
    <view class="battery-hint">{{ hint }}</view>
  </view>
</template>

<script setup lang="ts">
/**
 * 身体蓄电条（游戏化引擎）
 * 10 节竹节，每节代表 10 点电量；完成自愈仪式 +10，满格 100，每日重置、只涨不掉。
 */
import { computed } from 'vue'
import { BATTERY_MAX } from '../../utils/checkin'

const props = defineProps({
  value: { type: Number, default: 0 }
})

const segs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const clamped = computed(() => Math.max(0, Math.min(BATTERY_MAX, props.value || 0)))
const fillCount = computed(() => Math.round(clamped.value / 10))
const hint = computed(() =>
  clamped.value >= BATTERY_MAX ? '今日满格，元气满满 ✨' : '每完成一次自愈仪式 +10'
)
</script>

<style scoped>
.battery {
  background: #FFFDF7;
  border-radius: 28rpx;
  padding: 32rpx 36rpx;
  margin: 24rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(51, 65, 58, 0.07);
}

.battery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.battery-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #33413A;
}
.battery-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #4E7A5E;
}

.battery-track {
  display: flex;
  gap: 8rpx;
}
.battery-seg {
  flex: 1;
  height: 36rpx;
  border-radius: 10rpx;
  background: #EAE6D9;
  transition: background 0.4s ease;
}
.battery-seg.on {
  background: linear-gradient(180deg, #8FBF9F, #4E7A5E);
}

.battery-hint {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #9AA69E;
  text-align: right;
}
</style>
