<template>
  <view v-if="item" :class="['page',item.type==='article'?'article-page':'method-page',`reading-${readingSize}`]">
    <view class="hero-card">
      <view class="hero-meta">
        <view :class="['type-badge',item.type]">{{ item.type==='article'?'青囊文集':'养护方法' }}</view>
      </view>
      <view class="title">{{ item.title }}</view>
      <view class="description">{{ item.summary }}</view>
      <view v-if="item.type==='article'" class="reading-meta">{{ item.source.author||'罾事物语' }} · 约 {{ readingTime }} 分钟</view>
      <view v-if="areaLabels.length" class="area-row"><text v-for="name in areaLabels" :key="name">{{ name }}</text></view>
      <view class="reading-actions">
        <view :class="['reading-action', isSaved?'saved':'']" @tap="toggleSaved">{{ isSaved?'✓ 已收藏':'☆ 收藏' }}</view>
        <view class="reading-action" @tap="noteVisible=true">▱ {{ noteText?'查看笔记':'写笔记' }}</view>
      </view>
    </view>

    <view v-if="item.type==='article'" class="article-notice">本文用于资料阅读，文中经验不自动成为可自行尝试的养护方法。</view>
    <view v-if="item.type==='article'" class="reading-tools">
      <text>阅读字号</text><view><button v-for="option in readingSizes" :key="option.value" :class="readingSize===option.value?'active':''" @tap="setReadingSize(option.value)">{{ option.label }}</button></view>
    </view>

    <scroll-view v-if="item.type==='method'&&availableTabs.length>1" class="section-tabs" scroll-x :show-scrollbar="false">
      <view class="section-tabs-row">
        <view v-for="tab in availableTabs" :key="tab.key" :class="['section-tab',activeTab===tab.key?'active':'']" @tap="selectTab(tab.key)">{{ tab.label }}</view>
      </view>
    </scroll-view>

    <view :key="activeTab" :class="['content-card',activeTab==='risk'?'risk-card':'']">
      <view v-if="item.type==='method'&&availableTabs.length>1" class="content-heading">{{ activeTabLabel }}</view>
      <article-reader v-if="activeTab==='content'&&item.type==='article'" :html="item.contentHtml" />
      <rich-text v-else-if="activeTab==='content'" class="content-richtext" :nodes="item.contentHtml" />

      <view v-else-if="activeTab==='scope'" class="list-stack">
        <view v-for="line in item.usageScope" :key="line" class="list-row"><view class="list-dot">✓</view><text>{{ line }}</text></view>
      </view>

      <view v-else-if="activeTab==='notice'" class="list-stack">
        <view v-for="line in item.notices" :key="line" class="list-row"><view class="list-dot notice">!</view><text>{{ line }}</text></view>
      </view>

      <view v-else-if="activeTab==='risk'" class="risk-groups">
        <view v-if="item.outsideScope.length" class="risk-group">
          <view class="group-title">不适合自行尝试</view>
          <view v-for="line in item.outsideScope" :key="line" class="risk-line">{{ line }}</view>
        </view>
        <view v-if="item.helpConditions.length" class="risk-group urgent">
          <view class="group-title">出现这些情况请停止并寻求专业帮助</view>
          <view v-for="line in item.helpConditions" :key="line" class="risk-line">{{ line }}</view>
        </view>
      </view>

      <view v-else-if="activeTab==='cases'" class="case-list">
        <view class="case-disclaimer">以下均为个体经验，仅供参考，不代表普遍效果。</view>
        <rich-text class="content-richtext" :nodes="item.casesHtml" />
      </view>
    </view>

    <view v-if="item.type==='article'&&hasRisk" class="article-boundary">
      <view class="content-heading">阅读提示</view>
      <view v-for="line in [...item.outsideScope,...item.helpConditions]" :key="line" class="boundary-line">{{ line }}</view>
    </view>
    <view v-if="item.type==='article'&&(previousArticle||nextArticle)" class="article-navigation">
      <view :class="['article-nav-item',!previousArticle?'disabled':'']" @tap="openArticle(previousArticle)"><text>上一篇</text><strong>{{ previousArticle?.title||'已经是第一篇' }}</strong></view>
      <view :class="['article-nav-item','next',!nextArticle?'disabled':'']" @tap="openArticle(nextArticle)"><text>下一篇</text><strong>{{ nextArticle?.title||'已经是最后一篇' }}</strong></view>
    </view>

    <view v-if="source" class="source-link" @tap="openSource">
      <view class="source-tag">来源</view>
      <view class="source-info"><view>{{ source.title }}</view><text>已核验 · 在当前页查看</text></view>
      <view class="source-open">⌃</view>
    </view>

    <disclaimer-bar mode="bar" />
    <source-sheet :visible="sourceSheetVisible" :source="source" @close="sourceSheetVisible=false" />
    <view v-if="noteVisible" class="note-mask" @tap="noteVisible=false">
      <view class="note-sheet" @tap.stop>
        <view class="note-head"><strong>我的笔记</strong><text @tap="noteVisible=false">×</text></view>
        <textarea v-model="noteDraft" maxlength="1000" placeholder="记下这篇资料里值得回看的内容…" />
        <view class="note-foot"><text>仅保存在当前设备</text><button @tap="saveCurrentNote">保存笔记</button></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ArticleReader from '../../components/article-reader.vue'
