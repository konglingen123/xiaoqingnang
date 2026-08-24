<template>
  <view class="page">
    <!-- 部位头部 -->
    <view class="card hero">
      <view class="hero-name">{{ area ? area.name : '' }}</view>
      <view class="hero-sub">{{ area ? area.subtitle : '' }}</view>
    </view>

    <!-- 空部位提示（该部位暂无专属方案，仅展示全身兜底时） -->
    <view v-if="ownCount === 0" class="card empty">
      <view class="empty-title">这个部位的方案正在路上 🌱</view>
      <view class="empty-desc">先试试这些全身放松的小仪式</view>
    </view>

    <!-- 方案列表：部位方案在前，全身通用兜底在后 -->
    <template v-if="plans.length">
      <view class="section-title standalone">舒缓方案</view>
      <view
        v-for="(item, index) in plans"
        :key="item.id"
        :class="['card', 'plan-card', index === 0 && ownCount > 0 ? 'plan-top' : '']"
        @tap="goPrepare(item.id)"
      >
        <view class="plan-name">
          <text>{{ item.name }}</text>
          <text v-if="index === 0 && ownCount > 0" class="tag">最常用</text>
        </view>
        <view class="plan-motto">{{ item.motto }}</view>
        <view class="plan-meta">
          <text :class="['dot', 'dot-' + item.safety]"></text>
          <text>{{ item.categoriesText }}</text>
          <text class="plan-go">开始 ›</text>
        </view>
      </view>
    </template>

    <!-- 常驻免责提示条（不可隐藏） -->
    <disclaimer-bar mode="bar" />
  </view>
</template>

<script setup lang="ts">
/**
 * 部位方案页 · 人体图热区点击后的落地页
 * 该部位方案在前（最常用优先 = 方案库策展顺序），全身通用方案兜底在后；
 * 部位暂无专属方案时显示「正在路上」提示 + 全身兜底。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { AREAS } from '../../data/areas'
import { REMEDIES } from '../../data/remedies'
import { sortForArea } from '../../utils/recommend'

const area = ref<any>(null)
const plans = ref<any[]>([])
const ownCount = ref(0)

function decorate(p: any) {
  return { ...p, categoriesText: p.categories.join(' · ') }
}

onLoad((options: any) => {
  const a = AREAS.find((x) => x.id === options.id)
  if (!a) {
    uni.navigateBack()
    return
  }
  area.value = a
  ownCount.value = REMEDIES.filter((p) => p.areas.indexOf(a.id) >= 0).length
  plans.value = sortForArea(REMEDIES, a.id).map(decorate)
  uni.setNavigationBarTitle({ title: a.name })
})

function goPrepare(id: string) {
  uni.navigateTo({ url: '/pages/prepare/prepare?id=' + id })
}
</script>

<style scoped>
.page {
  padding-bottom: 48rpx;
}

/* 部位头部 */
.hero {
  background: linear-gradient(135deg, #EDF4EA, #FFFDF7 55%);
}
.hero-name {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-bamboo-deep);
}
.hero-sub {
  font-size: 26rpx;
  color: var(--c-ink-soft);
  margin-top: 8rpx;
}

/* 空部位提示 */
.empty {
  background: linear-gradient(135deg, #F0F6EC, #FFFDF7);
  border: 2rpx dashed var(--c-bamboo-light);
  text-align: center;
}
.empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-ink);
}
.empty-desc {
  font-size: 24rpx;
  color: var(--c-ink-soft);
  margin-top: 8rpx;
}

/* 方案列表 */
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
</style>
