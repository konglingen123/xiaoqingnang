<template>
  <view class="page">
    <scroll-view class="account-scroll" scroll-y :show-scrollbar="false">
      <view v-if="!wechatUser" class="login-card"><view class="login-mark">囊</view><view class="login-copy"><strong>登录小青囊</strong><text>同步收藏、笔记和阅读记录</text></view><view class="login-button" @tap="testWechatLogin">微信登录</view></view>
      <view v-else class="login-card logged-in"><view class="login-mark">{{ wechatUser.nickname.slice(0,1) }}</view><view class="login-copy"><strong>{{ wechatUser.nickname }}</strong><text>已登录 · 记录保存在本机</text></view><view class="logout-button" @tap="logoutWechat">退出</view></view>
      <view class="library-card">
        <view class="library-tabs"><view :class="['library-tab', activeTab==='favorites'?'active':'']" @tap="activeTab='favorites'">收藏 <small>{{ savedItems.length }}</small></view><view :class="['library-tab', activeTab==='notes'?'active':'']" @tap="activeTab='notes'">笔记 <small>{{ noteItems.length }}</small></view></view>
        <view v-if="activeTab==='favorites' && savedItems.length" class="library-list"><view v-for="entry in savedItems" :key="entry.id" class="library-row" @tap="openContent(entry.id)"><view><strong>{{ entry.title }}</strong><text>打开资料</text></view><b>›</b></view></view>
        <view v-else-if="activeTab==='notes' && noteItems.length" class="library-list"><view v-for="entry in noteItems" :key="entry.id" class="library-row" @tap="openContent(entry.id)"><view><strong>{{ entry.title }}</strong><text>{{ entry.note }}</text></view><b>›</b></view></view>
        <view v-else class="empty-state"><view class="empty-icon">{{ activeTab==='favorites'?'藏':'记' }}</view><strong>{{ activeTab==='favorites'?'还没有收藏':'还没有笔记' }}</strong><text>{{ activeTab==='favorites'?'阅读资料时，看到重要内容可以收藏。':'阅读资料时，可以写下自己的记录。' }}</text></view>
      </view>
      <view class="privacy-note">当前为本地测试登录。正式接入公众号授权后，收藏和笔记可跨设备同步。</view>
    </scroll-view>
    <bottom-nav active="account" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPublishedContents } from '../../utils/content'
import { favoriteItems, getNotes } from '../../utils/reading'
type TestWechatUser={nickname:string;openid:string;loggedAt:number}
const KEY='xqn_test_wechat_user'
const wechatUser=ref<TestWechatUser|null>(null),savedItems=ref<any[]>([]),noteItems=ref<any[]>([]),activeTab=ref<'favorites'|'notes'>('favorites')
onShow(()=>{loadWechatUser();refreshLibrary()})
function loadWechatUser(){try{const value=uni.getStorageSync(KEY);wechatUser.value=value?.openid?value:null}catch(e){wechatUser.value=null}}
function testWechatLogin(){const value={nickname:'微信用户',openid:`test_${Date.now()}`,loggedAt:Date.now()};uni.setStorageSync(KEY,value);wechatUser.value=value;uni.showToast({title:'测试登录成功',icon:'success'})}
function logoutWechat(){uni.removeStorageSync(KEY);wechatUser.value=null;uni.showToast({title:'已退出登录',icon:'none'})}
function refreshLibrary(){const contents=getPublishedContents();savedItems.value=favoriteItems(contents);noteItems.value=getNotes().map(note=>({id:note.contentId,title:note.title||contents.find(item=>item.id===note.contentId)?.title||'资料笔记',note:note.text}))}
function openContent(id:string){uni.navigateTo({url:`/pages/problem/detail?id=${encodeURIComponent(id)}`})}
</script>

<style scoped>
.page{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:#FFF8EA;color:#21483B}.account-scroll{flex:1;min-height:0}.account-head{padding:42rpx 32rpx 28rpx;background:linear-gradient(145deg,#FFF8EA 5%,#F9E9CF 100%)}.eyebrow{font-size:19rpx;letter-spacing:6rpx;color:#C56F4D;font-weight:800}.title{margin-top:10rpx;font-size:53rpx;line-height:1.15;font-weight:850;letter-spacing:-2rpx;color:#21483B}.subtitle{margin-top:10rpx;font-size:21rpx;color:#6A7D73}.login-card{display:flex;align-items:center;gap:16rpx;margin:18rpx 24rpx 0;padding:20rpx;border-radius:25rpx;background:#DDF1E5;box-shadow:0 10rpx 25rpx rgba(48,86,67,.08)}.login-card.logged-in{background:#E8DFF7}.login-mark{width:60rpx;height:60rpx;display:grid;place-items:center;flex:0 0 auto;border-radius:20rpx;background:#1B5A47;color:#fff;font-size:22rpx;font-weight:800}.logged-in .login-mark{background:#765E92}.login-copy{flex:1;min-width:0}.login-copy strong,.login-copy text{display:block}.login-copy strong{font-size:23rpx;color:#21483B}.login-copy text{margin-top:5rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17rpx;color:#60786D}.login-button,.logout-button{flex:0 0 auto;padding:13rpx 17rpx;border-radius:999rpx;background:#1B5A47;color:#fff;font-size:18rpx;font-weight:750}.logout-button{background:#F6F1E9;color:#6B6F69}.library-card{margin:20rpx 24rpx 0;padding:22rpx;border-radius:28rpx;background:#FFFDFC;box-shadow:0 10rpx 25rpx rgba(71,65,51,.06)}.library-tabs{display:flex;gap:8rpx;padding:5rpx;border-radius:16rpx;background:#F4EEE4}.library-tab{flex:1;padding:12rpx;text-align:center;border-radius:12rpx;color:#77847D;font-size:21rpx;font-weight:700}.library-tab small{margin-left:4rpx;color:#A2AAA3;font-size:16rpx;font-weight:500}.library-tab.active{background:#fff;color:#245C49;box-shadow:0 3rpx 10rpx rgba(58,74,64,.08)}.library-list{margin-top:9rpx}.library-row{display:flex;align-items:center;gap:12rpx;padding:18rpx 4rpx;border-bottom:2rpx solid #F0ECE5}.library-row:last-child{border-bottom:0}.library-row>view{flex:1;min-width:0}.library-row strong,.library-row text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.library-row strong{font-size:21rpx;color:#244D40}.library-row text{margin-top:5rpx;font-size:17rpx;color:#7B8981}.library-row b{font-size:30rpx;color:#397B63;font-weight:400}.empty-state{display:grid;justify-items:center;padding:48rpx 20rpx 42rpx;text-align:center}.empty-icon{width:54rpx;height:54rpx;display:grid;place-items:center;border-radius:18rpx;background:#F5C85C;color:#6A5523;font-size:20rpx;font-weight:800}.empty-state strong{margin-top:14rpx;font-size:23rpx;color:#385A4D}.empty-state text{margin-top:6rpx;font-size:18rpx;color:#89938E}.privacy-note{margin:18rpx 42rpx 30rpx;text-align:center;font-size:16rpx;line-height:1.65;color:#8C958D}
</style>
