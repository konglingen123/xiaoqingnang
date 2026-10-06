import { AREAS } from '../data/areas'
import { PRODUCTION_ORIGIN } from '../data/environment'
import { AnthologyColumnConfig, PublishedContentItem } from '../typings/models'

const CONTENT_STORAGE_KEY = 'xqn_v2_published_contents'
const COLUMN_STORAGE_KEY = 'xqn_v2_anthology_columns'
const LEGACY_AREA_MAP: Record<string, string> = {
  '腰部': 'lower-back', '腰骶部': 'lower-back', '后腰': 'lower-back',
  '肚子': 'abdomen', '腹部': 'abdomen', '脚': 'foot', '足底': 'foot',
  '头部': 'head', '头面部': 'head', '颈部': 'neck', '肩部': 'shoulder'
}

let API_ROOT = PRODUCTION_ORIGIN
/* #ifdef H5 */
if (typeof window !== 'undefined') {
  API_ROOT = window.location.origin
}
/* #endif */

const splitList = (value: unknown): string[] => Array.isArray(value)
  ? value.map((item) => String(item).trim()).filter(Boolean)
  : String(value || '').split(/[\n,，;；]+/).map((item) => item.trim()).filter(Boolean)

const stripHtml = (value = '') => value
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const publicRichHtml = (html = '') => {
  let value = String(html || '')
    .replace(/(\bsrc=["'])(\/media\/)/gi, `$1${API_ROOT}/media/`)
    // 原公众号图片子域名在部分网络环境下证书握手失败，主域名提供同一路径。
    .replace(/https:\/\/zibingziyi\.zengshiwuyu\.cn\//gi, 'https://zengshiwuyu.cn/')
    // 公众号导出的粗体短段落通常就是章节标题；只改变语义标签，不改变文字。
    .replace(/<p([^>]*)>\s*<strong>([^<]{1,80})<\/strong>\s*<\/p>/gi, (_match, attrs, text) => {
      const clean = String(text).replace(/\s+/g, ' ').trim()
      const heading = /^(第[一二三四五六七八九十百]+[章节步、.]|[一二三四五六七八九十百]+[、.]|（[一二三四五六七八九十百]+）|编者|方法|原理|注意事项|风险边界|案例)/.test(clean)
      return heading ? `<h3 class="reader-subheading">${clean}</h3>` : `<p${attrs}><strong>${text}</strong></p>`
    })
    // 作者、平台和日期仍保留，但降低视觉权重，避免抢正文注意力。
    .replace(/<p([^>]*)>((?:原创|作者|编者|整理|来源)[^<]{0,140}(?:20\d{2}[-年].{0,40})?)<\/p>/gi, '<p$1 class="reader-meta">$2</p>')
    .replace(/<img(?![^>]*\bstyle=)/gi, '<img loading="lazy" style="display:block;width:100%;height:auto;margin:26px 0 8px;border-radius:18px"')
    .replace(/<p class="media-caption"(?![^>]*\bstyle=)/gi, '<p class="media-caption" style="margin:0 4px 24px;text-align:center;color:#718078;font-size:14px;line-height:1.6"')
  return value
}

function normalizeAreaIds(value: any): string[] {
  const raw = splitList(value.bodyAreaIds)
  if (!raw.length && value.bodyArea) raw.push(value.bodyArea)
  const valid = new Set(AREAS.map((item) => item.id))
  return Array.from(new Set(raw.map((item) => {
    if (valid.has(item)) return item
    if (LEGACY_AREA_MAP[item]) return LEGACY_AREA_MAP[item]
    const area = AREAS.find((entry) => entry.name === item || entry.aliases.includes(item))
    return area?.id || ''
  }).filter(Boolean)))
}

function normalizeContent(value: any): PublishedContentItem {
  const type = value.type === 'article' ? 'article' : 'method'
  const contentHtml = publicRichHtml(String(value.contentHtml || value.methodContentHtml || ''))
  return {
    id: String(value.id), type, title: String(value.title || ''), summary: String(value.summary || ''),
    keywords: splitList(value.keywords), areaIds: normalizeAreaIds(value),
    contentHtml,
    methodName: type === 'method' ? String(value.methodName || value.title || '') : undefined,
    methodType: type === 'method' ? String(value.methodType || '') : undefined,
    materials: type === 'method' ? splitList(value.materials).filter((item) => item !== '无') : [],
    usageScope: splitList(value.usageScope), notices: splitList(value.notices),
    outsideScope: splitList(value.outsideScope), helpConditions: splitList(value.helpConditions),
    casesHtml: publicRichHtml(String(value.casesHtml || '')),
    source: {
      title: String(value.sourceTitle || ''), author: value.sourceAuthor || undefined,
      platform: value.sourcePlatform || undefined, url: value.sourceUrl || undefined,
      originalText: String(value.sourceText || ''), notes: splitList(value.sourceNotes)
    },
    reviewedAt: Number(value.reviewedAt) || undefined, publishedAt: Number(value.publishedAt) || undefined,
    guideAvailable: Boolean(value.guideAvailable && Array.isArray(value.steps) && value.steps.length),
    anthology: type === 'article' ? {
      columnId: value.columnId || undefined,
      columnName: value.columnName || undefined,
      issueNumber: Number(value.issueNumber) || undefined,
      topics: splitList(value.topics),
      coverImage: value.coverImage || undefined,
      editorNote: value.editorNote || undefined,
      originalPublishedAt: Number(value.originalPublishedAt) || undefined
    } : undefined
  }
}

function requestPublished(page = 1, pageSize = 24): Promise<{contents:PublishedContentItem[];columns:AnthologyColumnConfig[];hasMore:boolean;page:number}> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_ROOT + `/api/published-content?page=${page}&pageSize=${pageSize}`, method: 'GET', timeout: 15000, withCredentials: true,
      success: (response) => {
        const data = response.data as { contents?: unknown[];columns?: AnthologyColumnConfig[] }
        if (response.statusCode >= 200 && response.statusCode < 300 && Array.isArray(data?.contents)) {
          resolve({contents:data.contents.map(normalizeContent),columns:Array.isArray(data.columns)?data.columns:[],hasMore:Boolean((data as any).hasMore),page:Number((data as any).page)||page})
        } else reject(new Error('已发布内容读取失败'))
      },
      fail: reject
    })
  })
}

