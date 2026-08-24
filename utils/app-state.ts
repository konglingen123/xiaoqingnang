/**
 * 应用级会话状态（仅内存，不持久化）
 * splashConfirmed：每次冷启动需重新确认开屏免责提示（合规红线 2）
 */
import { reactive } from 'vue'

export const appState = reactive({
  splashConfirmed: false
})
