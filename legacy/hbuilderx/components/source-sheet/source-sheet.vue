<template>
  <view v-if="visible&&source" class="sheet-layer" @tap="emit('close')">
    <view class="sheet" @tap.stop>
      <view class="handle"></view>
      <view class="sheet-header">
        <view><view class="eyebrow">资料来源</view><view class="title">{{ source.title }}</view></view>
        <view class="close" @tap="emit('close')">×</view>
      </view>
      <scroll-view class="sheet-scroll" scroll-y :show-scrollbar="false">
        <view class="meta">
          <view v-if="source.authorOrSpeaker" class="meta-row"><text>作者或讲述者</text><view>{{ source.authorOrSpeaker }}</view></view>
          <view v-if="source.publisherOrPlatform" class="meta-row"><text>发布平台</text><view>{{ source.publisherOrPlatform }}</view></view>
          <view v-if="source.publishedAt" class="meta-row"><text>发布时间</text><view>{{ source.publishedAt }}</view></view>
          <view class="meta-row"><text>资料状态</text><view>{{ source.verificationStatus==='verified'?'已核验':'待核验' }}</view></view>
        </view>
        <view v-if="source.originalText" class="section"><view class="section-title">相关原文</view><view class="body-text">{{ source.originalText }}</view></view>
        <view v-if="source.notes?.length" class="section"><view class="section-title">编辑备注</view><view v-for="item in source.notes" :key="item" class="note">{{ item }}</view></view>
        <view class="safe-space"></view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { KnowledgeSource } from '../../typings/models'
defineProps<{visible:boolean;source:KnowledgeSource|null}>()
const emit=defineEmits<{(event:'close'):void}>()
</script>

<style scoped>
.sheet-layer{position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;background:rgba(12,24,19,.32);animation:veilIn .2s ease both}.sheet{width:100%;height:min(76vh,1040rpx);display:flex;flex-direction:column;overflow:hidden;border-radius:34rpx 34rpx 0 0;background:#fff;box-shadow:0 -20rpx 70rpx rgba(18,39,30,.16);animation:sheetIn .28s cubic-bezier(.22,.72,.3,1) both}.handle{flex:0 0 auto;width:72rpx;height:8rpx;margin:14rpx auto 3rpx;border-radius:999rpx;background:#D9DFDB}.sheet-header{flex:0 0 auto;display:flex;align-items:flex-start;gap:20rpx;padding:23rpx 32rpx 25rpx;border-bottom:2rpx solid var(--c-line)}.sheet-header>view:first-child{flex:1;min-width:0}.eyebrow{font-size:18rpx;color:var(--c-bamboo)}.title{margin-top:5rpx;font-size:31rpx;line-height:1.4;font-weight:720}.close{flex:0 0 58rpx;width:58rpx;height:58rpx;display:grid;place-items:center;border-radius:19rpx;background:#F1F4F2;color:var(--c-ink-soft);font-size:36rpx;line-height:1}.sheet-scroll{flex:1;min-height:0;width:100%}.meta,.section{margin:24rpx 30rpx 0;padding:25rpx 27rpx;border:2rpx solid var(--c-line);border-radius:25rpx;background:#FAFBFA}.meta-row{display:flex;align-items:flex-start;justify-content:space-between;gap:24rpx;padding:12rpx 0;border-bottom:2rpx solid var(--c-line);font-size:21rpx}.meta-row:last-child{border-bottom:0}.meta-row text{flex:0 0 auto;color:var(--c-ink-faint)}.meta-row view{text-align:right}.section-title{font-size:24rpx;font-weight:700}.body-text,.note{margin-top:12rpx;font-size:22rpx;line-height:1.78;color:var(--c-ink-soft);white-space:pre-wrap}.note+.note{margin-top:8rpx}.safe-space{height:calc(40rpx + env(safe-area-inset-bottom))}@keyframes veilIn{from{opacity:0}to{opacity:1}}@keyframes sheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}@media (prefers-reduced-motion:reduce){.sheet-layer,.sheet{animation:none}}
</style>
<style scoped>
/* xqn-warm-candy */
.sheet{border-radius:42rpx 42rpx 0 0;background:var(--c-candy-cream)}.handle{background:#D9CCF1}.sheet-header{border:0}.close{border-radius:50%;background:#FFDCD1;color:#754E43}.meta{border:0;background:#F0EBFA}.section{border:0;background:#FFFDFC}.meta-row{border-color:rgba(88,71,110,.1)}
</style>
<style scoped>
/* xqn-interaction-system */
.close{transition:transform var(--motion-press) ease,background-color var(--motion-switch) ease}.close:active{transform:scale(.92);background:var(--c-candy-peach)}
@media(prefers-reduced-motion:reduce){.sheet-layer,.sheet,.close{animation:none!important;transition:none!important}}
</style>
