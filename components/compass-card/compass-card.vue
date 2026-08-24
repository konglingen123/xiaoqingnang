<template>
  <view class="compass">
    <view class="ring"></view>

    <!-- 8 个体感扇区 -->
    <view
      v-for="seg in segs"
      :key="seg.id"
      class="seg"
      :style="{ transform: `rotate(${seg.angle}deg) translateY(-${radiusPx}px)` }"
      @tap="onSelect(seg.id)"
    >
      <view
        :class="['seg-inner', selected === seg.id ? 'on' : '']"
        :style="{ transform: `rotate(${-seg.angle}deg)` }"
      >
        <text class="seg-emoji">{{ seg.emoji }}</text>
        <text class="seg-name">{{ seg.name }}</text>
      </view>
    </view>

    <!-- 圆心：已选体感 / 听罗盘的 -->
    <view class="center" @tap="onRandom">
      <template v-if="selectedItem">
        <text class="center-emoji">{{ selectedItem.emoji }}</text>
        <text class="center-name">{{ selectedItem.name }}</text>
        <text class="center-hint">点此换一个</text>
      </template>
      <template v-else>
        <text class="center-name">听罗盘</text>
        <text class="center-hint">替我选一种感觉</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 罗盘卡片（体感直觉卡片的核心交互）
 * 8 种体感均匀分布在圆环上，点选即命中；圆心可"听罗盘的"随机选择。
 */
import { computed } from 'vue'
import { FEELINGS } from '../../data/feelings'
import { upx } from '../../utils/upx'

const props = defineProps({
  feelings: { type: Array, default: () => FEELINGS },
  selected: { type: String, default: '' }
})
const emit = defineEmits(['select', 'random'])

// 注意：动态 style 绑定中的 rpx 在 H5 不生效，统一经 upx 转 px
const radiusPx = upx(185)

const segs = computed(() => {
  const list = (props.feelings as any[]) || []
  const n = list.length
  return list.map((f, i) => ({ ...f, angle: (i * 360) / n - 90 }))
})

const selectedItem = computed(
  () => ((props.feelings as any[]) || []).find((x: any) => x.id === props.selected) || null
)

function onSelect(id: string) {
  emit('select', { id })
}

function onRandom() {
  const list = segs.value
  if (!list.length) return
  const pick = list[Math.floor(Math.random() * list.length)]
  emit('random', { id: pick.id })
}
</script>

<style scoped>
.compass {
  position: relative;
  width: 480rpx;
  height: 480rpx;
  margin: 32rpx auto 24rpx;
}

.ring {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  right: 8rpx;
  bottom: 8rpx;
  border: 2rpx dashed #C9DCCB;
  border-radius: 50%;
}

/* 体感扇区：先旋转到角度，再沿自身轴向平移出半径 */
.seg {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 128rpx;
  height: 128rpx;
  margin: -64rpx 0 0 -64rpx;
  z-index: 2;
}
.seg-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #FFFDF7;
  border: 2rpx solid #EFEAD9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.seg-inner.on {
  background: #4E7A5E;
  border-color: #4E7A5E;
  box-shadow: 0 10rpx 28rpx rgba(78, 122, 94, 0.4);
}
.seg-emoji {
  font-size: 30rpx;
  line-height: 1.1;
}
.seg-name {
  font-size: 20rpx;
  color: #5C6A62;
  margin-top: 2rpx;
}
.seg-inner.on .seg-name {
  color: #ffffff;
}

/* 圆心 */
.center {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220rpx;
  height: 220rpx;
  margin: -110rpx 0 0 -110rpx;
  border-radius: 50%;
  background: #FDFBF5;
  border: 2rpx solid #E4E0D2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 3;
}
.center-emoji {
  font-size: 44rpx;
  line-height: 1.1;
}
.center-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #33413A;
  margin-top: 6rpx;
}
.center-hint {
  font-size: 20rpx;
  color: #9AA69E;
  margin-top: 4rpx;
}
</style>