import { onLoad } from '@dcloudio/uni-app'
import { KnowledgeSource, PublishedContentItem } from '../../typings/models'
import { areaNames, fetchPublishedContent, getPublishedArticles, getPublishedContents, readingMinutes, syncPublishedContents } from '../../utils/content'
import { rememberReading } from '../../utils/anthology'
import { getNote, isFavorite, saveNote, toggleFavorite } from '../../utils/reading'

type TabKey='content'|'scope'|'notice'|'risk'|'cases'
const item=ref<PublishedContentItem|null>(null)
const activeTab=ref<TabKey>('content')
const sourceSheetVisible=ref(false)
const readingSizes=[{value:'small',label:'小'},{value:'medium',label:'舒适'},{value:'large',label:'大'}] as const
type ReadingSize=typeof readingSizes[number]['value']
const readingSize=ref<ReadingSize>('medium')
const isSaved=ref(false), noteVisible=ref(false), noteDraft=ref(''), noteText=ref('')

const areaLabels=computed(()=>item.value?areaNames(item.value):[])
const hasRisk=computed(()=>Boolean(item.value&&(item.value.outsideScope.length||item.value.helpConditions.length)))
const readingTime=computed(()=>item.value?readingMinutes(item.value):1)
const articleNeighbors=computed(()=>{
  if(!item.value||item.value.type!=='article')return{previous:null,next:null}
  const values=getPublishedArticles().sort((a,b)=>(b.publishedAt||0)-(a.publishedAt||0))
  const index=values.findIndex(value=>value.id===item.value?.id)
  return{previous:index>0?values[index-1]:null,next:index>=0&&index<values.length-1?values[index+1]:null}
})
const previousArticle=computed(()=>articleNeighbors.value.previous)
const nextArticle=computed(()=>articleNeighbors.value.next)
const availableTabs=computed(()=>{
  if(!item.value)return[]
  const current=item.value
  const tabs:Array<{key:TabKey;label:string}>=[]
  if(current.contentHtml)tabs.push({key:'content',label:current.type==='article'?'内容':'方法'})
  if(current.usageScope.length)tabs.push({key:'scope',label:'使用范围'})
  if(current.notices.length)tabs.push({key:'notice',label:'注意事项'})
  if(current.outsideScope.length||current.helpConditions.length)tabs.push({key:'risk',label:'风险边界'})
  if(current.type==='method'&&current.casesHtml)tabs.push({key:'cases',label:'案例集'})
  return tabs
})
const activeTabLabel=computed(()=>availableTabs.value.find((tab)=>tab.key===activeTab.value)?.label||'内容')
const source=computed<KnowledgeSource|null>(()=>{
  if(!item.value?.source.title)return null
  const value=item.value
  return{
    id:`source-${value.id}`,title:value.source.title,authorOrSpeaker:value.source.author,
    publisherOrPlatform:value.source.platform,directUrl:value.source.url,
    originalText:value.source.originalText,sourceType:value.source.url?'web_source':'practitioner_experience',
    verificationStatus:'verified',status:'published',createdAt:value.publishedAt||Date.now(),
    reviewedAt:value.reviewedAt,version:1,notes:value.source.notes
  }
})