export async function syncPublishedContents(page = 1, append = false): Promise<{count:number;hasMore:boolean;page:number}> {
  const result = await requestPublished(page)
  const previous = append ? getPublishedContents() : []
  const merged = [...previous, ...result.contents.filter((item) => !previous.some((entry) => entry.id === item.id))]
  uni.setStorageSync(CONTENT_STORAGE_KEY, merged)
  uni.setStorageSync(COLUMN_STORAGE_KEY, result.columns)
  return {count: result.contents.length, hasMore: result.hasMore, page: result.page}
}

export async function fetchPublishedContent(id: string): Promise<PublishedContentItem> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_ROOT + `/api/published-content/${encodeURIComponent(id)}`, method: 'GET', timeout: 15000, withCredentials: true,
      success: (response) => {
        const data = response.data as {content?: unknown}
        if (response.statusCode >= 200 && response.statusCode < 300 && data?.content) resolve(normalizeContent(data.content))
        else reject(new Error('内容读取失败'))
      },
      fail: reject
    })
  })
}

export function getAnthologyColumns():AnthologyColumnConfig[]{try{const stored=uni.getStorageSync(COLUMN_STORAGE_KEY);return Array.isArray(stored)?stored:[]}catch(e){return[]}}

export function getPublishedContents(): PublishedContentItem[] {
  try {
    const stored = uni.getStorageSync(CONTENT_STORAGE_KEY)
    return Array.isArray(stored) ? stored : []
  } catch (e) {
    return []
  }
}

