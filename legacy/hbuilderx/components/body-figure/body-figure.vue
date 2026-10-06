<template>
  <view class="figure-wrap">
    <template v-if="viewMode==='body'">
      <view class="structure-row">
        <view class="structure-label">身体结构</view>
        <view class="structure-toggle">
          <view v-for="item in STRUCTURES" :key="item.id" :class="['structure-chip',structure===item.id?'on':'']" @tap="switchStructure(item.id)">{{ item.name }}</view>
        </view>
      </view>
      <view class="view-controls">
        <view class="side-toggle">
          <view :class="['side-chip',side==='front'?'on':'']" @tap="switchSide('front')">正面</view>
          <view :class="['side-chip',side==='back'?'on':'']" @tap="switchSide('back')">背面</view>
        </view>
      </view>
      <view class="figure" :style="{width:figWidthPx,height:figHeightPx}">
        <image class="fig-img" :src="imgSrc" mode="aspectFit" :style="{width:figWidthPx,height:figHeightPx}" />
        <view v-for="part in parts" :key="part.id" :class="['part-zone',tappedPart?.id===part.id?'active':'']" :style="zoneStyle(part)" @tap.stop="onTapPart(part)" />
        <view v-if="tappedPart" class="part-label" :style="labelStyle(tappedPart)">{{ tappedPart.name }}</view>
      </view>
      <view v-if="tappedPart" class="face-confirm body-confirm">
        <view><text>已选择</text><view>{{ tappedPart.name }}</view></view>
        <view class="face-confirm-button" @tap="confirmBodyPart">查看内容&nbsp; ›</view>
      </view>
      <view v-else class="face-hint">点击一个身体位置</view>
    </template>

    <template v-else-if="viewMode==='face'">
      <view class="face-header">
        <view class="face-back" @tap="closeFace">‹ 返回全身</view>
        <view class="face-heading">选择头面位置</view>
        <view class="face-spacer" />
      </view>
      <view class="face-canvas">
        <image class="face-img" src="/static/body/face-front-model.jpg" mode="aspectFit" />
        <view v-for="zone in FACE_ZONES" :key="zone.id" class="face-zone" :style="faceZoneStyle(zone)" @tap.stop="selectFaceZone(zone)">
          <view :class="['face-dot',faceSelection?.id===zone.id?'on':'']" />
        </view>
        <view v-for="zone in FACE_ZONES" :key="'label-'+zone.id" :class="['face-callout',faceSelection?.id===zone.id?'on':'']" :style="faceLabelStyle(zone)" @tap.stop="selectFaceZone(zone)">{{ zone.name }}</view>
      </view>
      <view v-if="faceSelection" class="face-confirm">
        <view><text>已选择</text><view>{{ faceSelection.name }}</view></view>
        <view class="face-confirm-button" @tap="confirmFaceZone">查看内容&nbsp; ›</view>
      </view>
      <view v-else class="face-hint">点击标注或面部位置</view>
    </template>

    <template v-else>
      <view class="sensitive-header">
        <view class="face-back" @tap="closeSensitive">‹ 通用人体</view>
        <view class="face-heading">{{ structure==='female'?'女性局部':'男性局部' }}</view>
        <view class="face-spacer" />
      </view>
      <view class="sensitive-switch">
        <view :class="['sensitive-switch-item',structure==='female'?'on':'']" @tap="switchStructure('female')">女性</view>
        <view :class="['sensitive-switch-item',structure==='male'?'on':'']" @tap="switchStructure('male')">男性</view>
      </view>
      <view class="sensitive-notice">以下仅用于准确选择身体位置</view>
      <view class="sensitive-grid">
        <view v-for="zone in sensitiveZones" :key="zone.id" :class="['sensitive-card',sensitiveSelection?.id===zone.id?'on':'']" @tap="selectSensitiveZone(zone)">
          <view class="sensitive-symbol"><view /></view>
          <view class="sensitive-name">{{ zone.name }}</view>
          <view class="sensitive-group">{{ zone.group }}</view>
        </view>
      </view>
      <view v-if="sensitiveSelection" class="face-confirm sensitive-confirm">
        <view><text>已选择</text><view>{{ sensitiveSelection.name }}</view></view>
        <view class="face-confirm-button" @tap="confirmSensitiveZone">查看内容&nbsp; ›</view>
      </view>
      <view v-else class="face-hint">请选择一个准确位置</view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { upxPx } from '../../utils/upx'