onLoad(async(options:any)=>{
  const saved=uni.getStorageSync('xqn-reading-size')
  if(readingSizes.some(option=>option.value===saved))readingSize.value=saved
  try{await syncPublishedContents()}catch(e){/* 离线时使用上次同步内容。 */}
  let found=getPublishedContents().find((entry)=>entry.id===String(options.id||''))||null
  try{found=await fetchPublishedContent(String(options.id||''))}catch(e){/* 使用列表缓存作为离线降级 */}
  if(!found){uni.showToast({title:'内容暂不可用',icon:'none'});setTimeout(()=>uni.navigateBack(),650);return}
  item.value=found
  isSaved.value=isFavorite(found.id)
  noteText.value=getNote(found.id)
  noteDraft.value=noteText.value
  if(found.type==='article')rememberReading(found.id)
  activeTab.value=availableTabs.value[0]?.key||'content'
  uni.setNavigationBarTitle({title:found.title})
})

function selectTab(value:TabKey){if(activeTab.value===value)return;try{uni.vibrateShort({type:'light'})}catch(e){}activeTab.value=value}
function openSource(){try{uni.vibrateShort({type:'light'})}catch(e){}sourceSheetVisible.value=true}
function setReadingSize(value:ReadingSize){readingSize.value=value;uni.setStorageSync('xqn-reading-size',value)}
function toggleSaved(){if(!item.value)return;try{isSaved.value=toggleFavorite(item.value.id,item.value.title);uni.showToast({title:isSaved.value?'已收藏':'已取消收藏',icon:'none'})}catch(e){uni.showToast({title:'保存失败，请检查浏览器存储空间',icon:'none'})}}
function saveCurrentNote(){if(!item.value)return;try{saveNote(item.value.id,noteDraft.value,item.value.title);noteText.value=getNote(item.value.id);noteVisible.value=false;uni.showToast({title:'笔记已保存',icon:'none'})}catch(e){uni.showToast({title:'保存失败，请先复制笔记保留',icon:'none'})}}
function openArticle(target:PublishedContentItem|null){if(!target)return;uni.redirectTo({url:`/pages/problem/detail?id=${encodeURIComponent(target.id)}`})}
</script>

