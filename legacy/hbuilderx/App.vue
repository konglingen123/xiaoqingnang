<script lang="ts">
import { syncPublishedContents } from './utils/content'

export default {
  onLaunch() {
    syncPublishedContents().catch(() => undefined)
  }
}
</script>

<style>
page {
  --c-bamboo: #236B57;
  --c-bamboo-deep: #124B3D;
  --c-bamboo-light: #9FC7B3;
  --c-green-soft: #DDEEE6;
  --c-paper: #F7F8F6;
  --c-card: #FFFFFF;
  --c-ink: #18352B;
  --c-ink-soft: #536E63;
  --c-ink-faint: #92988F;
  --c-segment: #E8ECEA;
  --c-chip: #EEF1EF;
  --c-ginger: #C66542;
  --c-line: #E2E7E4;
  --c-red: #B9503E;
  --c-yellow: #D8A63F;
  --c-green: #5A8D6C;
  background: var(--c-paper);
  color: var(--c-ink);
  font-size: 28rpx;
  line-height: 1.65;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 只固定浏览器根容器；导航栏与 TabBar 的可用高度交给 uni-app 计算。 */
html,
body,
#app,
uni-app {
  height: 100%;
  min-height: 100%;
  overflow: hidden;
}

uni-page-body {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

html,
body {
  margin: 0;
  background: #E6ECE9;
}

uni-app {
  position: relative;
  display: block;
  width: min(100%, 720px);
  margin: 0 auto;
  background: var(--c-paper);
  box-shadow: 0 0 60px rgba(18, 52, 41, 0.10);
}

/* 普通长页面在自己的页面容器内滚动；整屏页可在 scoped 样式中覆盖为 hidden。 */
.page {
  height: 100%;
  min-height: 0 !important;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 保留触摸和滚轮滚动，只隐藏各端默认的可见滚动条。 */
::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none;
  background: transparent;
}

page,
scroll-view {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.card {
  background: var(--c-card);
  border-radius: 28rpx;
  padding: 36rpx;
  margin: 24rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(51, 65, 58, 0.07);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-ink);
  margin-bottom: 20rpx;
}

.btn-primary {
  background: var(--c-bamboo);
  color: #ffffff;
  text-align: center;
  border-radius: 48rpx;
  padding: 24rpx 0;
  font-size: 30rpx;
  font-weight: 500;
}

.btn-ghost {
  border: 2rpx solid var(--c-line);
  color: var(--c-ink);
  text-align: center;
  border-radius: 48rpx;
  padding: 22rpx 0;
  font-size: 30rpx;
  background: var(--c-card);
}

.hint {
  color: var(--c-ink-soft);
  font-size: 24rpx;
  text-align: center;
  padding: 16rpx 0;
}

/* 小青囊温馨糖果色：同一明度、暖色底、竹青负责功能。 */
page{
  --c-candy-cream:#FFF8EA;
  --c-candy-yellow:#F4C85E;
  --c-candy-peach:#F3A58F;
  --c-candy-mint:#BFE3CE;
  --c-candy-lilac:#D8CCF1;
  --c-candy-green:#1B5A47;
  --c-candy-brown:#5D493B;
  --motion-press:150ms;
  --motion-switch:220ms;
  --motion-enter:320ms;
  --ease-soft:cubic-bezier(.22,.72,.3,1);
  --shadow-candy:0 12rpx 30rpx rgba(67,55,45,.07);
  --c-paper:var(--c-candy-cream);
}

@media (min-width: 900px){
  uni-app{width:min(100%, 1180px)}
}
</style>
