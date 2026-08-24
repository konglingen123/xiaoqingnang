<template>
  <view class="page">
    <!-- 关于 -->
    <view class="card about">
      <view class="about-icon">🌿</view>
      <view class="about-name">小青囊</view>
      <view class="about-version">v{{ version }} · 轻养生自愈小工具</view>
      <view class="about-desc">当身体发出小小的不适信号，给你一个 3 分钟的温柔回应。</view>
    </view>

    <!-- 免责声明全文 -->
    <view class="card">
      <view class="section-title">免责声明</view>
      <text class="disclaimer-text">{{ disclaimerFull }}</text>
    </view>

    <!-- 数据 -->
    <view class="card">
      <view class="section-title">数据</view>
      <view class="row">
        <view>
          <view class="row-title">本地数据</view>
          <view class="row-desc">档案与打卡记录保存在本机（第一版）</view>
        </view>
        <view class="clear-btn" @tap="onClear">清除数据</view>
      </view>
      <view class="note">后续版本将支持云端同步，换设备不丢失。</view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 锦囊页（Tab 3）· 工具
 * 关于、免责声明全文、数据管理。
 */
import { DISCLAIMER_FULL } from '../../data/compliance'
import { clearAll } from '../../utils/storage'

const disclaimerFull = DISCLAIMER_FULL
const version = '0.1.0'

function onClear() {
  uni.showModal({
    title: '清除本地数据',
    content: '将清除身体档案与全部打卡记录，且无法恢复。',
    confirmText: '清除',
    confirmColor: '#D96A5A',
    success: (r: any) => {
      if (r.confirm) {
        clearAll()
        uni.showToast({ title: '已清除', icon: 'success' })
      }
    }
  })
}
</script>

<style scoped>
.page {
  padding: 32rpx 0 48rpx;
}

/* 关于 */
.about {
  text-align: center;
  background: linear-gradient(135deg, #EDF4EA, #FFFDF7 60%);
}
.about-icon {
  font-size: 72rpx;
}
.about-name {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--c-bamboo-deep);
  margin-top: 8rpx;
}
.about-version {
  font-size: 22rpx;
  color: var(--c-ink-soft);
  margin-top: 4rpx;
}
.about-desc {
  font-size: 26rpx;
  color: var(--c-ink-soft);
  margin-top: 20rpx;
  line-height: 1.8;
}

/* 免责声明 */
.disclaimer-text {
  display: block;
  font-size: 24rpx;
  color: var(--c-ink-soft);
  line-height: 1.9;
  white-space: pre-line;
}

/* 数据 */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.row-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--c-ink);
}
.row-desc {
  font-size: 22rpx;
  color: var(--c-ink-soft);
  margin-top: 4rpx;
}
.clear-btn {
  font-size: 24rpx;
  color: var(--c-red);
  border: 2rpx solid var(--c-red);
  border-radius: 999rpx;
  padding: 10rpx 28rpx;
}
.note {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: var(--c-ink-soft);
}
</style>
