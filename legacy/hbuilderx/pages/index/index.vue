<template>
  <view class="page">
    <view class="mode-header">
      <view class="brand-lockup">
        <image class="brand-logo" src="/static/brand/logo-round-v2.svg" mode="aspectFit" />
        <view><view class="brand-name">小青囊</view><view class="brand-note">日常养护技能库</view></view>
      </view>
      <view class="mode-switch">
        <view :class="['mode-item',mode==='search'?'active':'']" @tap="setMode('search')">找方法</view>
        <view :class="['mode-item',mode==='body'?'active':'']" @tap="setMode('body')">看身体</view>
      </view>
    </view>

    <template v-if="mode==='search'">
      <scroll-view class="conversation" scroll-y :show-scrollbar="false" :scroll-into-view="scrollTarget">
        <view v-if="!submittedQuery" class="welcome">
          <view class="hero-panel">
            <view class="paint-sun"><view class="sun-eye left"/><view class="sun-eye right"/><view class="sun-smile"/></view>
            <view class="paint-leaf leaf-one" />
            <view class="paint-leaf leaf-two" />
            <view class="hero-copy">
            <view class="eyebrow"><view class="eyebrow-dot"/><text>从已审核的内容中查找</text></view>
              <view class="welcome-title">今天，想照顾<br/>身体的<text>哪里？</text></view>
              <view class="welcome-copy">说一个位置或日常感受，我们帮你找到可以安全了解和尝试的养护方法。</view>
            </view>
          </view>
          <view v-if="suggestions.length" class="suggestions">
            <view class="suggestion-label">不知道怎么说？试试这些</view>
            <view v-for="(item,index) in suggestions" :key="item" class="suggestion" :style="{animationDelay:(220+index*60)+'ms'}" @tap="useSuggestion(item)">{{ item }} <text>›</text></view>
          </view>
        </view>

        <view v-else class="messages">
          <view class="user-row"><view class="user-bubble">{{ submittedQuery }}</view></view>
          <view class="assistant-row">
            <view class="assistant-avatar">囊</view>
            <view v-if="searching" class="assistant-bubble searching"><view class="searching-dots"><i/><i/><i/></view><text>正在已审核内容中查找…</text></view>
            <view v-else class="assistant-bubble">{{ cards.length?`找到 ${cards.length} 个相关内容`:'暂时没有找到已审核的相关内容' }}</view>
          </view>

          <view v-if="!searching&&cards.length" class="result-list">
            <view v-for="(card,index) in cards" :key="card.type+card.id" class="result-card" :style="{animationDelay:(120+index*65)+'ms'}" @tap="openCard(card)">
              <view class="result-meta">
                <view :class="['result-icon',card.type==='article'?'source':'method']">{{ card.type==='article'?'文':'法' }}</view>
                <view class="result-type">{{ card.type==='article'?'青囊文集':'养护方法' }}</view>
                <view class="result-arrow">›</view>
              </view>
              <view class="result-name">{{ card.name }}</view>
              <view class="result-copy">{{ card.description }}</view>
              <view class="decision-row"><text v-for="fact in card.facts" :key="fact">{{ fact }}</text></view>
              <view v-if="card.source" class="result-source">来源：{{ card.source }}</view>
            </view>
          </view>
          <view v-else-if="!searching" class="empty-note">换一个更具体的位置或名称试试</view>
          <view id="conversation-end" class="conversation-end"></view>
        </view>
      </scroll-view>

      <view class="composer-wrap">
        <view class="composer">
          <view class="search-mark" />
          <input v-model="query" class="composer-input" type="text" maxlength="80" confirm-type="send" placeholder="例如：久坐后腰骶部不舒服" @focus="openChat" @confirm="submitSearch" />
          <view :class="['send-button',query.trim()?'':'disabled']" @tap="submitSearch">↑</view>
        </view>
      </view>
    </template>

    <template v-else>
      <view class="body-header">
        <view><view class="body-title">点击身体位置</view><view class="body-copy">选择你关心的部位</view></view>
      </view>
      <scroll-view class="body-scroll" scroll-y :show-scrollbar="false"><body-figure :selected="selectedArea" @select="onSelectArea" /></scroll-view>
    </template>

    <bottom-nav active="home" />

    <disclaimer-bar v-if="showSplash" mode="splash" @confirm="confirmSplash" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { appState } from '../../utils/app-state'
