<template>
  <view class="page">
    <!-- 常驻标识与免责（合规红线 2 + 4） -->
    <view class="notice">小青囊检索助手 · 建议不构成医疗意见</view>

    <!-- 对话区 -->
    <scroll-view class="chat" scroll-y :scroll-into-view="scrollTo">
      <view v-for="(m, i) in messages" :key="i" :id="'msg-' + i" class="msg-wrap">
        <!-- 用户消息 -->
        <view v-if="m.role === 'user'" class="msg-user">{{ m.text }}</view>

        <!-- 助手消息 -->
        <view v-else class="msg-ai">
          <view class="ai-avatar">🎋</view>
          <view class="ai-body">
            <view v-if="m.text" :class="['ai-text', m.redFlag ? 'text-red' : '']">{{ m.text }}</view>
            <view v-if="m.aiGenerated" class="ai-gen-tag">内容由 AI 生成</view>

            <!-- 方案卡 -->
            <view v-if="m.planIds && m.planIds.length" class="plan-list">
              <view v-for="p in planOf(m)" :key="p.id" class="plan-card" @tap="goPrepare(p.id)">
                <view class="plan-name">
                  <text>{{ p.name }}</text>
                  <text :class="['dot', 'dot-' + p.safety]"></text>
                </view>
                <view class="plan-motto">{{ p.motto }}</view>
                <view class="plan-go">开始 ›</view>
              </view>
            </view>

            <!-- chips 快答（追问骨架：点即追问） -->
            <view v-if="m.chips && m.chips.length" class="chip-row">
              <view v-for="c in m.chips" :key="c" class="quick-chip" @tap="send(c)">{{ c }}</view>
            </view>

            <!-- 未命中反馈（方案库扩充依据） -->
            <view v-if="m.miss" class="miss-link" @tap="onRecordMiss">没解决？点我记录，帮我们补充方案</view>
          </view>
        </view>
      </view>
      <view id="chat-bottom"></view>
    </scroll-view>

    <!-- 引导示例 -->
    <view v-if="messages.length === 0" class="samples">
      <text class="samples-label">试试问：</text>
      <view v-for="s in samples" :key="s" class="quick-chip" @tap="send(s)">{{ s }}</view>
    </view>

    <!-- 输入区 -->
    <view class="input-bar">
      <input class="input" v-model="draft" placeholder="说说你哪里不舒坦…" confirm-type="send" @confirm="onSend" />
      <view class="send-btn" @tap="onSend">发送</view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * AI 搜索对话页（阶段二：本地规则引擎，无 LLM 生成）
 * 流程：输入 → 红旗词就医话术 / 方案直返 / 部位直返 / 未命中兜底；
 * 追问：结果下方 chips 快答（不想泡脚/办公室能做/睡前做），按偏好过滤候选。
 * 阶段三接入 LLM 后，本页把未命中分支替换为云函数调用即可，交互不变。
 */
import { ref } from 'vue'
import { REMEDIES } from '../../data/remedies'
import { parseIntent, applyPreference } from '../../utils/intent'
import { AI_REDFLAG_TEXT, AI_FALLBACK_TEXT } from '../../data/compliance'
import { logAiMiss } from '../../utils/storage'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  planIds?: string[]
  chips?: string[]
  redFlag?: boolean
  miss?: boolean
  aiGenerated?: boolean
}

const messages = ref<Msg[]>([])
const draft = ref('')
const scrollTo = ref('')
const lastCandidates = ref<string[]>([])
const samples = ['落枕了脖子好僵', '手脚冰凉', '久坐腰酸', '累得提不起劲']
const PREF_CHIPS = ['不想泡脚', '办公室能做', '睡前做']

/** 命中偏好追问的模式（与 utils/intent.ts 的 applyPreference 对应） */
const PREF_RE = /(不(想|能|会|可以)?泡脚|办公室|上班|坐着|办公|睡前|安静|静一静|放松一下)/

