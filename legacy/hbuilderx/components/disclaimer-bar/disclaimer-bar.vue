<template>
  <view v-if="mode === 'bar'" class="bar">
    <text class="bar-icon">i</text>
    <text class="bar-text">{{ text }}</text>
  </view>

  <view v-if="mode === 'splash'" class="splash">
    <view class="splash-mask"></view>
    <view class="splash-card">
      <view class="splash-icon">须知</view>
      <view class="splash-title">使用小青囊前</view>
      <text class="splash-text">{{ fullText }}</text>
      <view class="splash-btn" @tap="onConfirm">我已了解</view>
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
.bar {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  background: #F0F2F0;
  border-radius: 18rpx;
  padding: 20rpx 24rpx;
  margin: 8rpx 32rpx 40rpx;
}
.bar-icon {
  width: 30rpx;
  height: 30rpx;
  line-height: 30rpx;
  margin-top: 3rpx;
  text-align: center;
  border: 2rpx solid var(--c-ink-faint);
  border-radius: 50%;
  font-size: 18rpx;
  color: var(--c-ink-soft);
}
.bar-text {
  flex: 1;
  font-size: 22rpx;
  color: var(--c-ink-soft);
  line-height: 1.6;
}

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
  background: rgba(20, 31, 25, 0.52);
}
.splash-card {
  position: relative;
  width: 620rpx;
  background: #FFFFFF;
  border-radius: 34rpx;
  padding: 56rpx 48rpx 48rpx;
  text-align: center;
  box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, 0.25);
}
.splash-icon {
  width: 78rpx;
  height: 78rpx;
  line-height: 78rpx;
  margin: 0 auto 22rpx;
  border-radius: 50%;
  background: var(--c-green-soft);
  font-size: 21rpx;
  font-weight: 700;
  color: var(--c-bamboo);
}
.splash-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 24rpx;
}
.splash-text {
  display: block;
  text-align: left;
  font-size: 26rpx;
  color: var(--c-ink-soft);
  line-height: 1.8;
  margin-bottom: 40rpx;
  white-space: pre-line;
}
.splash-btn {
  background: var(--c-ink);
  color: #ffffff;
  border-radius: 48rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
}
</style>
<style scoped>
/* xqn-warm-candy */
.bar{border-radius:24rpx;background:#FFF0DC}.bar-icon{border-color:#9A6A48;color:#8A5D3F}.bar-text{color:#765B49}.splash-mask{background:rgba(46,39,34,.48)}.splash-card{border-radius:42rpx;background:var(--c-candy-cream)}.splash-icon{background:var(--c-candy-yellow);color:#6D5723}.splash-btn{border-radius:999rpx;background:var(--c-candy-green)}
</style>
<style scoped>
/* xqn-interaction-system */
.splash-card{animation:warmNoticeIn var(--motion-enter) var(--ease-soft) both}.splash-btn{transition:transform var(--motion-press) ease}.splash-btn:active{transform:scale(.98)}
@keyframes warmNoticeIn{from{opacity:0;transform:translateY(22rpx) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.splash-card,.splash-btn{animation:none!important;transition:none!important}}
</style>
