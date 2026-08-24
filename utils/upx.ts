/**
 * 动态样式尺寸换算工具
 * 动态 :style 绑定中的 rpx 在 H5 不生效，且个别平台 uni.upx2px 行为有差异，
 * 统一用本工具把 rpx 数值转为 px 字符串（带兜底：按 750 设计稿 / 375 屏宽）。
 */
export function upx(n: number): number {
  if (typeof uni !== 'undefined' && typeof uni.upx2px === 'function') {
    return uni.upx2px(n)
  }
  return Math.round(n / 2)
}

export function upxPx(n: number): string {
  return upx(n) + 'px'
}