const props=defineProps({selected:{type:String,default:''}})
const emit=defineEmits(['select'])
const FIG_W=420
const VW=266
const VH=565

interface PartDef {id:string;name:string;cx:number;cy:number;rx:number;ry:number;areaId:string}
interface FaceZone {id:string;name:string;areaId:string;x:number;y:number;labelX:number;labelY:number}
type BodyStructure='common'|'female'|'male'
interface SensitiveZone {id:string;name:string;areaId:string;group:string}

const STRUCTURES:{id:BodyStructure;name:string}[]=[{id:'common',name:'通用'},{id:'female',name:'女性'},{id:'male',name:'男性'}]
const FEMALE_ZONES:SensitiveZone[]=[
  {id:'breast',name:'乳房',areaId:'breast',group:'胸部细分'},
  {id:'nipple-areola',name:'乳头及乳晕',areaId:'nipple-areola',group:'胸部细分'},
  {id:'vulva',name:'外阴',areaId:'vulva',group:'外部结构'},
  {id:'perineum',name:'会阴',areaId:'perineum',group:'骨盆底区域'},
  {id:'anus',name:'肛门及肛周',areaId:'anus',group:'背面区域'}
]
const MALE_ZONES:SensitiveZone[]=[
  {id:'breast',name:'乳房',areaId:'breast',group:'胸部细分'},
  {id:'nipple-areola',name:'乳头及乳晕',areaId:'nipple-areola',group:'胸部细分'},
  {id:'penis',name:'阴茎',areaId:'penis',group:'外部结构'},
  {id:'scrotum',name:'阴囊',areaId:'scrotum',group:'外部结构'},
  {id:'perineum',name:'会阴',areaId:'perineum',group:'骨盆底区域'},
  {id:'anus',name:'肛门及肛周',areaId:'anus',group:'背面区域'}
]

/** x/y 是五官在 420 × 500 头面图上的中心，label 坐标位于图外侧。 */
const FACE_ZONES:FaceZone[]=[
  {id:'forehead',name:'额部',areaId:'forehead',x:210,y:154,labelX:210,labelY:18},
  {id:'temple-r',name:'右颞部',areaId:'temple',x:126,y:202,labelX:8,labelY:118},
  {id:'temple-l',name:'左颞部',areaId:'temple',x:294,y:202,labelX:462,labelY:118},
  {id:'eye-r',name:'右眼周',areaId:'eye',x:158,y:238,labelX:4,labelY:190},
  {id:'eye-l',name:'左眼周',areaId:'eye',x:262,y:238,labelX:468,labelY:190},
  {id:'ear-r',name:'右耳',areaId:'ear',x:96,y:258,labelX:12,labelY:265},
  {id:'ear-l',name:'左耳',areaId:'ear',x:324,y:258,labelX:490,labelY:265},
  {id:'cheek-r',name:'右面颊',areaId:'cheek',x:148,y:294,labelX:2,labelY:340},
  {id:'cheek-l',name:'左面颊',areaId:'cheek',x:272,y:294,labelX:470,labelY:340},
  {id:'nose',name:'鼻部',areaId:'nose',x:210,y:308,labelX:476,labelY:410},
  {id:'mouth',name:'口唇周围',areaId:'mouth',x:210,y:356,labelX:20,labelY:425},
  {id:'jaw',name:'下颌部',areaId:'jaw',x:210,y:430,labelX:251,labelY:510}
]

