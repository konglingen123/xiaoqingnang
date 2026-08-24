<script lang="ts">
export default {
  onLaunch() {
    // 第一版无远程配置，留空
  }
}
</script>

<style>
/**
 * 小青囊 · 全局设计令牌（竹青 × 宣纸米白）
 * 全端通用：page 选择器 + CSS 变量在 uni-app 各平台均可用
 */
page {
  --c-bamboo: #4E7A5E;        /* 竹青：主色 */
  --c-bamboo-deep: #2F4F3C;   /* 深竹：沉浸页背景 */
  --c-bamboo-light: #B9D4BC;  /* 浅竹：辅助 */
  --c-paper: #F8F4EB;         /* 宣纸米白：页面底色 */
  --c-card: #FFFDF7;          /* 卡片底色 */
  --c-ink: #33413A;           /* 墨：正文 */
  --c-ink-soft: #74817A;      /* 淡墨：次要文字 */
  --c-ginger: #C99A5B;        /* 姜黄：点缀 */
  --c-line: #E8E3D3;          /* 描边 */
  --c-red: #D96A5A;           /* 红绿灯·红 */
  --c-yellow: #E8B84B;        /* 红绿灯·黄 */
  --c-green: #6FBF8E;         /* 红绿灯·绿 */

  background: var(--c-paper);
  color: var(--c-ink);
  font-size: 28rpx;
  line-height: 1.65;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 通用卡片 */
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

/* 主按钮 / 次按钮 */
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

/* 轻提示文案 */
.hint {
  color: var(--c-ink-soft);
  font-size: 24rpx;
  text-align: center;
  padding: 16rpx 0;
}
</style>
