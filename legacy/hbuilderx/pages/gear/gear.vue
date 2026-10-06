<template>
  <view class="page">
    <scroll-view class="reading-scroll" scroll-y :show-scrollbar="false" @scrolltolower="loadMore" lower-threshold="500">
      <view class="masthead">
        <view class="masthead-title"><text class="brand-name">小青囊</text><text class="title-divider">｜</text><text class="section-name">青囊文集</text></view>
        <view class="search-box"><view class="search-icon"/><input v-model="query" placeholder="搜索文章标题或正文内容" confirm-type="search" /></view>
      </view>

      <view v-if="todayItems.length" class="today-section">
        <view class="today-heading"><view><text>今日更新</text><strong>今天新来的文章</strong></view><small>{{ todayItems.length }} 篇</small></view>
        <view class="today-list">
          <view v-for="entry in todayItems" :key="entry.id" class="today-card" @tap="openArticle(entry.id)">
            <image v-if="coverOf(entry)" class="today-cover" :src="coverOf(entry)" mode="aspectFill" />
            <view class="today-copy"><text>{{ columnOf(entry) }}</text><strong>{{ entry.title }}</strong><small>{{ entry.summary || '打开查看全文' }}</small></view>
            <view class="today-arrow">›</view>
          </view>
        </view>
      </view>

      <view v-if="columns.length" class="section">
        <view class="section-heading"><view><text>专栏</text><strong>循着一条线读下去</strong></view><small>{{ columns.length }} 个专栏</small></view>
        <scroll-view class="column-scroll" scroll-x :show-scrollbar="false"><view class="column-row">
          <view :class="['column-card',!activeColumn?'selected':'']" style="background:#E8EEE9" @tap="selectColumn('')"><view class="column-count">{{ articles.length }} 篇</view><view class="column-name">全部文章</view><view class="column-copy">在全部文章中查找</view></view>
          <view v-for="column in columns" :key="column.id" :class="['column-card',activeColumn===column.id?'selected':'']" :style="{background:column.color}" @tap="selectColumn(column.id)"><view class="column-count">{{ column.items.length }} 篇</view><view class="column-name">{{ column.name }}</view><view class="column-copy">{{ column.description }}</view></view>
        </view></scroll-view>
      </view>

      <view class="section article-section">
        <view class="section-heading"><view><text>{{ query.trim()?'搜索结果':'全部文章' }}</text><strong>{{ activeColumnName }}</strong></view></view>
        <view v-if="visibleArticles.length" class="article-list">
          <view v-for="item in visibleArticles" :key="item.id" class="article-card" @tap="openArticle(item.id)">
            <image v-if="coverOf(item)" class="card-cover" :src="coverOf(item)" mode="aspectFill" />
            <view v-else class="card-cover-placeholder"><text>青囊文集</text><strong>{{ columnOf(item) }}</strong></view>
            <view class="card-body"><view class="article-series">{{ columnOf(item) }}</view><view class="article-title">{{ item.title }}</view><view class="article-summary">{{ item.summary }}</view>
            <view class="meta">{{ authorOf(item) }} · 约 {{ minutes(item) }} 分钟 <text>阅读 ›</text></view></view>
          </view>
        </view>
        <view v-else class="empty"><strong>这里还没有文章</strong><text>{{ query.trim()?'换一个关键词试试':'文章发布后会出现在这里。' }}</text></view>
      </view>
    </scroll-view>
    <bottom-nav active="anthology" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { PublishedContentItem } from '../../typings/models'
import { getPublishedArticles, readingMinutes, syncPublishedContents } from '../../utils/content'
import { articleAuthor, buildColumns, continueReadingId, rememberReading } from '../../utils/anthology'