/** 坐标按照 266 × 565 人体底图标定；相邻区域尽量不重叠，避免命中被覆盖。 */
const PARTS:Record<'front'|'back',PartDef[]>={
  front:[
    {id:'head',name:'头面部',cx:133,cy:37,rx:29,ry:36,areaId:'head'},
    {id:'neck',name:'颈部',cx:133,cy:84,rx:17,ry:12,areaId:'neck'},
    {id:'shoulder-r',name:'右肩',cx:91,cy:111,rx:24,ry:15,areaId:'shoulder'},
    {id:'shoulder-l',name:'左肩',cx:175,cy:111,rx:24,ry:15,areaId:'shoulder'},
    {id:'chest',name:'胸部',cx:133,cy:154,rx:43,ry:28,areaId:'chest'},
    {id:'abdomen',name:'腹部',cx:133,cy:225,rx:42,ry:39,areaId:'abdomen'},
    {id:'pelvis',name:'下腹与腹股沟',cx:133,cy:278,rx:34,ry:17,areaId:'pelvis'},
    {id:'upperarm-r',name:'右上臂',cx:63,cy:168,rx:15,ry:34,areaId:'upper-arm'},
    {id:'upperarm-l',name:'左上臂',cx:203,cy:168,rx:15,ry:34,areaId:'upper-arm'},
    {id:'elbow-r',name:'右肘',cx:50,cy:214,rx:14,ry:14,areaId:'elbow'},
    {id:'elbow-l',name:'左肘',cx:216,cy:214,rx:14,ry:14,areaId:'elbow'},
    {id:'forearm-r',name:'右前臂',cx:38,cy:251,rx:15,ry:28,areaId:'forearm'},
    {id:'forearm-l',name:'左前臂',cx:228,cy:251,rx:15,ry:28,areaId:'forearm'},
    {id:'hand-r',name:'右手',cx:24,cy:304,rx:21,ry:26,areaId:'hand'},
    {id:'hand-l',name:'左手',cx:242,cy:304,rx:21,ry:26,areaId:'hand'},
    {id:'thigh-r',name:'右大腿',cx:105,cy:329,rx:23,ry:37,areaId:'thigh'},
    {id:'thigh-l',name:'左大腿',cx:161,cy:329,rx:23,ry:37,areaId:'thigh'},
    {id:'knee-r',name:'右膝',cx:103,cy:377,rx:19,ry:14,areaId:'knee'},
    {id:'knee-l',name:'左膝',cx:163,cy:377,rx:19,ry:14,areaId:'knee'},
    {id:'lowerleg-r',name:'右小腿',cx:102,cy:431,rx:19,ry:38,areaId:'lower-leg'},
    {id:'lowerleg-l',name:'左小腿',cx:164,cy:431,rx:19,ry:38,areaId:'lower-leg'},
    {id:'foot-r',name:'右足',cx:92,cy:536,rx:27,ry:21,areaId:'foot'},
    {id:'foot-l',name:'左足',cx:174,cy:536,rx:27,ry:21,areaId:'foot'}
  ],
  back:[
    {id:'head',name:'头后部',cx:133,cy:37,rx:29,ry:36,areaId:'head'},
    {id:'neck',name:'后颈',cx:133,cy:84,rx:17,ry:12,areaId:'neck'},
    {id:'shoulder-r',name:'右肩',cx:91,cy:111,rx:24,ry:15,areaId:'shoulder'},
    {id:'shoulder-l',name:'左肩',cx:175,cy:111,rx:24,ry:15,areaId:'shoulder'},
    {id:'upperback',name:'上背部',cx:133,cy:157,rx:43,ry:33,areaId:'upper-back'},
    {id:'lowerback',name:'下背部',cx:133,cy:228,rx:42,ry:34,areaId:'lower-back'},
    {id:'buttocks',name:'臀部',cx:133,cy:286,rx:44,ry:24,areaId:'buttocks'},
    {id:'upperarm-r',name:'右上臂',cx:63,cy:168,rx:15,ry:34,areaId:'upper-arm'},
    {id:'upperarm-l',name:'左上臂',cx:203,cy:168,rx:15,ry:34,areaId:'upper-arm'},
    {id:'elbow-r',name:'右肘',cx:50,cy:214,rx:14,ry:14,areaId:'elbow'},
    {id:'elbow-l',name:'左肘',cx:216,cy:214,rx:14,ry:14,areaId:'elbow'},
    {id:'forearm-r',name:'右前臂',cx:38,cy:251,rx:15,ry:28,areaId:'forearm'},
    {id:'forearm-l',name:'左前臂',cx:228,cy:251,rx:15,ry:28,areaId:'forearm'},
    {id:'hand-r',name:'右手',cx:24,cy:304,rx:21,ry:26,areaId:'hand'},
    {id:'hand-l',name:'左手',cx:242,cy:304,rx:21,ry:26,areaId:'hand'},
    {id:'thigh-r',name:'右大腿',cx:105,cy:329,rx:23,ry:37,areaId:'thigh'},
    {id:'thigh-l',name:'左大腿',cx:161,cy:329,rx:23,ry:37,areaId:'thigh'},
    {id:'knee-r',name:'右膝',cx:103,cy:377,rx:19,ry:14,areaId:'knee'},
    {id:'knee-l',name:'左膝',cx:163,cy:377,rx:19,ry:14,areaId:'knee'},
    {id:'lowerleg-r',name:'右小腿',cx:102,cy:431,rx:19,ry:38,areaId:'lower-leg'},
    {id:'lowerleg-l',name:'左小腿',cx:164,cy:431,rx:19,ry:38,areaId:'lower-leg'},
    {id:'foot-r',name:'右足',cx:96,cy:532,rx:23,ry:27,areaId:'foot'},
    {id:'foot-l',name:'左足',cx:170,cy:532,rx:23,ry:27,areaId:'foot'}
  ]
}

