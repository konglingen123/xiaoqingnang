/**
 * ai-chat 云函数（阶段三：LLM 兜底检索）
 * 前端调用约定：uniCloud.callFunction({ name: 'ai-chat', data: { query, history } })
 * 返回：{ ok, redFlag?, text?, planIds?, chips?, followup? } 或 { ok:false, reason }
 * 部署前提：开通 uniCloud 空间 + 云函数环境变量 HUNYUAN_API_KEY
 * 见 docs/features/ai-search.md §4。
 */
'use strict'

const { RED_FLAGS, AI_REDFLAG_TEXT, SYSTEM_PROMPT, PLAN_ID_SET } = require('./compliance')

exports.main = async (event, context) => {
  const query = String(event.query || '').trim()
  const history = Array.isArray(event.history) ? event.history : []
  if (!query) return { ok: false, reason: 'empty_query' }

  // 1. 红旗词：最高优先级，不调 LLM，输出固定话术
  const flag = RED_FLAGS.find((w) => query.indexOf(w) >= 0)
  if (flag) return { ok: true, redFlag: true, text: AI_REDFLAG_TEXT }

  // 2. 输入内容安全（微信 msgSecCheck；开发期失败不阻塞，生产环境应升级为硬校验）
  try {
    await uniCloud.openapi.security.msgSecCheck({ content: query })
  } catch (e) {
    console.log('msgSecCheck skip:', e && e.message)
  }

  // 3. 调用混元（OpenAI 兼容接口）
  try {
    const res = await uniCloud.httpclient.request('https://api.hunyuan.cloud.tencent.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (process.env.HUNYUAN_API_KEY || '')
      },
      data: {
        model: 'hunyuan-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.slice(-2).map((t) => ({ role: 'user', content: String(t) })),
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 512
      },
      contentType: 'json',
      dataType: 'json',
      timeout: 15000
    })

    const raw = res.data && res.data.choices && res.data.choices[0] &&
      res.data.choices[0].message && res.data.choices[0].message.content
    const parsed = parseJsonLoose(raw)
    if (!parsed) return { ok: false, reason: 'llm_bad_json' }
    if (parsed.redFlag) return { ok: true, redFlag: true, text: AI_REDFLAG_TEXT }

    // 4. 方案 id 白名单校验：只返回方案库内存在的，防止 LLM 编造
    const planIds = (Array.isArray(parsed.matchedPlanIds) ? parsed.matchedPlanIds : [])
      .filter((id) => PLAN_ID_SET.has(id))
      .slice(0, 3)
    if (!planIds.length) return { ok: false, reason: 'llm_no_match' }

    const text = String(parsed.reason || '').slice(0, 60)
    const chips = Array.isArray(parsed.chips) ? parsed.chips.slice(0, 3) : []

    // 5. 会话留痕（合规：日志留存 ≥180 天；开发期失败容忍）
    try {
      const { OPENID } = uniCloud.getWXContext()
      const db = uniCloud.database()
      await db.collection('ai_chat_sessions').add({
        openid: OPENID || 'anon',
        query,
        planIds,
        text,
        ts: Date.now()
      })
    } catch (e) {
      console.log('session log skip:', e && e.message)
    }

    return { ok: true, llm: true, text, planIds, chips, followup: String(parsed.followupQuestion || '') }
  } catch (e) {
    console.error('llm error:', e && e.message)
    return { ok: false, reason: 'llm_error' }
  }
}

/** 宽容解析：直接 JSON.parse，失败再尝试提取首个 {...} 块 */
function parseJsonLoose(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) { /* 继续 */ }
  const m = String(raw).match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch (e) {
    return null
  }
}
