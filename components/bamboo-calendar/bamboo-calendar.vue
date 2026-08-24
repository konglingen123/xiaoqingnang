<template>
  <view class="cal">
    <view class="cal-head">
      <view class="cal-nav" @tap="prev">‹</view>
      <view class="cal-title">{{ title }}</view>
      <view :class="['cal-nav', canNext ? '' : 'dis']" @tap="next">›</view>
    </view>

    <view class="cal-week">
      <text v-for="w in weekNames" :key="w" class="cal-week-name">{{ w }}</text>
    </view>

    <view class="cal-grid">
      <view v-for="(week, wi) in weeks" :key="wi" class="cal-row">
        <view v-for="(cell, ci) in week" :key="ci" class="cal-cell">
          <template v-if="cell">
            <text v-if="cell.checked" class="leaf">🍃</text>
            <text v-else :class="['day', cell.isToday ? 'today' : '']">{{ cell.d }}</text>
          </template>
        </view>
      </view>
    </view>

    <view class="cal-legend">🍃 完成一次 3 分钟自愈仪式，点亮一片竹叶</view>
  </view>
</template>

<script setup lang="ts">
/**
 * 竹叶日历（游戏化引擎 · 长期沉淀）
 * 月历视图：完成自愈仪式的日子点亮一片竹叶 🍃，只可回看，不可翻到未来。
 */
import { ref, computed } from 'vue'
import { pad2, todayKey } from '../../utils/date'

const props = defineProps({
  records: { type: Array, default: () => [] }
})

const weekNames = ['一', '二', '三', '四', '五', '六', '日']
const now = new Date()
const cursor = ref({ y: now.getFullYear(), m: now.getMonth() })

const title = computed(() => `${cursor.value.y} 年 ${cursor.value.m + 1} 月`)

const canNext = computed(() => {
  const today = new Date()
  return (
    cursor.value.y < today.getFullYear() ||
    (cursor.value.y === today.getFullYear() && cursor.value.m < today.getMonth())
  )
})

const checkedSet = computed(() => {
  const set: Record<string, boolean> = {}
  ;(props.records as any[]).forEach((r) => {
    if (r && r.date) set[r.date] = true
  })
  return set
})

const weeks = computed(() => {
  const { y, m } = cursor.value
  const todayStr = todayKey()
  const startWeekday = (new Date(y, m, 1).getDay() + 6) % 7 // 周一 = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  const cells: any[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${pad2(m + 1)}-${pad2(d)}`
    cells.push({
      d,
      key,
      checked: !!checkedSet.value[key],
      isToday: key === todayStr
    })
  }

  const result: any[][] = []
  for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
  return result
})

function prev() {
  const { y, m } = cursor.value
  cursor.value = { y: m === 0 ? y - 1 : y, m: m === 0 ? 11 : m - 1 }
}

function next() {
  if (!canNext.value) return
  const { y, m } = cursor.value
  cursor.value = { y: m === 11 ? y + 1 : y, m: m === 11 ? 0 : m + 1 }
}
</script>

<style scoped>
.cal {
  width: 100%;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.cal-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #33413A;
}
.cal-nav {
  width: 56rpx;
  height: 56rpx;
  line-height: 50rpx;
  text-align: center;
  font-size: 36rpx;
  color: #4E7A5E;
  border: 2rpx solid #E8E3D3;
  border-radius: 50%;
  background: #FFFDF7;
}
.cal-nav.dis {
  color: #D5D2C4;
}

.cal-week {
  display: flex;
  margin-bottom: 8rpx;
}
.cal-week-name {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  color: #9AA69E;
}

.cal-row {
  display: flex;
}
.cal-cell {
  flex: 1;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.day {
  width: 60rpx;
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  font-size: 24rpx;
  color: #5C6A62;
  border-radius: 50%;
}
.day.today {
  border: 2rpx solid #4E7A5E;
  color: #4E7A5E;
  font-weight: 600;
}
.leaf {
  font-size: 34rpx;
  line-height: 1;
}

.cal-legend {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #9AA69E;
  text-align: center;
}
</style>