export const getPublishedMethods = (): PublishedContentItem[] => getPublishedContents().filter((item) => item.type === 'method')
export const getPublishedArticles = (): PublishedContentItem[] => getPublishedContents().filter((item) => item.type === 'article')

const normalizeTerm = (value: string) => value.toLowerCase().replace(/[\s，。！？、,.!?;；：:（）()\-_]/g, '')

export function searchPublishedContents(contents: PublishedContentItem[], query: string): PublishedContentItem[] {
  const term = normalizeTerm(query)
  if (!term) return []
  return contents.map((item) => {
    let score = 0
    const title = normalizeTerm(item.title)
    const methodName = normalizeTerm(item.methodName || '')
    if (title === term) score += 120
    else if (title.includes(term) || term.includes(title)) score += 70
    if (methodName === term) score += 110
    else if (methodName && (methodName.includes(term) || term.includes(methodName))) score += 65
    item.keywords.forEach((word) => {
      const key = normalizeTerm(word)
      if (key === term) score += 95
      else if (key.includes(term) || term.includes(key)) score += 48
    })
    item.areaIds.forEach((id) => {
      const area = AREAS.find((entry) => entry.id === id)
      ;[area?.name, area?.hint, ...(area?.aliases || [])].filter(Boolean).forEach((word) => {
        const key = normalizeTerm(String(word))
        if (key === term) score += 80
        else if (key.includes(term) || term.includes(key)) score += 35
      })
    })
    const secondary = [item.summary, ...item.usageScope, ...item.notices]
    if (secondary.some((text) => normalizeTerm(text).includes(term))) score += 25
    // 问题库与穴位库是方法的正式关联来源，不能只依赖手工关键词。
    item.problemLinks?.forEach((link) => {
      const problem = link.problem
      const values = [problem?.name, ...(problem?.aliases || []), problem?.description]
        .filter(Boolean)
        .map((value) => normalizeTerm(String(value)))
      if (values.some((value) => value === term)) score += 115
      else if (values.some((value) => value.includes(term) || term.includes(value))) score += 72
    })
    item.pointLinks?.forEach((link) => {
      const point = link.point
      const values = [point?.name, ...(point?.aliases || []), point?.everydayLocation]
        .filter(Boolean)
        .map((value) => normalizeTerm(String(value)))
      if (values.some((value) => value === term)) score += 105
      else if (values.some((value) => value.includes(term) || term.includes(value))) score += 65
    })
    if (normalizeTerm(stripHtml(item.contentHtml)).includes(term)) score += 8
    return { item, score }
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).map((entry) => entry.item)
}

export function contentsForArea(contents: PublishedContentItem[], areaId: string): PublishedContentItem[] {
  return contents.filter((item) => {
    if (item.areaIds.includes(areaId)) return true
    if (item.problemLinks?.some((link) => link.problem?.bodyAreaIds?.includes(areaId))) return true
    return Boolean(item.pointLinks?.some((link) => link.point?.bodyAreaId === areaId))
  })
}

export function readingMinutes(item: PublishedContentItem): number {
  const textLength = stripHtml(item.contentHtml).length + item.usageScope.join('').length + item.notices.join('').length
  return Math.max(1, Math.ceil(textLength / 350))
}

export function decisionFacts(item: PublishedContentItem): string[] {
  const facts = [item.type === 'article' ? '青囊文集' : '养护方法', `约 ${readingMinutes(item)} 分钟`]
  if (item.type === 'method') facts.push(item.materials.length ? `需${item.materials[0]}` : '无需工具')
  facts.push(item.guideAvailable ? '可跟着做' : '图文查看')
  return facts
}

export function areaNames(item: PublishedContentItem): string[] {
  return item.areaIds.map((id) => AREAS.find((area) => area.id === id)?.name).filter(Boolean) as string[]
}