function planOf(m: Msg) {
  return (m.planIds || [])
    .map((id) => REMEDIES.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
}

function assistant(msg: Partial<Msg>) {
  messages.value.push({ role: 'assistant', text: '', planIds: [], chips: [], ...msg })
  scrollTo.value = 'msg-' + (messages.value.length - 1)
}

function onSend() {
  const q = draft.value.trim()
  if (!q) return
  draft.value = ''
  send(q)
}

function send(q: string) {
  messages.value.push({ role: 'user', text: q })
  scrollTo.value = 'msg-' + (messages.value.length - 1)
  respond(q)
}

function respond(q: string) {
  const r = parseIntent(q)

  // 红旗词：最高优先级，终止推荐
  if (r.redFlag) {
    assistant({ text: AI_REDFLAG_TEXT, redFlag: true })
    lastCandidates.value = []
    return
  }

  // 偏好追问：上一轮有候选且命中偏好模式 → 过滤候选
  if (lastCandidates.value.length && PREF_RE.test(q)) {
    const pref = applyPreference(lastCandidates.value, q)
    const ids = pref.planIds.length
      ? pref.planIds
      : wholeIds(2)
    assistant({ text: pref.note, planIds: ids, chips: PREF_CHIPS })
    lastCandidates.value = ids
    return
  }

  // 未命中：先试云函数（阶段三 LLM），不可用则本地兜底话术
  if (r.hitType === 'none') {
    tryCloud(q)
    return
  }

  // 直返：方案关键词 / 部位
  const first = REMEDIES.find((p) => p.id === r.planIds[0])
  const text = r.hitType === 'plan'
    ? `「${first ? first.name : ''}」应该能帮到你，试试看：`
    : `帮你找到「${r.areaName}」的舒缓方案：`
  assistant({ text, planIds: r.planIds, chips: PREF_CHIPS })
  lastCandidates.value = r.planIds
}

function wholeIds(limit: number): string[] {
  return REMEDIES.filter((p) => p.areas.indexOf('whole') >= 0).slice(0, limit).map((p) => p.id)
}

/** 阶段三：未命中时尝试 uniCloud 云函数（LLM 检索），失败静默走本地兜底 */
async function tryCloud(q: string) {
  let cloudHit = false
  if (typeof uniCloud !== 'undefined') {
    try {
      const history = messages.value
        .filter((m) => m.role === 'user')
        .map((m) => m.text)
        .slice(-3, -1)
      const res = await uniCloud.callFunction({ name: 'ai-chat', data: { query: q, history } })
      const d = res && res.result
      if (d && d.ok && d.redFlag) {
        assistant({ text: AI_REDFLAG_TEXT, redFlag: true })
        return
      }
      if (d && d.ok && d.llm && d.planIds && d.planIds.length) {
        assistant({
          text: d.text + '（内容由 AI 生成）',
          planIds: d.planIds,
          chips: PREF_CHIPS,
          aiGenerated: true
        })
        lastCandidates.value = d.planIds
        cloudHit = true
      }
    } catch (e) {
      // 未开通 uniCloud / 云函数不存在：静默走本地兜底
    }
  }
  if (!cloudHit) {
    const ids = wholeIds(2)
    assistant({ text: AI_FALLBACK_TEXT, planIds: ids, miss: true })
    lastCandidates.value = ids
  }
}

function goPrepare(id: string) {
  uni.navigateTo({ url: '/pages/prepare/prepare?id=' + id })
}

function onRecordMiss() {
  const lastUser = messages.value.filter((m) => m.role === 'user').pop()
  if (lastUser) logAiMiss(lastUser.text)
  uni.showToast({ title: '已记录，谢谢！', icon: 'success' })
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-paper);
}

/* 常驻标识 */
.notice {
  text-align: center;
  font-size: 22rpx;
  color: var(--c-ink-soft);
  padding: 12rpx 0;
  background: var(--c-card);
  border-bottom: 2rpx solid var(--c-line);
}

/* 对话区 */
.chat {
  flex: 1;
  padding: 24rpx 24rpx 8rpx;
  box-sizing: border-box;
  overflow: hidden;
}
.msg-wrap {
  margin-bottom: 28rpx;
}
.msg-user {
  max-width: 75%;
  margin-left: auto;
  background: var(--c-bamboo);
  color: #ffffff;
  font-size: 28rpx;
  padding: 18rpx 28rpx;
  border-radius: 28rpx 28rpx 8rpx 28rpx;
  word-break: break-all;
}
.msg-ai {
  display: flex;
  gap: 16rpx;
}
.ai-avatar {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  background: var(--c-bamboo-light);
  border-radius: 50%;
  font-size: 32rpx;
  flex-shrink: 0;
}
.ai-body {
  flex: 1;
  min-width: 0;
}
.ai-text {
  background: var(--c-card);
  border-radius: 8rpx 28rpx 28rpx 28rpx;
  padding: 20rpx 28rpx;
  font-size: 28rpx;
  color: var(--c-ink);
  word-break: break-all;
}
.text-red {
  border-left: 8rpx solid var(--c-red);
  color: #A84234;
  font-weight: 500;
}
.ai-gen-tag {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--c-ink-soft);
}

/* 方案卡 */
.plan-list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.plan-card {
  background: var(--c-card);
  border-radius: 8rpx 28rpx 28rpx 28rpx;
  padding: 24rpx 28rpx;
}
.plan-name {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-ink);
}
.plan-motto {
  font-size: 24rpx;
  color: var(--c-ink-soft);
  margin-top: 8rpx;
}
.plan-go {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--c-bamboo);
  text-align: right;
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
}
.dot-green {
  background: var(--c-green);
}
.dot-yellow {
  background: var(--c-yellow);
}
.dot-red {
  background: var(--c-red);
}

/* chips 快答 */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.quick-chip {
  font-size: 24rpx;
  color: var(--c-bamboo-deep);
  background: var(--c-card);
  border: 2rpx solid var(--c-bamboo-light);
  border-radius: 999rpx;
  padding: 10rpx 28rpx;
}

/* 未命中反馈 */
.miss-link {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: var(--c-ginger);
  text-decoration: underline;
}

/* 引导示例 */
.samples {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 12rpx 24rpx;
}
.samples-label {
  font-size: 24rpx;
  color: var(--c-ink-soft);
}

/* 输入区 */
.input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--c-card);
  border-top: 2rpx solid var(--c-line);
}
.input {
  flex: 1;
  background: #F3F0E6;
  border-radius: 999rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  height: 72rpx;
  box-sizing: border-box;
}
.send-btn {
  background: var(--c-bamboo);
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 999rpx;
  padding: 16rpx 36rpx;
}
</style>
