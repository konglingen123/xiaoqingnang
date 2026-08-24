/**
 * 最小全局声明（零 npm 依赖即可开发）
 * 如需完整 uni-app / Vue 类型提示，可自行安装 @dcloudio/types 等类型包
 */
declare const uni: any
declare const uniCloud: any
declare const wx: any

declare module '*.vue' {
  const component: any
  export default component
}
