<template>
  <view class="player">
    <!-- 倒计时 -->
    <view v-if="state === 'count'" class="count-wrap">
      <view class="count-num">{{ countLeft }}</view>
      <view class="count-hint">找一个舒服的姿势，仪式马上开始</view>
    </view>

    <!-- 仪式进行中 -->
    <template v-if="state === 'run'">
      <view class="plan-name">{{ plan.name }}</view>

      <view class="progress">
        <view class="progress-in" :style="{ width: progress + '%' }"></view>
      </view>
      <view class="phase-indicator">{{ phaseName }} · 还剩 {{ phaseLeft }} 秒</view>

      <!-- 壹 · 调息（呼吸动画） -->
      <view v-if="phaseIndex === 0" class="phase-body">
        <view class="breath-circle">
          <view class="breath-core">吸 · 呼</view>
        </view>
        <view class="guide-text">{{ plan.phases.breathe }}</view>
      </view>

      <!-- 贰 · 动作（步骤自动推进） -->
      <view v-if="phaseIndex === 1" class="phase-body">
        <view class="step-card">
          <view class="step-no">第 {{ stepIndex + 1 }} 步</view>
          <view class="step-title">{{ step.title }}</view>
          <view class="step-detail">{{ step.detail }}</view>
        </view>
        <view class="step-dots">
          <text
            v-for="(s, i) in plan.phases.steps"
            :key="s.title"
            :class="['step-dot', i <= stepIndex ? 'on' : '']"
          ></text>
        </view>
      </view>

      <!-- 叁 · 收尾 -->
      <view v-if="phaseIndex === 2" class="phase-body">
        <view class="ending-leaf">🍃</view>
        <view class="guide-text">{{ plan.phases.ending }}</view>
      </view>

      <view class="skip" @tap="onSkip">提前结束</view>
    </template>

    <!-- 仪式完成 · 体感自评 -->
    <template v-if="state === 'finish'">
      <view class="finish-title">仪式完成 🎋</view>
      <view class="finish-sub">问问自己：此刻身体感觉如何？</view>
      <view class="after-options">
        <view
          v-for="(opt, i) in afterOptions"
          :key="opt.label"
          class="after-opt"
          @tap="onPickAfter(i)"
        >{{ opt.label }}</view>
      </view>
    </template>

    <!-- 打卡结果 -->
    <template v-if="state === 'result'">
      <view class="finish-title">今日蓄电 +10</view>
      <view class="result-battery">当前电量 {{ battery }}%</view>
      <view class="result-leaf">{{ fullTip }}</view>
      <view class="btn-row">
        <view class="btn-ghost-dark" @tap="goHome">回到首页</view>
        <view class="btn-primary" @tap="goProfile">看看档案</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 播放器页 · 3 分钟自愈仪式（沉浸陪伴感的核心）
 * 结构：倒计时 3 秒 → 调息 60s（呼吸动画）→ 动作 90s（步骤自动推进）→ 收尾 30s → 打卡。
 * 第一版以视觉引导为主（无音视频素材），阶段切换轻振动；素材接口后续补充。
 */
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { REMEDIES } from '../../data/remedies'
import { addCheckin } from '../../utils/checkin'

const TOTAL = 180
const PHASE_NAMES = ['调息', '自愈动作', '收尾']
const PHASE_ENDS = [60, 150, 180] // 各阶段结束秒数

const plan = ref<any>(null)
const state = ref('count') // count | run | finish | result
const countLeft = ref(3)
const elapsed = ref(0)
const progress = ref(0)
const phaseIndex = ref(0)
const phaseName = ref(PHASE_NAMES[0])
const phaseLeft = ref(60)
const stepIndex = ref(0)
const step = ref<any>(null)
const stepDur = ref(30)
const afterOptions = [
  { label: '舒缓多了' },
  { label: '有点变化' },
  { label: '还没感觉' }
]
const battery = ref(0)
const fullTip = ref('')

let timer: any = null

function vibrate() {
  try {
    uni.vibrateShort({ type: 'light' })
  } catch (e) {
    /* 模拟器无振动，忽略 */
  }
}

onLoad((options: any) => {
  const p = REMEDIES.find((x) => x.id === options.id)
  if (!p) {
    uni.navigateBack()
    return
  }
  plan.value = p
  stepDur.value = Math.max(15, Math.floor(90 / p.phases.steps.length))
  step.value = p.phases.steps[0]
  timer = setInterval(tick, 1000)
})

function tick() {
  if (state.value === 'count') {
    const left = countLeft.value - 1
    if (left <= 0) {
      state.value = 'run'
      vibrate()
    } else {
      countLeft.value = left
    }
    return
  }
  if (state.value !== 'run') return

  const e = elapsed.value + 1
  const nextPhase = e < 60 ? 0 : e < 150 ? 1 : 2
  if (nextPhase !== phaseIndex.value) vibrate()

  elapsed.value = e
  progress.value = Math.floor((e / TOTAL) * 100)
  phaseIndex.value = nextPhase
  phaseName.value = PHASE_NAMES[nextPhase]
  phaseLeft.value = PHASE_ENDS[nextPhase] - e

  if (nextPhase === 1) {
    const idx = Math.min(
      plan.value.phases.steps.length - 1,
      Math.floor((e - 60) / stepDur.value)
    )
    stepIndex.value = idx
    step.value = plan.value.phases.steps[idx]
  }

  if (e >= TOTAL) {
    state.value = 'finish'
    progress.value = 100
  }
}