const side=ref<'front'|'back'>('front')
const structure=ref<BodyStructure>('common')
const viewMode=ref<'body'|'face'|'sensitive'>('body')
const tappedPart=ref<PartDef|null>(null)
const faceSelection=ref<FaceZone|null>(null)
const sensitiveSelection=ref<SensitiveZone|null>(null)
const parts=computed(()=>PARTS[side.value])
const sensitiveZones=computed(()=>structure.value==='female'?FEMALE_ZONES:MALE_ZONES)
const figWidthPx=computed(()=>upxPx(FIG_W))
const figHeightPx=computed(()=>upxPx(Math.round(FIG_W*VH/VW)))
const imgSrc=computed(()=>side.value==='front'?'/static/body/body-front.png':'/static/body/body-back.png')

function zoneStyle(part:PartDef):Record<string,string>{return{left:((part.cx-part.rx)/VW*100).toFixed(2)+'%',top:((part.cy-part.ry)/VH*100).toFixed(2)+'%',width:(part.rx*2/VW*100).toFixed(2)+'%',height:(part.ry*2/VH*100).toFixed(2)+'%'}}
function labelStyle(part:PartDef):Record<string,string>{return{left:(part.cx/VW*100).toFixed(2)+'%',top:(part.cy/VH*100).toFixed(2)+'%'}}
function switchSide(value:'front'|'back'){side.value=value;tappedPart.value=null}
function zoneKey(part:PartDef){return side.value+'-'+part.id}
function onTapPart(part:PartDef){
  if(side.value==='front'&&part.id==='head'){viewMode.value='face';tappedPart.value=null;return}
  tappedPart.value=part
}
function confirmBodyPart(){
  if(!tappedPart.value)return
  const part=tappedPart.value
  const areaId=side.value==='back'&&part.id==='head'?'occiput':part.areaId
  emit('select',{zoneId:zoneKey(part),areaId,zoneName:part.name})
}
function faceZoneStyle(zone:FaceZone):Record<string,string>{return{left:((110+zone.x/420*400)/620*100).toFixed(2)+'%',top:((30+zone.y)/560*100).toFixed(2)+'%'}}
function faceLabelStyle(zone:FaceZone):Record<string,string>{return{left:(zone.labelX/620*100).toFixed(2)+'%',top:(zone.labelY/560*100).toFixed(2)+'%'}}
function selectFaceZone(zone:FaceZone){faceSelection.value=zone}
function closeFace(){viewMode.value='body';faceSelection.value=null}
function confirmFaceZone(){if(!faceSelection.value)return;const zone=faceSelection.value;emit('select',{zoneId:'face-'+zone.id,areaId:zone.areaId,zoneName:zone.name})}
function switchStructure(value:BodyStructure){structure.value=value;sensitiveSelection.value=null;tappedPart.value=null;viewMode.value=value==='common'?'body':'sensitive'}
function closeSensitive(){structure.value='common';viewMode.value='body';sensitiveSelection.value=null}
function selectSensitiveZone(zone:SensitiveZone){sensitiveSelection.value=zone}
function confirmSensitiveZone(){if(!sensitiveSelection.value)return;const zone=sensitiveSelection.value;emit('select',{zoneId:'sensitive-'+structure.value+'-'+zone.id,areaId:zone.areaId,zoneName:zone.name,privateSelection:true})}
</script>

