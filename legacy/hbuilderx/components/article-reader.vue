<template>
  <view class="article-reader" @click="previewImage">
    <rich-text class="article-body" :nodes="html" />
  </view>
</template>

<script setup lang="ts">
defineProps<{html:string}>()

function previewImage(event:MouseEvent){
  const target=event.target as HTMLElement|null
  const image=target?.closest?.('img') as HTMLImageElement|null
  const root=event.currentTarget as HTMLElement|null
  if(!image||!root||image.closest('a'))return
  const urls=Array.from(root.querySelectorAll('img')).map(img=>img.currentSrc||img.src).filter(Boolean)
  const current=image.currentSrc||image.src
  if(current&&urls.length)uni.previewImage({current,urls})
}
</script>

<style scoped>
.article-reader{font-size:17px;line-height:1.85;overflow-wrap:anywhere;word-break:normal;text-align:left}
.article-body{display:block;font:inherit;color:inherit}
.article-reader :deep(p){margin:0 0 1.15em;line-height:inherit}
.article-reader :deep(h1),.article-reader :deep(h2),.article-reader :deep(h3),.article-reader :deep(h4){margin:1.8em 0 .65em;font-weight:700;line-height:1.45;overflow-wrap:anywhere}
.article-reader :deep(h1){font-size:1.5em}.article-reader :deep(h2){font-size:1.3em}.article-reader :deep(h3){font-size:1.15em}.article-reader :deep(h4){font-size:1em}
.article-reader :deep(ul),.article-reader :deep(ol){margin:.8em 0 1.3em;padding-left:1.5em}
.article-reader :deep(li){margin:.45em 0;line-height:inherit}
.article-reader :deep(blockquote){margin:1.3em 0;padding:.8em 1em;border-left:3px solid #477161;border-radius:0 8px 8px 0;background:#EDFAF2;font-size:.95em;line-height:1.8}
.article-reader :deep(blockquote p:last-child){margin-bottom:0}
.article-reader :deep(img){display:block;max-width:100%;height:auto;margin:1.4em auto .7em;border-radius:12px;cursor:zoom-in}
.article-reader :deep(video){display:block;width:100%;max-width:100%;margin:1.4em 0;border-radius:12px}
.article-reader :deep(.media-caption){font-size:13px;line-height:1.6;text-align:center}
.article-reader :deep(a){color:#245540;text-decoration:underline;text-underline-offset:3px}
.article-reader :deep(table){display:block;max-width:100%;overflow-x:auto;border-collapse:collapse;font-size:.9em;margin:1.2em 0}
.article-reader :deep(td),.article-reader :deep(th){padding:.6em .8em;border:1px solid #e1e6e3;min-width:5em}
.article-reader :deep(hr){margin:1.8em 0;border:0;border-top:1px solid #e1e6e3}
</style>