import { RED_FLAGS, SAFETY_STOP_TEXT } from '../../data/compliance'
import { AREAS } from '../../data/areas'
import { PublishedContentItem } from '../../typings/models'
import { decisionFacts, getPublishedContents, getPublishedMethods, searchPublishedContents, syncPublishedContents } from '../../utils/content'

type ResultCard={id:string;type:'method'|'article';name:string;description:string;facts:string[];source:string}

const mode=ref<'search'|'body'>('search')
const query=ref('')
const submittedQuery=ref('')
const cards=ref<ResultCard[]>([])
const searching=ref(false)
const selectedArea=ref('')
const showSplash=ref(false)
const scrollTarget=ref('')
const suggestions=ref<string[]>([])
let navigatingArea=false

onShow(async()=>{
  showSplash.value=!appState.splashConfirmed
  try{await syncPublishedContents()}catch(e){/* 离线时继续使用上次成功同步的已发布内容。 */}
  refreshSuggestions()
})

function refreshSuggestions(){
  const candidates=getPublishedMethods().flatMap((item)=>[
    ...item.keywords,
    ...item.areaIds.map((id)=>AREAS.find((area)=>area.id===id)?.name||'')
  ]).map((value)=>String(value||'').trim()).filter((value)=>value.length>=2&&value.length<=8)
  suggestions.value=Array.from(new Set(candidates)).slice(0,3)
}

function buildCards(items:PublishedContentItem[]):ResultCard[]{
  return items.map((item)=>({
    id:item.id,type:item.type,name:item.title,description:item.summary || (item.type==='article'?'阅读这篇青囊文集文章':'查看这项养护方法的完整说明'),
    source:[item.anthology?.columnName,item.source.platform,item.source.author].filter(Boolean).join(' · '),
    facts:decisionFacts(item)
  }))
}

async function submitSearch(){
  const text=query.value.trim()
  if(!text||searching.value)return
  uni.hideKeyboard()
  if(RED_FLAGS.some((word)=>text.includes(word))){uni.showModal({title:'请先停一下',content:SAFETY_STOP_TEXT,showCancel:false,confirmText:'我知道了'});return}
  submittedQuery.value=text
  cards.value=[]
  query.value=''
  searching.value=true
  try{await syncPublishedContents()}catch(e){/* 离线时继续使用上次成功同步的已发布内容。 */}
  const result=searchPublishedContents(getPublishedContents(),text)
  cards.value=buildCards(result)
  searching.value=false
  scrollTarget.value=''
  setTimeout(()=>{scrollTarget.value='conversation-end'},50)
}
function touchFeedback(){try{uni.vibrateShort({type:'light'})}catch(e){/* 浏览器不支持振动时忽略。 */}}
function setMode(value:'search'|'body'){if(mode.value===value)return;touchFeedback();mode.value=value}
function useSuggestion(text:string){touchFeedback();query.value=text;submitSearch()}
function openChat(){
  uni.navigateTo({url:`/pages/chat/chat${query.value.trim()?`?q=${encodeURIComponent(query.value.trim())}`:''}`})
}
function openCard(card:ResultCard){
  uni.navigateTo({url:`/pages/problem/detail?id=${encodeURIComponent(card.id)}`})
}
async function onSelectArea(event:any){
  if(navigatingArea)return
  navigatingArea=true;selectedArea.value=event.zoneId
  const area=AREAS.find((item)=>item.id===event.areaId)
  uni.navigateTo({
    url:`/pages/chat/chat?areaId=${encodeURIComponent(event.areaId)}&areaName=${encodeURIComponent(area?.name||event.zoneName||'身体部位')}`,
    complete:()=>{navigatingArea=false}
  })
}
function confirmSplash(){showSplash.value=false;appState.splashConfirmed=true}
</script>