const articles=ref<PublishedContentItem[]>([]),query=ref(''),activeColumn=ref(''),page=ref(1),hasMore=ref(true),loadingMore=ref(false)
const columns=computed(()=>buildColumns(articles.value))
const todayItems=computed(()=>{
  const today=new Date(); const key=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  return articles.value.filter(item=>{if(!item.publishedAt)return false;const date=new Date(item.publishedAt);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`===key})
})
const featured=computed(()=>articles.value[0]||null)
const continueItem=computed(()=>articles.value.find(item=>item.id===continueReadingId())||null)
const activeColumnName=computed(()=>columns.value.find(item=>item.id===activeColumn.value)?.name||'全部文章')
const visibleArticles=computed(()=>{
  const term=query.value.trim().toLowerCase()
  let values=activeColumn.value?(columns.value.find(item=>item.id===activeColumn.value)?.items||[]):articles.value
  if(term)values=values.filter(item=>[item.title,articleText(item.contentHtml)].some(text=>text.toLowerCase().includes(term)))
  return values
})
onShow(async()=>{page.value=1;hasMore.value=true;try{const result=await syncPublishedContents(1,false);hasMore.value=result.hasMore}catch(e){}articles.value=getPublishedArticles().sort((a,b)=>(b.publishedAt||0)-(a.publishedAt||0))})
async function loadMore(){if(loadingMore.value||!hasMore.value)return;loadingMore.value=true;try{const result=await syncPublishedContents(page.value+1,true);page.value=result.page;hasMore.value=result.hasMore;articles.value=getPublishedArticles().sort((a,b)=>(b.publishedAt||0)-(a.publishedAt||0))}finally{loadingMore.value=false}}
const minutes=(item:PublishedContentItem)=>readingMinutes(item),authorOf=(item:PublishedContentItem)=>articleAuthor(item)
function columnOf(item:PublishedContentItem){return columns.value.find(column=>column.items.some(entry=>entry.id===item.id))?.name||'青囊选读'}
function coverOf(item:PublishedContentItem){
  const cover = item.anthology?.coverImage || ''
  if(cover)return cover
  const match=String(item.contentHtml||'').match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1]||''
}
function selectColumn(id:string){activeColumn.value=activeColumn.value===id?'':id}
function articleText(value:string){
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<[^>]+>/g,'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,code)=>{const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n<=0x10ffff?String.fromCodePoint(n):''})
}
function openArticle(id:string){rememberReading(id);uni.navigateTo({url:`/pages/problem/detail?id=${encodeURIComponent(id)}`})}
</script>

<style scoped>
.column-card.selected{outline:2px solid #477161;outline-offset:-2px}
.page{height:100%;min-height:0!important;display:flex;flex-direction:column;overflow:hidden;background:#FFF9ED;color:#243F36}.reading-scroll{flex:1;min-height:0}.masthead{padding:46rpx 34rpx 34rpx;background:linear-gradient(155deg,#F3E7D2,#FFF9ED 72%)}.kicker{font-size:18rpx;font-weight:760;letter-spacing:8rpx;color:#C77560}.masthead-title{margin-top:10rpx;font-family:'Songti SC','STSong',serif;font-size:58rpx;font-weight:760;letter-spacing:4rpx}.masthead-copy{max-width:540rpx;margin-top:13rpx;font-size:22rpx;line-height:1.7;color:#6D7D75}.search-box{display:flex;align-items:center;gap:16rpx;margin-top:28rpx;padding:15rpx 22rpx;border-radius:999rpx;background:rgba(255,255,255,.82);box-shadow:0 9rpx 28rpx rgba(70,55,37,.07)}.search-box input{flex:1;height:46rpx;font-size:22rpx}.search-icon{width:18rpx;height:18rpx;border:3rpx solid #477161;border-radius:50%;position:relative}.search-icon:after{content:'';position:absolute;right:-8rpx;bottom:-5rpx;width:8rpx;height:3rpx;background:#477161;transform:rotate(45deg)}
.continue-card{display:flex;align-items:center;margin:22rpx 28rpx 0;padding:24rpx 26rpx;border-radius:28rpx;background:#DCEEDB}.continue-card>view:first-child{flex:1;min-width:0}.continue-card span,.continue-card strong,.continue-card small{display:block}.continue-card span{font-size:17rpx;color:#527264}.continue-card strong{margin-top:7rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:24rpx}.continue-card small{margin-top:5rpx;color:#688178}.arrow{font-size:38rpx}.section{padding:35rpx 28rpx 0}.section-heading{display:flex;align-items:flex-end;justify-content:space-between}.section-heading text,.section-heading strong{display:block}.section-heading text{font-size:18rpx;color:#C77560;letter-spacing:3rpx}.section-heading strong{margin-top:5rpx;font-size:29rpx}.section-heading small{font-size:18rpx;color:#8A958F}
.featured{margin-top:17rpx;padding:34rpx;border-radius:38rpx;background:#F5C85C;box-shadow:0 15rpx 36rpx rgba(109,76,25,.1)}.featured-label{font-size:17rpx;font-weight:720;color:#765C23}.featured-title{margin-top:20rpx;font-family:'Songti SC','STSong',serif;font-size:37rpx;line-height:1.4;font-weight:760}.featured-summary{margin-top:12rpx;font-size:21rpx;line-height:1.7;color:#675B3D}.meta{margin-top:17rpx;font-size:17rpx;color:#718078}.column-scroll{width:100%;margin-top:17rpx;white-space:nowrap}.column-row{display:inline-flex;gap:14rpx;padding-right:28rpx}.column-card{width:270rpx;height:240rpx;box-sizing:border-box;white-space:normal;padding:26rpx;border-radius:34rpx}.column-count{font-size:17rpx;color:#67766E}.column-name{margin-top:35rpx;font-family:'Songti SC','STSong',serif;font-size:29rpx;font-weight:760}.column-copy{margin-top:9rpx;font-size:18rpx;line-height:1.55;color:#627168}
.article-section{padding-bottom:25rpx}.article-list{display:grid;gap:15rpx;margin-top:17rpx}.article-card{padding:28rpx;border-radius:31rpx;background:#FFF;box-shadow:0 10rpx 28rpx rgba(53,67,60,.06)}.article-series{font-size:17rpx;color:#C77560}.article-title{margin-top:9rpx;font-family:'Songti SC','STSong',serif;font-size:29rpx;line-height:1.48;font-weight:720}.article-summary{display:-webkit-box;margin-top:9rpx;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:20rpx;line-height:1.65;color:#6D7C74}.meta text{float:right;color:#397B63;font-weight:700}.empty{margin-top:18rpx;padding:55rpx;text-align:center;border-radius:30rpx;background:#FFF}.empty strong,.empty text{display:block}.empty text{margin-top:8rpx;color:#89938E}.reading-note{margin:4rpx 38rpx 36rpx;font-size:18rpx;line-height:1.65;text-align:center;color:#8B928E}
@media(prefers-reduced-motion:no-preference){.featured,.column-card,.article-card{transition:transform .16s ease}.featured:active,.column-card:active,.article-card:active{transform:scale(.985)}}
.masthead{padding:28rpx 28rpx 22rpx}.masthead-title{font-size:46rpx}.masthead-copy{margin-top:8rpx;font-size:19rpx}.search-box{margin-top:17rpx;padding:12rpx 18rpx}.continue-card{margin:14rpx 22rpx 0;padding:17rpx 20rpx;border-radius:22rpx}.continue-card strong{font-size:21rpx}.section{padding:23rpx 22rpx 0}.section-heading strong{font-size:25rpx}.featured{margin-top:12rpx;padding:22rpx 24rpx;border-radius:27rpx}.featured-title{margin-top:10rpx;font-size:28rpx}.featured-summary{margin-top:7rpx;display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:1;font-size:18rpx}.meta{margin-top:10rpx;font-size:15rpx}.column-scroll{margin-top:11rpx}.column-row{gap:10rpx}.column-card{width:210rpx;height:155rpx;padding:19rpx;border-radius:24rpx}.column-name{margin-top:20rpx;font-size:24rpx}.column-copy{font-size:16rpx}.article-section{padding-top:22rpx}
.continue-inline{display:flex;align-items:center;gap:10rpx;margin:8rpx 22rpx 0;padding:13rpx 16rpx;border:2rpx solid #DCE9E3;border-radius:16rpx;background:#F8FBF9;color:#527264;font-size:18rpx}.continue-inline strong{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#243F36;font-size:19rpx}.continue-inline span{font-size:28rpx;color:#397B63}.filter-section{padding:18rpx 22rpx 0}.filter-heading{display:flex;align-items:baseline;justify-content:space-between}.filter-heading strong{font-size:26rpx}.filter-heading small{font-size:16rpx;color:#8A958F}.filter-scroll{width:100%;margin-top:11rpx;white-space:nowrap}.filter-row{display:inline-flex;gap:8rpx;padding-right:22rpx}.filter-chip{padding:9rpx 15rpx;border:2rpx solid #DCE5E0;border-radius:999rpx;background:#fff;color:#63746C;font-size:17rpx}.filter-chip.selected{border-color:#477161;background:#E8F0EB;color:#245A47;font-weight:700}.filter-section+.article-section{padding-top:17rpx}
.filter-heading>view{display:flex;align-items:baseline;gap:10rpx}.filter-heading>view>text{font-size:17rpx;color:#C77560;letter-spacing:2rpx}.filter-heading>view>strong{font-size:28rpx}.column-open{padding:9rpx 15rpx;border:2rpx solid #D5E3DC;border-radius:999rpx;background:#F8FBF9;color:#245A47;font-size:18rpx}.column-modal{position:fixed;z-index:50;inset:0;display:flex;align-items:flex-end;background:rgba(19,39,31,.32)}.column-modal-card{width:100%;max-height:78%;box-sizing:border-box;padding:25rpx 24rpx 30rpx;border-radius:28rpx 28rpx 0 0;background:#FFFDFC;box-shadow:0 -12rpx 45rpx rgba(24,53,43,.18)}.column-modal-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:18rpx;border-bottom:2rpx solid #E8EEEA}.column-modal-head text,.column-modal-head strong{display:block}.column-modal-head text{font-size:17rpx;color:#C77560;letter-spacing:2rpx}.column-modal-head strong{margin-top:5rpx;font-size:30rpx;color:#243F36}.column-modal-head button{width:52rpx;height:52rpx;border:0;border-radius:50%;background:#F0F4F1;color:#527264;font-size:34rpx;line-height:1}.column-modal-scroll{max-height:58vh;padding-top:12rpx}.column-option{display:flex;align-items:center;justify-content:space-between;padding:19rpx 16rpx;border-bottom:2rpx solid #EEF2EF}.column-option>view{min-width:0}.column-option strong,.column-option small{display:block}.column-option strong{font-size:25rpx;color:#243F36}.column-option small{margin-top:4rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17rpx;color:#7A8981}.column-option b{flex:0 0 auto;margin-left:14rpx;font-size:17rpx;font-weight:500;color:#8A958F}.column-option.selected{border-radius:16rpx;background:#E8F0EB}.column-option.selected strong,.column-option.selected b{color:#245A47}
.article-card{display:grid;grid-template-columns:132rpx minmax(0,1fr);gap:17rpx;align-items:center;padding:20rpx;border-radius:24rpx}.article-card .card-body{grid-column:2;min-width:0;padding:0}.article-card .card-cover,.article-card .card-cover-placeholder{grid-column:1;grid-row:1;width:132rpx;height:96rpx;margin:0;border-radius:14rpx}.article-card .card-cover-placeholder{padding:12rpx}.article-card .card-cover-placeholder text{font-size:11rpx;letter-spacing:1rpx}.article-card .card-cover-placeholder strong{margin-top:3rpx;font-size:17rpx}.article-card .article-series{font-size:17rpx}.article-card .article-title{font-size:29rpx;line-height:1.4}.article-card .article-summary{margin-top:6rpx;font-size:20rpx;line-height:1.5;-webkit-line-clamp:2}.article-card .meta{margin-top:9rpx;font-size:17rpx}
.card-cover,.card-cover-placeholder{display:block;width:calc(100% + 44rpx);height:190rpx;margin:-22rpx -22rpx 17rpx;background:#DDEBE7}.card-cover{object-fit:cover}.card-cover-placeholder{box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;padding:20rpx;background:linear-gradient(145deg,#DDF6F2,#F0FDFA 54%,#CCFBF1);color:#115E59}.card-cover-placeholder text{font-size:15rpx;letter-spacing:2rpx;opacity:.72}.card-cover-placeholder strong{margin-top:5rpx;font-size:24rpx}.article-card{padding:22rpx}.article-title{font-size:25rpx}.article-summary{font-size:18rpx}.meta{margin-top:13rpx;font-size:15rpx}
.column-card{width:220rpx;height:185rpx;padding:22rpx;border-radius:28rpx}.column-name{margin-top:25rpx;font-size:27rpx}.column-copy{font-size:17rpx}
.masthead{padding:28rpx 28rpx 22rpx}.masthead-title{margin-top:0;font-size:34rpx;letter-spacing:2rpx}.brand-name{color:#245A47}.section-name{color:#314A42}.title-divider{color:#B7C5BE;margin:0 5rpx}
</style>
<style scoped>
/* 桌面端阅读布局：手机端保留原有单列与横向专栏交互。 */
@media (min-width: 900px){
  .masthead{padding:54px 56px 34px;max-width:1080px;margin:0 auto}
  .masthead-title{font-size:42px}
  .search-box{max-width:720px;margin-top:24px;padding:14px 22px}
  .search-box input{height:42px;font-size:16px}
  .today-section,.section{max-width:1080px;margin-left:auto;margin-right:auto;padding-left:56px;padding-right:56px}
  .today-section{padding-top:30px}
  .section{padding-top:34px}
  .today-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .today-card{min-height:94px;padding:16px 18px}
  .today-cover{width:128px;height:88px}
  .column-scroll{overflow:visible;margin-top:18px}
  .column-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;width:100%;padding-right:0}
  .column-card{width:auto;height:168px;padding:22px;border-radius:24px}
  .column-name{margin-top:24px;font-size:25px}
  .column-copy{font-size:15px}
  .article-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:20px}
  .article-card{min-height:126px;padding:18px;grid-template-columns:170px minmax(0,1fr);gap:18px;border-radius:20px}
  .article-card .card-cover,.article-card .card-cover-placeholder{width:170px;height:122px;border-radius:14px}
  .article-card .article-title{font-size:21px;line-height:1.45}
  .article-card .article-summary{font-size:15px;line-height:1.6}
  .article-card .meta{font-size:14px}
  .empty{padding:72px}
}
</style>
<style scoped>
.today-section{padding:22rpx 28rpx 0}.today-heading{display:flex;align-items:flex-end;justify-content:space-between}.today-heading text,.today-heading strong{display:block}.today-heading text{font-size:18rpx;color:#C77560;letter-spacing:3rpx}.today-heading strong{margin-top:5rpx;font-size:29rpx}.today-heading small{font-size:18rpx;color:#8A958F}.today-list{display:grid;gap:12rpx;margin-top:15rpx}.today-card{display:flex;align-items:center;gap:14rpx;padding:14rpx 16rpx;border-radius:22rpx;background:#FFF;box-shadow:0 8rpx 22rpx rgba(53,67,60,.06)}.today-cover{flex:0 0 auto;width:104rpx;height:76rpx;border-radius:13rpx;background:#DDEBE7}.today-copy{flex:1;min-width:0}.today-copy text,.today-copy strong,.today-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.today-copy text{font-size:16rpx;color:#C77560}.today-copy strong{margin-top:3rpx;font-family:'Songti SC','STSong',serif;font-size:23rpx;color:#243F36}.today-copy small{margin-top:4rpx;font-size:17rpx;color:#718078}.today-arrow{font-size:29rpx;color:#397B63}
</style>
