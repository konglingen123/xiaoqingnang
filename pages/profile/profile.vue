<template>
  <view class="page">
    <!-- 轻量无痛建档：3 个生活化问题 -->
    <template v-if="onboarding">
      <view class="card q-card">
        <view class="q-progress">第 {{ qIndex + 1 }} / 3 问</view>
        <view class="q-text">{{ question.text }}</view>
        <view class="q-options">
          <view
            v-for="(opt, i) in question.options"
            :key="opt.label"
            class="q-option"
            @tap="onAnswer(i)"
          >{{ opt.label }}</view>
        </view>
        <view class="q-note">只需 30 秒，帮小青囊更懂你的身体</view>
      </view>
    </template>

    <!-- 已建档：身体说明书 -->
    <template v-else>
      <view class="card manual">
        <view class="manual-top">
          <view>
            <view class="manual-name">{{ constitution.name }}</view>
            <view class="manual-motto">{{ constitution.motto }}</view>
          </view>
          <view class="renew" @tap="onRenew">重新填写</view>
        </view>
        <view class="manual-desc">{{ constitution.desc }}</view>
      </view>

      <!-- 蓄电条 -->
      <battery-bar :value="battery" />

      <!-- 竹叶日历 -->
      <view class="card">
        <view class="section-title">竹叶日历</view>
        <bamboo-calendar :records="records" />
      </view>

      <!-- 数据统计 -->
      <view class="card stats">
        <view class="stat">
          <view class="stat-num">{{ totalCount }}</view>
          <view class="stat-label">累计自愈（次）</view>
        </view>
        <view class="stat-divider"></view>
        <view class="stat">
          <view class="stat-num">{{ monthCount }}</view>
          <view class="stat-label">本月点亮（天）</view>
        </view>
      </view>

      <!-- 最近记录 -->
      <view class="card" v-if="recent.length">
        <view class="section-title">最近记录</view>
        <view v-for="r in recent" :key="r.ts" class="record">
          <text class="record-name">{{ r.planName }}</text>
          <text class="record-meta">{{ r.date }} · {{ r.after }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 档案页（Tab 2）· 私人健康档案
 * 未建档：3 个生活化问题（轻量无痛建档）→ 打分 → 去医疗化体质
 * 已建档：身体说明书 + 蓄电条 + 竹叶日历 + 打卡记录
 */
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ONBOARD_QUESTIONS } from '../../data/questionnaire'
import { CONSTITUTIONS } from '../../data/constitution'
import { getProfile, saveProfile, removeProfile, getCheckins } from '../../utils/storage'
import { scoreConstitution } from '../../utils/constitution'
import { getBattery } from '../../utils/checkin'
import { todayKey } from '../../utils/date'

const onboarding = ref(true)
const qIndex = ref(0)
const question = ref<any>(ONBOARD_QUESTIONS[0])
const answers = ref<number[]>([])
const profile = ref<any>(null)
const constitution = ref<any>(null)
const records = ref<any[]>([])
const recent = ref<any[]>([])
const battery = ref(0)
const totalCount = ref(0)
const monthCount = ref(0)

function refresh() {
  const p = getProfile()
  if (!p) {
    onboarding.value = true
    qIndex.value = 0
    answers.value = []
    question.value = ONBOARD_QUESTIONS[0]
    return
  }
  const list = getCheckins()
  const ym = todayKey().slice(0, 7)
  const monthDays: Record<string, boolean> = {}
  list.forEach((r) => {
    if (r.date.indexOf(ym) === 0) monthDays[r.date] = true
  })
  onboarding.value = false
  profile.value = p
  constitution.value = CONSTITUTIONS[p.constitutionId]
  records.value = list
  recent.value = list.slice(-5).reverse()
  battery.value = getBattery()
  totalCount.value = list.length
  monthCount.value = Object.keys(monthDays).length
}

onShow(() => {
  refresh()
})

function onAnswer(i: number) {
  const next = answers.value.concat(i)
  if (next.length < ONBOARD_QUESTIONS.length) {
    answers.value = next
    qIndex.value = next.length
    question.value = ONBOARD_QUESTIONS[next.length]
  } else {
    const constitutionId = scoreConstitution(next)
    saveProfile({ constitutionId, createdAt: todayKey(), answers: next })
    uni.showToast({ title: '身体说明书已生成', icon: 'success' })
    refresh()
  }
}

function onRenew() {
  uni.showModal({
    title: '重新填写问卷',
    content: '将重新回答 3 个问题，已有的打卡记录会保留。',
    success: (r: any) => {
      if (r.confirm) {
        removeProfile()
        refresh()
      }
    }
  })
}
</script>

<style scoped>
.page {
  padding: 32rpx 0 48rpx;
}

/* 建档问卷 */
.q-card {
  margin-top: 48rpx;
}
.q-progress {
  font-size: 22rpx;
  color: var(--c-ginger);
  letter-spacing: 2rpx;
}
.q-text {
  font-size: 40rpx;
  font-weight: 600;
  color: var(--c-ink);
  margin: 20rpx 0 48rpx;
  line-height: 1.5;
}
.q-option {
  background: #F6F3E9;
  border: 2rpx solid var(--c-line);
  border-radius: 24rpx;
  text-align: center;
  padding: 28rpx 0;
  font-size: 30rpx;
  color: var(--c-ink);
  margin-bottom: 24rpx;
}
.q-note {
  text-align: center;
  font-size: 22rpx;
  color: var(--c-ink-soft);
  margin-top: 24rpx;
}

/* 身体说明书 */
.manual {
  background: linear-gradient(135deg, #EDF4EA, #FFFDF7 60%);
}
.manual-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.manual-name {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--c-bamboo-deep);
}
.manual-motto {
  font-size: 26rpx;
  color: var(--c-ginger);
  margin-top: 6rpx;
  letter-spacing: 4rpx;
}
.renew {
  font-size: 22rpx;
  color: var(--c-ink-soft);
  border: 2rpx solid var(--c-line);
  border-radius: 999rpx;
  padding: 8rpx 22rpx;
}
.manual-desc {
  font-size: 26rpx;
  color: var(--c-ink-soft);
  margin-top: 24rpx;
  line-height: 1.8;
}

/* 统计 */
.stats {
  display: flex;
  align-items: center;
}
.stat {
  flex: 1;
  text-align: center;
}
.stat-num {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--c-bamboo);
}
.stat-label {
  font-size: 22rpx;
  color: var(--c-ink-soft);
  margin-top: 4rpx;
}
.stat-divider {
  width: 2rpx;
  height: 64rpx;
  background: var(--c-line);
}

/* 最近记录 */
.record {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 2rpx dashed #F1EEE3;
}
.record:last-child {
  border-bottom: none;
}
.record-name {
  font-size: 26rpx;
  color: var(--c-ink);
}
.record-meta {
  font-size: 22rpx;
  color: var(--c-ink-soft);
}
</style>