<style scoped>
.page{
  height:100%!important;
  min-height:0!important;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  background:var(--c-paper)
}
.mode-header{position:relative;z-index:10;flex:0 0 auto;display:flex;justify-content:center;padding:14rpx 28rpx 16rpx;border-bottom:2rpx solid rgba(70,77,61,.08);background:rgba(255,255,255,.94)}.mode-switch{display:grid;grid-template-columns:1fr 1fr;width:310rpx;padding:5rpx;border-radius:18rpx;background:#E8ECEA}.mode-item{padding:10rpx 16rpx;text-align:center;border-radius:14rpx;font-size:21rpx;color:var(--c-ink-soft);transition:all .18s ease}.mode-item.active{background:#FFFFFF;color:var(--c-bamboo-deep);font-weight:720;box-shadow:0 3rpx 12rpx rgba(24,35,30,.09)}
.conversation{flex:1;min-height:0}.welcome{position:relative;min-height:100%;box-sizing:border-box;display:flex;align-items:stretch;flex-direction:column;padding:52rpx 36rpx 28rpx;overflow:hidden;text-align:left;background:radial-gradient(circle at 86% 9%,rgba(236,177,68,.31),transparent 23%),radial-gradient(circle at 8% 48%,rgba(72,129,97,.18),transparent 31%),linear-gradient(155deg,#fbf5e8 0%,#f6efdd 53%,#ede3cd 100%);animation:chatFadeUp .46s cubic-bezier(.22,.72,.3,1) both}.welcome:after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.22;background-image:repeating-linear-gradient(18deg,rgba(71,70,53,.09) 0,rgba(71,70,53,.09) 1rpx,transparent 1rpx,transparent 7rpx)}.hero-copy{position:relative;z-index:3;width:69%}.eyebrow{display:flex;align-items:center;gap:15rpx;color:var(--c-ginger);font-size:23rpx;font-weight:730;letter-spacing:6rpx}.eyebrow-line{width:76rpx;height:3rpx;border-radius:4rpx;background:var(--c-ginger);transform:rotate(-4deg)}.welcome-title{margin-top:22rpx;font-family:'Songti SC','STSong','Noto Serif CJK SC',serif;font-size:51rpx;line-height:1.3;font-weight:720;letter-spacing:1rpx;color:#1f4036;animation:chatFadeUp .42s ease 110ms both}.welcome-title text{color:var(--c-ginger)}.welcome-copy{margin-top:18rpx;max-width:455rpx;font-size:22rpx;line-height:1.75;color:#607168;animation:chatFadeUp .42s ease 160ms both}.paint-sun{position:absolute;z-index:1;right:54rpx;top:72rpx;width:122rpx;height:122rpx;border-radius:49% 44% 53% 46%;background:radial-gradient(circle at 38% 34%,#f4cb67,#d88a35 64%,#bd6633);opacity:.82;box-shadow:0 0 36rpx rgba(221,143,49,.25);transform:rotate(-9deg)}.paint-leaf{position:absolute;z-index:2;width:62rpx;height:152rpx;border-radius:90% 8% 90% 8%;background:linear-gradient(145deg,#709b59,#286651 73%);opacity:.86;box-shadow:inset 10rpx 4rpx 0 rgba(255,223,105,.14)}.leaf-one{right:10rpx;top:205rpx;transform:rotate(23deg)}.leaf-two{right:103rpx;top:254rpx;width:43rpx;height:103rpx;transform:rotate(54deg);background:linear-gradient(145deg,#d9a245,#a95938)}.paint-scene{position:relative;z-index:2;flex:1;min-height:330rpx;margin:8rpx -36rpx 0;overflow:hidden}.scene-hill{position:absolute;border-radius:55% 60% 0 0;filter:saturate(1.08)}.hill-back{left:-65rpx;right:160rpx;bottom:-62rpx;height:300rpx;background:linear-gradient(155deg,#a4bd78,#4f805f 68%);transform:rotate(3deg);opacity:.72}.hill-front{left:160rpx;right:-85rpx;bottom:-98rpx;height:325rpx;background:linear-gradient(160deg,#d2a646,#b8693e 57%,#734c3b);transform:rotate(-5deg);opacity:.87}.scene-figure{position:absolute;z-index:2;right:151rpx;bottom:100rpx;width:76rpx;height:151rpx;transform:rotate(2deg)}.figure-head{position:absolute;left:23rpx;top:0;width:33rpx;height:36rpx;border-radius:50% 46% 54% 48%;background:#c98152}.figure-body{position:absolute;left:10rpx;top:30rpx;width:57rpx;height:93rpx;border-radius:48% 52% 23% 25%;background:linear-gradient(110deg,#f2dfb6,#d99a66 65%,#445b50);transform:skew(-4deg)}.figure-arm{position:absolute;left:-3rpx;top:49rpx;width:59rpx;height:18rpx;border-radius:50%;background:#dfb078;transform:rotate(28deg);transform-origin:right center}.scene-branch{position:absolute;z-index:2;left:21rpx;bottom:80rpx;width:127rpx;height:63rpx;border-bottom:6rpx solid #244f41;transform:rotate(10deg)}.scene-branch view{position:absolute;width:21rpx;height:44rpx;border-radius:90% 10% 90% 10%;background:#396c4e}.scene-branch view:nth-child(1){left:18rpx;top:8rpx;transform:rotate(-38deg)}.scene-branch view:nth-child(2){left:55rpx;top:0;transform:rotate(18deg)}.scene-branch view:nth-child(3){left:92rpx;top:11rpx;transform:rotate(43deg)}.suggestions{position:relative;z-index:4;display:flex;align-items:center;gap:10rpx;margin:0 10rpx;padding:16rpx 20rpx;border:2rpx solid rgba(67,91,70,.11);border-radius:24rpx;background:rgba(255,253,247,.72);box-shadow:0 9rpx 28rpx rgba(68,61,43,.07)}.suggestion-label{font-size:19rpx;color:#86877c}.suggestion{padding:9rpx 16rpx;border:2rpx solid rgba(59,108,82,.16);border-radius:999rpx;background:rgba(255,253,247,.8);font-size:20rpx;color:var(--c-bamboo-deep);animation:chipArrive .38s ease both}.suggestion text{margin-left:5rpx;color:var(--c-ginger)}
.messages{padding:32rpx 34rpx 40rpx}.user-row{display:flex;justify-content:flex-end;animation:messageIn .34s ease both}.user-bubble{max-width:76%;padding:17rpx 22rpx;border-radius:24rpx 8rpx 24rpx 24rpx;background:var(--c-bamboo-deep);color:#fff;font-size:24rpx;line-height:1.55}.assistant-row{display:flex;align-items:flex-start;gap:13rpx;margin-top:24rpx;animation:messageIn .38s ease 70ms both}.assistant-avatar{flex:0 0 48rpx;width:48rpx;height:48rpx;display:grid;place-items:center;border-radius:16rpx 16rpx 16rpx 5rpx;background:var(--c-green-soft);color:var(--c-bamboo-deep);font-size:18rpx;font-weight:720}.assistant-bubble{padding:13rpx 18rpx;border-radius:7rpx 20rpx 20rpx 20rpx;background:var(--c-card);font-size:21rpx;color:var(--c-ink-soft)}
.result-list{display:grid;gap:13rpx;margin-top:22rpx;padding-left:61rpx}.result-card{padding:24rpx 25rpx;border:2rpx solid var(--c-line);border-radius:25rpx;background:var(--c-card);box-shadow:0 10rpx 28rpx rgba(35,83,63,.05);animation:cardArrive .4s cubic-bezier(.22,.72,.3,1) both}.result-card:active{transform:scale(.99)}.result-meta{display:flex;align-items:center}.result-icon{width:36rpx;height:36rpx;display:grid;place-items:center;border-radius:11rpx;background:var(--c-green-soft);color:var(--c-bamboo);font-size:17rpx;font-weight:700}.result-icon.protocol{background:#E9F1ED;color:#347258}.result-icon.source{background:#EEF0EF;color:#68716C}.result-type{margin-left:10rpx;font-size:18rpx;color:var(--c-ink-faint)}.result-arrow{margin-left:auto;font-size:32rpx;color:var(--c-ink-faint)}.result-name{margin-top:12rpx;font-size:28rpx;line-height:1.4;font-weight:710}.result-copy{margin-top:6rpx;font-size:21rpx;line-height:1.6;color:var(--c-ink-soft)}.result-source{margin-top:12rpx;font-size:17rpx;line-height:1.45;color:var(--c-ink-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.empty-note{margin:18rpx 0 0 61rpx;font-size:20rpx;color:var(--c-ink-faint);animation:chatFadeUp .35s ease both}.conversation-end{height:2rpx}
.decision-row{display:flex;flex-wrap:wrap;gap:8rpx;margin-top:16rpx}.decision-row text{padding:6rpx 11rpx;border-radius:999rpx;background:#F0F4F2;color:#52655C;font-size:17rpx;line-height:1.35}
.composer-wrap{position:relative;z-index:11;flex:0 0 auto;padding:14rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));border-top:2rpx solid rgba(83,73,49,.1);background:#fffdf7;box-shadow:0 -10rpx 30rpx rgba(24,35,30,.035);animation:composerRise .42s cubic-bezier(.22,.72,.3,1) both}.composer{display:flex;align-items:flex-end;gap:8rpx;padding:11rpx 11rpx 11rpx 23rpx;border:2rpx solid rgba(52,114,88,.19);border-radius:30rpx;background:#f8f3e8;box-shadow:0 8rpx 24rpx rgba(35,83,63,.07)}.composer-input{flex:1;min-height:54rpx;max-height:150rpx;padding:8rpx 0;box-sizing:border-box;font-size:25rpx;line-height:1.45;color:var(--c-ink)}.send-button{width:60rpx;height:60rpx;display:grid;place-items:center;border-radius:21rpx 21rpx 21rpx 7rpx;background:linear-gradient(140deg,#2d745d,#1e5144);color:#fff;font-size:31rpx;font-weight:720}.send-button.disabled{opacity:.22}
.body-header{flex:0 0 auto;padding:24rpx 34rpx 16rpx;text-align:center}.body-title{font-size:31rpx;font-weight:730}.body-copy{font-size:20rpx;color:var(--c-ink-soft)}.body-scroll{flex:1;min-height:0;box-sizing:border-box;margin:0 24rpx 20rpx;width:auto;border:2rpx solid rgba(63,107,80,.16);border-radius:28rpx;background:var(--c-card)}
/* 首屏保持一块连续、安静的阅读平面；装饰只提供轻微色温。 */
.welcome{justify-content:center;padding:48rpx 48rpx 88rpx;background:linear-gradient(180deg,#FBFCF8 0%,#E9F1EC 100%)}
.welcome:before{content:'';position:absolute;z-index:0;left:-110rpx;bottom:70rpx;width:410rpx;height:310rpx;border-radius:50%;background:radial-gradient(ellipse,rgba(69,128,96,.15),rgba(69,128,96,0) 70%);transform:rotate(-8deg)}
.welcome:after{opacity:.055;background-image:repeating-linear-gradient(18deg,rgba(71,70,53,.12) 0,rgba(71,70,53,.12) 1rpx,transparent 1rpx,transparent 9rpx)}
.hero-copy{width:100%;max-width:590rpx}
.welcome-title{font-size:47rpx;line-height:1.34}
.welcome-copy{max-width:530rpx;color:#536E63}
.paint-sun{right:52rpx;top:72rpx;width:106rpx;height:106rpx;opacity:.22;filter:blur(2rpx);box-shadow:none}
.paint-leaf{opacity:.18;filter:blur(1rpx)}
.leaf-one{right:-8rpx;top:205rpx}
.leaf-two{right:82rpx;top:250rpx}
.suggestions{align-self:flex-start;margin:54rpx 0 0;padding:0;border:0;background:transparent;box-shadow:none}
.suggestion-label{color:#687A71}
.suggestion{background:rgba(240,247,242,.92);border-color:rgba(35,107,87,.24);color:#124B3D}
.composer-wrap{border-top:0;background:#E9F1EC;box-shadow:0 -18rpx 36rpx rgba(35,55,46,.045)}
.composer{background:#FFFFFF;border-color:rgba(35,107,87,.25);box-shadow:0 6rpx 20rpx rgba(31,80,62,.08)}
@keyframes chatFadeUp{from{opacity:0;transform:translateY(16rpx)}to{opacity:1;transform:translateY(0)}}
@keyframes markArrive{from{opacity:0;transform:translateY(12rpx) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes chipArrive{from{opacity:0;transform:translateY(9rpx)}to{opacity:1;transform:translateY(0)}}
@keyframes composerRise{from{opacity:0;transform:translateY(22rpx)}to{opacity:1;transform:translateY(0)}}
@keyframes messageIn{from{opacity:0;transform:translateY(10rpx)}to{opacity:1;transform:translateY(0)}}
@keyframes cardArrive{from{opacity:0;transform:translateY(14rpx) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media (prefers-reduced-motion:reduce){.welcome,.welcome-mark,.welcome-title,.welcome-copy,.suggestion,.composer-wrap,.user-row,.assistant-row,.result-card,.empty-note{animation:none!important}}
/* Headspace-inspired youthful visual layer: brighter, rounder, still content-first. */
.mode-header{justify-content:space-between;align-items:center;padding:18rpx 28rpx;border:0;background:#FFFDF7}
.brand-lockup{display:flex;align-items:center;gap:12rpx}
.brand-logo{display:block;width:58rpx;height:58rpx;flex:0 0 58rpx}
.brand-name{font-size:23rpx;line-height:1.2;font-weight:800;color:#173F34}.brand-note{margin-top:2rpx;font-size:15rpx;line-height:1.2;color:#789087}
.mode-switch{width:256rpx;padding:5rpx;border-radius:999rpx;background:#F0EEE8}.mode-item{padding:9rpx 12rpx;border-radius:999rpx;font-size:19rpx}.mode-item.active{box-shadow:none}
.welcome{justify-content:flex-start;padding:22rpx 28rpx 48rpx;background:#FFFDF7}.welcome:before,.welcome:after{display:none}
.hero-panel{position:relative;min-height:520rpx;box-sizing:border-box;padding:46rpx 34rpx;overflow:hidden;border-radius:48rpx;background:#F2B84B;box-shadow:0 18rpx 48rpx rgba(99,67,17,.11)}
.hero-panel:after{content:'';position:absolute;right:-46rpx;bottom:-80rpx;width:320rpx;height:270rpx;border-radius:50%;background:#DF755A;transform:rotate(-12deg)}
.hero-copy{position:relative;z-index:4;width:72%;max-width:450rpx}.eyebrow{gap:10rpx;color:#174B3E;font-size:19rpx;font-weight:760;letter-spacing:1rpx}.eyebrow-dot{width:13rpx;height:13rpx;border-radius:50%;background:#174B3E;box-shadow:0 0 0 7rpx rgba(255,255,255,.26)}
.welcome-title{margin-top:30rpx;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;font-size:54rpx;line-height:1.18;font-weight:850;letter-spacing:-2rpx;color:#183E34}.welcome-title text{color:#FFFDF7}.welcome-copy{margin-top:24rpx;max-width:420rpx;font-size:22rpx;line-height:1.65;font-weight:520;color:#315B50}
.paint-sun{right:28rpx;top:36rpx;width:132rpx;height:132rpx;border-radius:48% 52% 46% 54%;background:#FFF4D0;opacity:1;filter:none;box-shadow:none;transform:rotate(7deg);animation:floatBuddy 4s ease-in-out infinite}.sun-eye{position:absolute;top:48rpx;width:10rpx;height:14rpx;border-radius:50%;background:#173F34}.sun-eye.left{left:40rpx}.sun-eye.right{right:39rpx}.sun-smile{position:absolute;left:48rpx;top:70rpx;width:36rpx;height:18rpx;border-bottom:5rpx solid #173F34;border-radius:0 0 30rpx 30rpx}
.paint-leaf{z-index:3;opacity:1;filter:none;box-shadow:none;background:#23715C}.leaf-one{right:38rpx;top:218rpx;width:58rpx;height:150rpx;transform:rotate(25deg)}.leaf-two{right:122rpx;top:300rpx;width:44rpx;height:112rpx;transform:rotate(58deg);background:#8DC5A7}
.suggestions{align-self:stretch;display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx;margin:26rpx 0 0;padding:0;border:0;background:transparent;box-shadow:none}.suggestion-label{grid-column:1/-1;margin:0 4rpx 3rpx;font-size:20rpx;font-weight:650;color:#557067}.suggestion{display:flex;align-items:center;justify-content:space-between;padding:22rpx 18rpx;border:0;border-radius:26rpx;background:#DCEEDB;color:#174B3E;font-size:22rpx;font-weight:720}.suggestion:nth-child(3){background:#E9DDF7;color:#55436C}.suggestion:nth-child(4){background:#F6D8CD;color:#754234}.suggestion text{font-size:29rpx;color:inherit}
.composer-wrap{padding:12rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));background:#FFFDF7;box-shadow:0 -18rpx 36rpx rgba(33,55,47,.04)}.composer{align-items:center;padding:10rpx 10rpx 10rpx 20rpx;border:0;border-radius:999rpx;background:#FFFFFF;box-shadow:0 8rpx 30rpx rgba(26,65,52,.12)}
.search-mark{flex:0 0 auto;width:22rpx;height:22rpx;border:4rpx solid #39665A;border-radius:50%;position:relative}.search-mark:after{content:'';position:absolute;right:-9rpx;bottom:-6rpx;width:10rpx;height:4rpx;border-radius:4rpx;background:#39665A;transform:rotate(45deg)}.composer-input{height:60rpx;min-height:60rpx;padding:0;line-height:60rpx;font-size:22rpx;vertical-align:middle}.send-button{border-radius:50%;background:#195946;box-shadow:0 6rpx 16rpx rgba(25,89,70,.2)}
.messages{background:#F8F4EA}.result-card{border:0;box-shadow:0 12rpx 34rpx rgba(37,68,56,.08)}.body-header{margin:8rpx 28rpx 18rpx;padding:28rpx;border-radius:32rpx;background:#E9DDF7;text-align:left}.body-scroll{border:0;border-radius:36rpx;box-shadow:0 12rpx 32rpx rgba(37,68,56,.07)}
@keyframes floatBuddy{0%,100%{transform:translateY(0) rotate(7deg)}50%{transform:translateY(10rpx) rotate(2deg)}}
@media(max-height:700px){.hero-panel{min-height:420rpx}.welcome-title{font-size:48rpx}.welcome-copy{margin-top:16rpx}.leaf-one{top:190rpx}.leaf-two{top:250rpx}}
</style>
<style scoped>
/* xqn-search-interaction */
.mode-item,.suggestion,.send-button,.result-card{transition:transform var(--motion-press) ease,background-color var(--motion-switch) ease,box-shadow var(--motion-press) ease}.mode-item:active,.suggestion:active,.send-button:not(.disabled):active{transform:scale(.96)}.result-card:active{transform:scale(.985)}
.assistant-bubble.searching{display:flex;align-items:center;gap:13rpx}.searching-dots{display:flex;align-items:center;gap:5rpx}.searching-dots i{width:8rpx;height:8rpx;border-radius:50%;background:var(--c-candy-green);animation:searchDot 1.15s ease-in-out infinite}.searching-dots i:nth-child(2){animation-delay:140ms}.searching-dots i:nth-child(3){animation-delay:280ms}
@keyframes searchDot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-6rpx)}}
@media(prefers-reduced-motion:reduce){.mode-item,.suggestion,.send-button,.result-card,.searching-dots i{animation:none!important;transition:none!important}.searching-dots i{opacity:.7}}
</style>
