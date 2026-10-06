<template>
  <view class="bottom-nav">
    <view :class="['nav-item',active==='home'?'active':'']" @tap="go('home')">
      <view class="nav-mark" />
      <text>首页</text>
    </view>
    <view :class="['nav-item',active==='anthology'?'active':'']" @tap="go('anthology')">
      <view class="nav-mark" />
      <text>文集</text>
    </view>
    <view :class="['nav-item',active==='account'?'active':'']" @tap="go('account')">
      <view class="nav-mark" />
      <text>我的</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const props=defineProps<{active:'home'|'anthology'|'account'}>()

function go(target:'home'|'anthology'|'account'){
  if(target===props.active)return
  try{uni.vibrateShort({type:'light'})}catch(e){/* 浏览器不支持振动时忽略。 */}
  const url=target==='home'?'/pages/index/index':target==='anthology'?'/pages/gear/gear':'/pages/account/account'
  uni.reLaunch({url})
}
</script>

<style scoped>
.bottom-nav{position:relative;z-index:20;flex:0 0 auto;display:grid;grid-template-columns:repeat(3,1fr);padding:8rpx 18rpx calc(10rpx + env(safe-area-inset-bottom));border-top:2rpx solid var(--c-line);background:rgba(255,255,255,.98)}
.nav-item{height:66rpx;display:flex;align-items:center;justify-content:center;gap:9rpx;border-radius:20rpx;color:var(--c-ink-faint);font-size:21rpx;font-weight:620}
.nav-item.active{color:var(--c-bamboo-deep)}
.nav-mark{width:8rpx;height:8rpx;border-radius:50%;background:transparent}
.nav-item.active .nav-mark{background:var(--c-bamboo);box-shadow:0 0 0 6rpx var(--c-green-soft)}
</style>
<style scoped>
/* xqn-youth-system */
.bottom-nav{padding:10rpx 20rpx calc(12rpx + env(safe-area-inset-bottom));border:0;background:#FFFDF7;box-shadow:0 -12rpx 34rpx rgba(35,62,52,.06)}
.nav-item{height:70rpx;border-radius:999rpx;font-weight:700;transition:all .2s ease}
.nav-item.active{background:#DCEEDB;color:#174B3E}.nav-mark{width:10rpx;height:10rpx}.nav-item.active .nav-mark{background:#23715C;box-shadow:none}
</style>
<style scoped>
/* xqn-warm-candy */
.bottom-nav{background:var(--c-candy-cream)}.nav-item:nth-child(1).active{background:#FFE4D8}.nav-item:nth-child(2).active{background:#E8DFF7}.nav-item:nth-child(3).active{background:#DDF1E5}.nav-item.active{color:#254F42}.nav-item.active .nav-mark{background:#254F42}
</style>
<style scoped>
/* xqn-interaction-system */
.nav-item{transition:color var(--motion-switch) ease,background-color var(--motion-switch) ease,transform var(--motion-press) ease}.nav-item:active{transform:scale(.96)}
@media(prefers-reduced-motion:reduce){.nav-item{transition:none!important}}
</style>