<style scoped>
.figure-wrap{display:flex;flex-direction:column;align-items:center;width:100%}.structure-row{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 16rpx 18rpx;box-sizing:border-box}.structure-label{font-size:20rpx;color:var(--c-ink-faint)}.structure-toggle{display:flex;padding:4rpx;border-radius:14rpx;background:var(--c-chip)}.structure-chip{padding:7rpx 17rpx;border-radius:11rpx;font-size:19rpx;color:var(--c-ink-soft)}.structure-chip.on{background:var(--c-card);font-weight:700;color:var(--c-bamboo-deep);box-shadow:0 3rpx 10rpx rgba(41,77,57,.1)}.view-controls{position:relative;display:flex;align-items:center;justify-content:center;width:100%}.side-toggle{display:flex;gap:8rpx;margin-bottom:20rpx}.side-chip{padding:9rpx 28rpx;border-radius:999rpx;background:#F0F2F0;font-size:24rpx;color:var(--c-ink-soft);transition:all .2s ease}.side-chip.on{background:var(--c-ink);color:#fff}.sensitive-open{position:absolute;right:14rpx;top:5rpx;font-size:20rpx;color:var(--c-bamboo)}.figure{position:relative;margin:8rpx auto 0}.fig-img{display:block}.part-zone{position:absolute;z-index:2;border:2rpx solid transparent;border-radius:50%;transition:all .15s ease;-webkit-tap-highlight-color:transparent}.part-zone:active{background:rgba(49,91,71,.14)}.part-zone.active{background:rgba(49,91,71,.22);border-color:rgba(49,91,71,.78);box-shadow:0 0 0 4rpx rgba(49,91,71,.12)}.part-label{position:absolute;z-index:3;transform:translate(-50%,-50%);pointer-events:none;padding:4rpx 20rpx;border-radius:999rpx;background:var(--c-ink);box-shadow:0 6rpx 20rpx rgba(24,35,30,.22);font-size:22rpx;white-space:nowrap;color:#fff}.face-header,.sensitive-header{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0 18rpx 10rpx;box-sizing:border-box}.face-back,.face-spacer{width:150rpx}.face-back{font-size:22rpx;color:var(--c-bamboo)}.face-heading{text-align:center;font-size:25rpx;font-weight:700}.face-canvas{position:relative;width:620rpx;height:560rpx;margin-top:12rpx}.face-img{position:absolute;left:100rpx;top:30rpx;width:420rpx;height:500rpx}.face-zone{position:absolute;z-index:3;width:54rpx;height:54rpx;transform:translate(-50%,-50%)}.face-dot{position:absolute;left:50%;top:50%;width:13rpx;height:13rpx;transform:translate(-50%,-50%);border:4rpx solid var(--c-card);border-radius:50%;background:var(--c-bamboo);box-shadow:0 0 0 2rpx rgba(41,77,57,.28)}.face-dot.on{width:23rpx;height:23rpx;background:var(--c-ginger);box-shadow:0 0 0 8rpx rgba(178,103,76,.14)}.face-callout{position:absolute;z-index:4;min-width:96rpx;padding:8rpx 12rpx;border-bottom:2rpx solid var(--c-bamboo-light);font-size:20rpx;color:var(--c-ink-soft);white-space:nowrap}.face-callout.on{border-color:var(--c-ginger);font-weight:700;color:var(--c-ink)}.face-confirm{display:flex;align-items:center;justify-content:space-between;width:calc(100% - 36rpx);box-sizing:border-box;margin-top:8rpx;padding:19rpx 20rpx 19rpx 24rpx;border-radius:20rpx;background:var(--c-green-soft)}.face-confirm text{font-size:18rpx;color:var(--c-bamboo)}.face-confirm view view{font-size:25rpx;font-weight:700}.face-confirm-button{padding:13rpx 20rpx;border-radius:14rpx;background:var(--c-bamboo-deep);font-size:21rpx;font-weight:650;color:#fff}.face-hint{margin-top:14rpx;font-size:20rpx;color:var(--c-ink-faint)}.body-confirm{position:fixed;z-index:20;left:52rpx;right:52rpx;bottom:125rpx;width:auto;margin:0;box-shadow:0 14rpx 38rpx rgba(41,77,57,.2)}.sensitive-notice{margin-top:12rpx;padding:12rpx 20rpx;border-radius:999rpx;background:var(--c-chip);font-size:19rpx;color:var(--c-ink-soft)}.sensitive-diagram{position:relative;width:620rpx;height:390rpx;margin-top:24rpx}.sensitive-img{position:absolute;inset:0;width:620rpx;height:390rpx}.diagram-caption{position:absolute;z-index:2;top:0;font-size:18rpx;color:var(--c-ink-faint)}.chest-caption{left:90rpx}.front-caption{left:292rpx}.back-caption{left:500rpx}.sensitive-point{position:absolute;z-index:3;width:58rpx;height:58rpx;transform:translate(-50%,-50%)}.sensitive-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:9rpx;width:100%;padding:5rpx 18rpx 0;box-sizing:border-box}.legend-item{display:flex;align-items:center;gap:8rpx;padding:9rpx 13rpx;border:2rpx solid var(--c-line);border-radius:999rpx;background:var(--c-card);font-size:19rpx;color:var(--c-ink-soft)}.legend-item.on{border-color:var(--c-bamboo);background:var(--c-green-soft);font-weight:700;color:var(--c-ink)}.legend-dot{width:9rpx;height:9rpx;border-radius:50%;background:var(--c-bamboo)}.sensitive-confirm{margin-top:22rpx}
</style>

<style scoped>
.face-img{left:110rpx;width:400rpx}
</style>

<style scoped>
.sensitive-grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;width:100%;box-sizing:border-box;margin-top:24rpx;padding:0 18rpx}.sensitive-card{padding:24rpx 20rpx;border:2rpx solid var(--c-line);border-radius:21rpx;background:var(--c-card)}.sensitive-card.on{border-color:var(--c-bamboo);background:var(--c-green-soft)}.sensitive-symbol{display:flex;align-items:center;justify-content:center;width:34rpx;height:34rpx;border-radius:50%;background:var(--c-chip)}.sensitive-symbol view{width:10rpx;height:10rpx;border-radius:50%;background:var(--c-bamboo)}.sensitive-name{margin-top:13rpx;font-size:24rpx;font-weight:700}.sensitive-group{margin-top:3rpx;font-size:18rpx;color:var(--c-ink-faint)}
.sensitive-switch{display:flex;margin:8rpx 0 4rpx;padding:5rpx;border-radius:16rpx;background:var(--c-chip)}.sensitive-switch-item{min-width:112rpx;padding:9rpx 20rpx;text-align:center;border-radius:12rpx;font-size:21rpx;color:var(--c-ink-soft)}.sensitive-switch-item.on{background:var(--c-card);font-weight:700;color:var(--c-bamboo-deep);box-shadow:0 3rpx 10rpx rgba(41,77,57,.1)}
</style>
