<template>
  <!-- 常驻免责提示条（方案页底部） -->
  <view v-if="mode === 'bar'" class="bar">
    <text class="bar-icon">⚠️</text>
    <text class="bar-text">{{ text }}</text>
  </view>

  <!-- 开屏提示（全屏覆盖，需确认） -->
  <view v-if="mode === 'splash'" class="splash">
    <view class="splash-mask"></view>
    <view class="splash-card">
      <view class="splash-icon">🌿</view>
      <view class="splash-title">小青囊 · 使用须知</view>
      <text class="splash-text">{{ fullText }}</text>
      <view class="splash-btn" @tap="onConfirm">我已了解，进入</view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 免责声明条（合规红线 2）
 * mode='bar'：方案页底部常驻提示，不可隐藏、无关闭按钮
 * mode='splash'：开屏全屏提示，需点击"我已了解"确认后进入
 */
import { DISCLAIMER, DISCLAIMER_FULL } from '../../data/compliance'

defineProps({
  mode: { type: String, default: 'bar' },
  text: { type: String, default: DISCLAIMER }
})
const emit = defineEmits(['confirm'])

const fullText = DISCLAIMER_FULL

function onConfirm() {
  emit('confirm')
}
</script>

<style scoped>
/* 底部常驻条 */
.bar {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  background: #FBF3DC;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin: 8rpx 32rpx 40rpx;
}
.bar-icon {
  font-size: 24rpx;
  line-height: 1.6;
}
.bar-text {
  flex: 1;
  font-size: 22rpx;
  color: #8A7A4F;
  line-height: 1.6;
}

/* 开屏全屏 */
.splash {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.splash-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(47, 79, 60, 0.62);
}
.splash-card {
  position: relative;
  width: 620rpx;
  background: #FFFDF7;
  border-radius: 32rpx;
  padding: 56rpx 48rpx 48rpx;
  text-align: center;
  box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, 0.25);
}
.splash-icon {
  font-size: 72rpx;
  margin-bottom: 16rpx;
}
.splash-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #33413A;
  margin-bottom: 24rpx;
}
.splash-text {
  display: block;
  text-align: left;
  font-size: 26rpx;
  color: #5C6A62;
  line-height: 1.8;
  margin-bottom: 40rpx;
  white-space: pre-line;
}
.splash-btn {
  background: #4E7A5E;
  color: #ffffff;
  border-radius: 48rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
}
</style>