function onSkip() {
  uni.showModal({
    title: '提前结束',
    content: '今天先到这里，也算一次温柔的照顾。要结束并打卡吗？',
    confirmText: '结束并打卡',
    cancelText: '继续',
    success: (r: any) => {
      if (r.confirm) state.value = 'finish'
    }
  })
}

function onPickAfter(i: number) {
  const after = afterOptions[i].label
  const res = addCheckin(plan.value.id, plan.value.name, after)
  battery.value = res.battery
  fullTip.value = res.reached ? '今日满格，元气满满 ✨' : '今日竹叶已点亮 🍃'
  state.value = 'result'
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goProfile() {
  uni.switchTab({ url: '/pages/profile/profile' })
}

onUnload(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
/* 沉浸式深色场景 */
.player {
  min-height: 100vh;
  background: #26382D;
  padding: 80rpx 48rpx 60rpx;
  display: flex;
  flex-direction: column;
}

/* 倒计时 */
.count-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.count-num {
  font-size: 160rpx;
  font-weight: 200;
  color: #C9DEC9;
  animation: countPulse 1s ease-in-out infinite;
}
@keyframes countPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.92); }
}
.count-hint {
  font-size: 26rpx;
  color: #9DB8A6;
  margin-top: 24rpx;
}

/* 进行中 */
.plan-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #F2F7F0;
  text-align: center;
  margin-bottom: 40rpx;
}
.progress {
  height: 8rpx;
  background: rgba(234, 242, 234, 0.15);
  border-radius: 999rpx;
  overflow: hidden;
}
.progress-in {
  height: 100%;
  background: linear-gradient(90deg, #8FBF9F, #C9DEC9);
  border-radius: 999rpx;
  transition: width 1s linear;
}
.phase-indicator {
  text-align: center;
  font-size: 24rpx;
  color: #9DB8A6;
  margin-top: 16rpx;
}

.phase-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
}

/* 呼吸动画 */
.breath-circle {
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(234, 242, 234, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: breathe 8s ease-in-out infinite;
}
.breath-core {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: rgba(185, 212, 188, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #C9DEC9;
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.16); }
}

/* 步骤卡 */
.step-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 2rpx solid rgba(234, 242, 234, 0.15);
  border-radius: 32rpx;
  padding: 56rpx 48rpx;
  text-align: center;
}
.step-no {
  font-size: 22rpx;
  color: #9DB8A6;
  letter-spacing: 4rpx;
}
.step-title {
  font-size: 44rpx;
  font-weight: 600;
  color: #F2F7F0;
  margin: 20rpx 0;
}
.step-detail {
  font-size: 28rpx;
  color: #C9DEC9;
  line-height: 1.8;
}
.step-dots {
  display: flex;
  gap: 16rpx;
  margin-top: 40rpx;
}
.step-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: rgba(234, 242, 234, 0.25);
  transition: background 0.3s ease;
}
.step-dot.on {
  background: #C9DEC9;
}

.guide-text {
  font-size: 30rpx;
  color: #C9DEC9;
  text-align: center;
  line-height: 1.9;
  max-width: 560rpx;
  margin-top: 40rpx;
}

.ending-leaf {
  font-size: 100rpx;
  margin-bottom: 32rpx;
  animation: leafSway 3s ease-in-out infinite;
}
@keyframes leafSway {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
}

.skip {
  text-align: center;
  font-size: 24rpx;
  color: #7E9A88;
  padding: 24rpx 0;
}

/* 完成与结果 */
.finish-title {
  font-size: 48rpx;
  font-weight: 600;
  color: #F2F7F0;
  text-align: center;
  margin-top: 160rpx;
}
.finish-sub {
  font-size: 28rpx;
  color: #C9DEC9;
  text-align: center;
  margin-top: 24rpx;
}
.after-options {
  margin-top: 64rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.after-opt {
  background: rgba(255, 255, 255, 0.07);
  border: 2rpx solid rgba(234, 242, 234, 0.25);
  color: #EAF2EA;
  text-align: center;
  border-radius: 48rpx;
  padding: 28rpx 0;
  font-size: 32rpx;
}

.result-battery {
  font-size: 64rpx;
  font-weight: 700;
  color: #C9DEC9;
  text-align: center;
  margin-top: 40rpx;
}
.result-leaf {
  font-size: 28rpx;
  color: #9DB8A6;
  text-align: center;
  margin-top: 16rpx;
}
.btn-row {
  display: flex;
  gap: 24rpx;
  margin-top: 80rpx;
}
.btn-row .btn-primary,
.btn-row .btn-ghost-dark {
  flex: 1;
}
.btn-ghost-dark {
  border: 2rpx solid rgba(234, 242, 234, 0.4);
  color: #EAF2EA;
  text-align: center;
  border-radius: 48rpx;
  padding: 22rpx 0;
  font-size: 30rpx;
  background: transparent;
}
</style>
