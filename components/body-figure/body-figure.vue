<template>
  <view class="figure-wrap">
    <!-- 正面 / 背面切换 -->
    <view class="side-toggle">
      <view :class="['side-chip', side === 'front' ? 'on' : '']" @tap="switchSide('front')">正面</view>
      <view :class="['side-chip', side === 'back' ? 'on' : '']" @tap="switchSide('back')">背面</view>
    </view>

    <!-- 人体图 + 逐部位热区 -->
    <view class="figure" :style="{ width: figWidthPx, height: figHeightPx }">
      <image class="fig-img" :src="imgSrc" mode="aspectFit" :style="{ width: figWidthPx, height: figHeightPx }" />

      <!-- 每个部位一个独立可点击热区（近似椭圆，覆盖对应解剖区域） -->
      <view
        v-for="p in parts"
        :key="p.id"
        :class="['part-zone', selected === p.areaId ? 'active' : '']"
        :style="zoneStyle(p)"
        @tap="onTapPart(p)"
      ></view>

      <!-- 当前点中部位的名称标签 -->
      <view
        v-if="tappedPart"
        class="part-label"
        :style="labelStyle(tappedPart)"
      >{{ tappedPart.name }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 人体图组件（参考模板 SVG 人体模型，逐部位可点选）
 * 视觉：static/body/body-front.png / body-back.png（由参考 SVG 模板渲染）
 * 交互：正/背各身体部位独立点击，高亮 + 显示部位名；
 *       部位映射到产品五大分区（头颈/肩背/腹部/手足），对外仍 emit select。
 */
import { ref, computed } from 'vue'
import { upxPx } from '../../utils/upx'

const props = defineProps({
  selected: { type: String, default: '' }
})
const emit = defineEmits(['select'])

const FIG_W = 420 // 显示宽度 rpx
const VW = 266 // viewBox 宽度

/** 部位定义：cx/cy/rx/ry 为 viewBox 坐标，areaId 映射到产品分区 */
interface PartDef {
  id: string
  name: string
  cx: number
  cy: number
  rx: number
  ry: number
  areaId: string
}

const PARTS: Record<string, PartDef[]> = {
  front: [
    { id: 'head', name: '头', cx: 132, cy: 36, rx: 30, ry: 36, areaId: 'head' },
    { id: 'chest', name: '胸', cx: 132, cy: 168, rx: 46, ry: 42, areaId: 'shoulder' },
    { id: 'belly', name: '腹', cx: 132, cy: 238, rx: 50, ry: 38, areaId: 'belly' },
    { id: 'neck', name: '颈', cx: 132, cy: 95, rx: 34, ry: 28, areaId: 'head' },
    { id: 'shoulder-r', name: '右肩', cx: 70, cy: 135, rx: 19, ry: 38, areaId: 'shoulder' },
    { id: 'shoulder-l', name: '左肩', cx: 194, cy: 135, rx: 19, ry: 38, areaId: 'shoulder' },
    { id: 'upperarm-r', name: '右上臂', cx: 63, cy: 187, rx: 22, ry: 35, areaId: 'shoulder' },
    { id: 'upperarm-l', name: '左上臂', cx: 201, cy: 187, rx: 22, ry: 35, areaId: 'shoulder' },
    { id: 'thigh-r', name: '右大腿', cx: 104, cy: 305, rx: 27, ry: 45, areaId: 'limbs' },
    { id: 'thigh-l', name: '左大腿', cx: 160, cy: 305, rx: 27, ry: 45, areaId: 'limbs' },
    { id: 'forearm-r', name: '右前臂', cx: 45, cy: 245, rx: 22, ry: 33, areaId: 'limbs' },
    { id: 'forearm-l', name: '左前臂', cx: 219, cy: 245, rx: 22, ry: 33, areaId: 'limbs' },
    { id: 'leg-r', name: '右小腿', cx: 102, cy: 410, rx: 24, ry: 61, areaId: 'limbs' },
    { id: 'leg-l', name: '左小腿', cx: 162, cy: 410, rx: 24, ry: 61, areaId: 'limbs' },
    { id: 'palm-r', name: '右手', cx: 22, cy: 300, rx: 22, ry: 28, areaId: 'limbs' },
    { id: 'palm-l', name: '左手', cx: 242, cy: 300, rx: 22, ry: 28, areaId: 'limbs' },
    { id: 'foot-r', name: '右脚', cx: 91, cy: 517, rx: 29, ry: 48, areaId: 'limbs' },
    { id: 'foot-l', name: '左脚', cx: 173, cy: 517, rx: 29, ry: 48, areaId: 'limbs' },
    { id: 'groin', name: '小腹', cx: 132, cy: 282, rx: 19, ry: 19, areaId: 'belly' }
  ],
  back: [
    { id: 'head', name: '头', cx: 132, cy: 36, rx: 30, ry: 36, areaId: 'head' },
    { id: 'upperback', name: '背', cx: 132, cy: 168, rx: 46, ry: 42, areaId: 'shoulder' },
    { id: 'waist', name: '腰', cx: 132, cy: 238, rx: 50, ry: 38, areaId: 'belly' },
    { id: 'buttocks', name: '臀', cx: 132, cy: 305, rx: 52, ry: 45, areaId: 'limbs' },
    { id: 'neck', name: '颈', cx: 132, cy: 95, rx: 34, ry: 28, areaId: 'head' },
    { id: 'shoulder-r', name: '右肩', cx: 70, cy: 135, rx: 19, ry: 38, areaId: 'shoulder' },
    { id: 'shoulder-l', name: '左肩', cx: 194, cy: 135, rx: 19, ry: 38, areaId: 'shoulder' },
    { id: 'upperarm-r', name: '右上臂', cx: 63, cy: 187, rx: 22, ry: 35, areaId: 'shoulder' },
    { id: 'upperarm-l', name: '左上臂', cx: 201, cy: 187, rx: 22, ry: 35, areaId: 'shoulder' },
    { id: 'forearm-r', name: '右前臂', cx: 45, cy: 245, rx: 22, ry: 33, areaId: 'limbs' },
    { id: 'forearm-l', name: '左前臂', cx: 219, cy: 245, rx: 22, ry: 33, areaId: 'limbs' },
    { id: 'palm-r', name: '右手', cx: 22, cy: 300, rx: 22, ry: 28, areaId: 'limbs' },
    { id: 'palm-l', name: '左手', cx: 242, cy: 300, rx: 22, ry: 28, areaId: 'limbs' },
    { id: 'leg-r', name: '右小腿', cx: 102, cy: 410, rx: 24, ry: 61, areaId: 'limbs' },
    { id: 'leg-l', name: '左小腿', cx: 162, cy: 410, rx: 24, ry: 61, areaId: 'limbs' },
    { id: 'foot-r', name: '右脚', cx: 91, cy: 517, rx: 29, ry: 48, areaId: 'limbs' },
    { id: 'foot-l', name: '左脚', cx: 173, cy: 517, rx: 29, ry: 48, areaId: 'limbs' }
  ]
}

const FIG_RATIO: Record<string, number> = { front: 565 / 266, back: 556 / 266 }

const side = ref<'front' | 'back'>('front')
const tappedPart = ref<PartDef | null>(null)

const parts = computed(() => PARTS[side.value])
const figHeightPx = computed(() => upxPx(Math.round(FIG_W * FIG_RATIO[side.value])))
const figWidthPx = computed(() => upxPx(FIG_W))
const imgSrc = computed(() =>
  side.value === 'front' ? '/static/body/body-front.png' : '/static/body/body-back.png'
)

/** viewBox 椭圆 → 容器百分比矩形 */
function zoneStyle(p: PartDef): Record<string, string> {
  const H = FIG_RATIO[side.value] * VW
  return {
    left: (((p.cx - p.rx) / VW) * 100).toFixed(1) + '%',
    top: (((p.cy - p.ry) / H) * 100).toFixed(1) + '%',
    width: (((2 * p.rx) / VW) * 100).toFixed(1) + '%',
    height: (((2 * p.ry) / H) * 100).toFixed(1) + '%'
  }
}

function labelStyle(p: PartDef): Record<string, string> {
  const H = FIG_RATIO[side.value] * VW
  return {
    left: ((p.cx / VW) * 100).toFixed(1) + '%',
    top: ((p.cy / H) * 100).toFixed(1) + '%'
  }
}

function switchSide(s: 'front' | 'back') {
  side.value = s
  tappedPart.value = null
}

function onTapPart(p: PartDef) {
  tappedPart.value = p
  emit('select', { id: p.areaId })
}
</script>

<style scoped>
.figure-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 正/背切换 */
.side-toggle {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.side-chip {
  font-size: 24rpx;
  color: var(--c-ink-soft);
  border: 2rpx solid var(--c-line);
  border-radius: 999rpx;
  padding: 8rpx 32rpx;
  background: #FFFDF7;
  transition: all 0.2s ease;
}
.side-chip.on {
  background: var(--c-bamboo);
  border-color: var(--c-bamboo);
  color: #ffffff;
}

/* 人体图（宽高由动态 px 样式给定） */
.figure {
  position: relative;
  margin: 8rpx auto 0;
}
.fig-img {
  display: block;
}

/* 逐部位热区（椭圆近似） */
.part-zone {
  position: absolute;
  z-index: 2;
  border-radius: 50%;
  border: 2rpx solid transparent;
  transition: all 0.15s ease;
}
.part-zone.active {
  background: rgba(78, 122, 94, 0.3);
  border-color: rgba(78, 122, 94, 0.85);
  box-shadow: 0 0 0 4rpx rgba(78, 122, 94, 0.18);
}

/* 点中部位名称标签 */
.part-label {
  position: absolute;
  z-index: 3;
  transform: translate(-50%, -50%);
  pointer-events: none;
  font-size: 22rpx;
  color: #ffffff;
  background: #4E7A5E;
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 20rpx rgba(78, 122, 94, 0.35);
}
</style>