<style scoped>
.article-page.reading-small :deep(.article-reader){font-size:16px}.article-page.reading-medium :deep(.article-reader){font-size:18px}.article-page.reading-large :deep(.article-reader){font-size:20px}
.page{min-height:100vh;box-sizing:border-box;padding:26rpx 24rpx 130rpx;background:#F3F6F5;color:var(--c-ink)}
.hero-card,.content-card,.source-link{border:2rpx solid rgba(32,72,56,.09);background:#FFF;box-shadow:0 12rpx 34rpx rgba(28,50,40,.045)}
.hero-card{padding:32rpx 30rpx;border-radius:30rpx}.hero-meta{display:flex;align-items:center;gap:10rpx}.type-badge,.access-badge{padding:7rpx 13rpx;border-radius:999rpx;font-size:18rpx;font-weight:720}.type-badge{background:#DCEBE5;color:#185744}.type-badge.article{background:#E8EDF2;color:#445C6E}.access-badge{background:#F3F4F3;color:#6D7973}.title{margin-top:18rpx;font-size:45rpx;line-height:1.3;font-weight:780}.description{margin-top:12rpx;font-size:23rpx;line-height:1.7;color:var(--c-ink-soft)}.area-row{display:flex;flex-wrap:wrap;gap:8rpx;margin-top:20rpx}.area-row text{padding:7rpx 13rpx;border-radius:999rpx;background:#F2F6F4;color:#52685E;font-size:18rpx}
.reading-actions{display:flex;gap:10rpx;margin-top:22rpx}.reading-action{padding:10rpx 18rpx;border-radius:999rpx;background:rgba(255,255,255,.72);color:#567067;font-size:19rpx}.reading-action.saved{background:#DCEEDB;color:#195946;font-weight:700}
.locked-card{margin-top:18rpx;padding:36rpx 30rpx;border-radius:29rpx;background:linear-gradient(145deg,#236B55,#123F33);color:#fff;text-align:center}.lock-mark{width:62rpx;height:62rpx;margin:auto;display:grid;place-items:center;border-radius:20rpx;background:rgba(255,255,255,.14);font-size:23rpx;font-weight:760}.locked-title{margin-top:17rpx;font-size:29rpx;font-weight:750}.locked-copy{margin:9rpx auto 0;max-width:550rpx;font-size:21rpx;line-height:1.65;color:rgba(255,255,255,.72)}.unlock-button{margin-top:23rpx;padding:17rpx;border-radius:19rpx;background:#fff;color:#185744;font-size:23rpx;font-weight:740}
.section-tabs{width:100%;margin-top:18rpx;white-space:nowrap}.section-tabs-row{display:inline-flex;gap:7rpx;min-width:100%;box-sizing:border-box;padding:7rpx;border-radius:23rpx;background:#E4EAE7}.section-tab{flex:0 0 auto;min-width:120rpx;padding:18rpx 22rpx;text-align:center;border-radius:18rpx;font-size:20rpx;color:#607168}.section-tab.active{background:#FFF;color:#185744;font-weight:750;box-shadow:0 5rpx 16rpx rgba(28,50,40,.09)}
.content-card{margin-top:12rpx;padding:29rpx 30rpx;border-radius:28rpx;min-height:150rpx;animation:tabIn .2s ease}.content-heading{margin-bottom:20rpx;font-size:29rpx;font-weight:750}.content-richtext{display:block;font-size:24rpx;line-height:1.88;color:#35483F}.content-richtext :deep(img){display:block;max-width:100%;height:auto;margin:25rpx 0 9rpx;border-radius:22rpx}.content-richtext :deep(video){width:100%;margin:25rpx 0;border-radius:22rpx}.content-richtext :deep(h2),.content-richtext :deep(h3){margin:30rpx 0 10rpx;color:var(--c-ink)}.content-richtext :deep(blockquote){margin:20rpx 0;padding:13rpx 20rpx;border-left:6rpx solid #276D57;background:#EAF3EF;color:var(--c-ink-soft)}
.list-stack{display:grid;gap:15rpx}.list-row{display:flex;align-items:flex-start;gap:15rpx;font-size:23rpx;line-height:1.72;color:#405047}.list-dot{flex:0 0 39rpx;width:39rpx;height:39rpx;display:grid;place-items:center;margin-top:2rpx;border-radius:50%;background:#DDEDE6;color:#176047;font-size:18rpx;font-weight:800}.list-dot.notice{background:#F6EDE0;color:#9A641E}
.risk-card{border-color:#E8D8D3}.risk-groups{display:grid;gap:18rpx}.risk-group{padding:21rpx;border-radius:20rpx;background:#F6F3F1}.risk-group.urgent{background:#F8ECE9}.group-title{font-size:22rpx;font-weight:750;color:#744A3F}.risk-line{position:relative;margin-top:10rpx;padding-left:18rpx;font-size:21rpx;line-height:1.7;color:#624F49}.risk-line:before{content:'·';position:absolute;left:0}
.case-list{display:grid;gap:20rpx}.case-disclaimer{padding:17rpx 19rpx;border-radius:18rpx;background:#FFF2DC;color:#765D3A;font-size:20rpx;line-height:1.65}
.source-link{display:flex;align-items:center;gap:16rpx;margin-top:18rpx;padding:21rpx 24rpx;border-radius:24rpx}.source-tag{padding:7rpx 12rpx;border-radius:10rpx;background:#DDEDE6;font-size:18rpx;font-weight:720;color:#185744}.source-info{flex:1;min-width:0}.source-info>view{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:21rpx}.source-info text{display:block;margin-top:3rpx;font-size:17rpx;color:var(--c-ink-faint)}.source-open{font-size:30rpx;color:var(--c-ink-faint)}
.note-mask{position:fixed;z-index:80;inset:0;display:flex;align-items:flex-end;background:rgba(24,43,35,.28)}.note-sheet{width:100%;box-sizing:border-box;padding:26rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:30rpx 30rpx 0 0;background:#FFFDFC;box-shadow:0 -12rpx 42rpx rgba(24,43,35,.15)}.note-head{display:flex;align-items:center;justify-content:space-between;color:#243F36}.note-head strong{font-size:28rpx}.note-head text{font-size:38rpx;color:#87938D}.note-sheet textarea{width:100%;height:190rpx;box-sizing:border-box;margin-top:18rpx;padding:18rpx;border-radius:18rpx;background:#F5F7F4;font-size:22rpx;line-height:1.6}.note-foot{display:flex;align-items:center;justify-content:space-between;margin-top:12rpx;color:#89958F;font-size:17rpx}.note-foot button{margin:0;padding:0 22rpx;height:58rpx;line-height:58rpx;border:0;border-radius:999rpx;background:#195946;color:#fff;font-size:19rpx}.note-foot button:after{display:none}
@keyframes tabIn{from{opacity:.35;transform:translateY(5rpx)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.content-card{animation:none}}
</style><style scoped>
/* xqn-warm-candy */
.page{background:var(--c-candy-cream)}.hero-card{position:relative;overflow:hidden;padding:38rpx 32rpx;border:0;border-radius:42rpx;background:#FFDCD1;box-shadow:none}.hero-card:after{content:'';position:absolute;right:-48rpx;top:-55rpx;width:178rpx;height:178rpx;border-radius:50%;background:var(--c-candy-yellow)}
.hero-meta,.hero-card .title,.hero-card .description,.hero-card .area-row{position:relative;z-index:1}.hero-card .title{font-weight:850;letter-spacing:-2rpx;color:#5B3F37}.hero-card .description{color:#795B52}.type-badge{background:#FFF8EA;color:#6D5723}.type-badge.article{background:#F4F0FC;color:#58476E}.area-row text{background:rgba(255,255,255,.58);color:#694C43}
.section-tabs-row{background:#EFE7DC;border-radius:999rpx}.section-tab{border-radius:999rpx}.section-tab.active{box-shadow:none;color:var(--c-candy-green)}
.content-card,.source-link{border:0;border-radius:34rpx;background:#FFFDFC;box-shadow:0 12rpx 30rpx rgba(67,55,45,.07)}.content-richtext :deep(blockquote){border-color:var(--c-candy-green);background:#EDFAF2}.list-dot{background:var(--c-candy-mint)}.list-dot.notice{background:#FFE0C8}.risk-group{background:#FFF2DC}.risk-group.urgent{background:#FFE7E1}.case-card{border:0;background:#F4F0FC}.source-link{background:#F4F0FC}.source-tag{border-radius:999rpx;background:var(--c-candy-lilac);color:#58476E}.locked-card{border-radius:38rpx;background:var(--c-candy-green)}.unlock-button{border-radius:999rpx}
</style>
<style scoped>
@media (min-width: 900px){
  .article-page{max-width:900px;margin:0 auto;padding:34px 54px 150px}
  .article-page .hero-card{padding:30px 0 24px}
  .article-page .title{font-size:42px;line-height:1.35}
  .article-page .description{font-size:18px}
  .article-page .content-card{padding:46px 58px;border-radius:24px}
  .article-page .content-richtext{font-size:18px;line-height:2.05;overflow-wrap:anywhere;word-break:break-word}
  .article-page .content-richtext :deep(img),.article-page .content-richtext :deep(video){display:block;width:auto;max-width:100%;height:auto;margin:26px auto 12px}
  .article-page .content-richtext :deep(table){display:block;max-width:100%;overflow-x:auto}
  .article-page .article-navigation{gap:18px}
}
</style>
<style scoped>
.reading-tools{display:flex;align-items:center;justify-content:space-between;margin-top:14rpx;padding:13rpx 16rpx 13rpx 22rpx;border-radius:999rpx;background:#F3EBDD;color:#746655;font-size:19rpx}.reading-tools>view{display:flex;gap:6rpx}.reading-tools button{margin:0;padding:0 19rpx;height:52rpx;line-height:52rpx;border:0;border-radius:999rpx;background:transparent;color:#746655;font-size:18rpx}.reading-tools button:after{display:none}.reading-tools button.active{background:#FFF;color:#345F50;box-shadow:0 5rpx 13rpx rgba(68,55,40,.09)}
.article-page.reading-small .content-richtext{font-size:24rpx}.article-page.reading-large .content-richtext{font-size:31rpx;line-height:2.06}.article-navigation{display:grid;grid-template-columns:1fr 1fr;gap:13rpx;margin-top:18rpx}.article-nav-item{min-width:0;padding:22rpx;border-radius:25rpx;background:#DCEEDB}.article-nav-item.next{text-align:right;background:#FFDCD1}.article-nav-item text,.article-nav-item strong{display:block}.article-nav-item text{font-size:17rpx;color:#678073}.article-nav-item strong{margin-top:7rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Songti SC','STSong',serif;font-size:20rpx;color:#31483F}.article-nav-item.disabled{opacity:.52}
</style>
<style scoped>
.article-page{padding-left:max(28rpx,calc((100vw - 760px)/2));padding-right:max(28rpx,calc((100vw - 760px)/2));background:#FFF9ED}.article-page .hero-card{background:transparent;padding:38rpx 8rpx 28rpx;border-radius:0}.article-page .hero-card:after{display:none}.article-page .title{font-family:'Songti SC','STSong',serif;font-size:51rpx;line-height:1.42;color:#243F36}.article-page .description{font-size:22rpx;color:#718078}.reading-meta{margin-top:18rpx;font-size:18rpx;color:#87918C}.article-notice{margin-top:10rpx;padding:18rpx 22rpx;border-radius:20rpx;background:#F2E7D2;font-size:19rpx;line-height:1.65;color:#776956}.article-page .content-card{padding:38rpx 34rpx;background:#FFFEFA}.article-page .content-richtext{font-size:27rpx;line-height:2;color:#31443C}.article-page .source-link{background:#F3EBDD}.article-boundary{margin-top:18rpx;padding:25rpx 28rpx;border-radius:25rpx;background:#F3EBDD}.boundary-line{position:relative;margin-top:9rpx;padding-left:18rpx;font-size:20rpx;line-height:1.7;color:#726554}.boundary-line:before{content:'·';position:absolute;left:0}
</style>
<style scoped>
/* xqn-interaction-system */
.section-tab{transition:color var(--motion-switch) ease,background-color var(--motion-switch) ease,transform var(--motion-press) ease}.section-tab:active{transform:scale(.97)}
.content-card{animation:contentEaseIn var(--motion-enter) var(--ease-soft) both}.source-link,.unlock-button{transition:transform var(--motion-press) ease,box-shadow var(--motion-press) ease}.source-link:active,.unlock-button:active{transform:scale(.985)}
@keyframes contentEaseIn{from{opacity:.2;transform:translateY(10rpx)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.section-tab,.content-card,.source-link,.unlock-button{animation:none!important;transition:none!important}}
</style>
