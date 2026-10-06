/** 小青囊 H5 公开模型：后台发布一条，前台呈现一条。 */

export interface AreaItem {
  id: string
  name: string
  hint: string
  subtitle: string
  aliases: string[]
}

export type PublicContentType = 'article' | 'method'

export interface PublicContentCase {
  background: string
  methodUsed: string
  duration?: string
  subjectiveRecord: string
  limitations: string
  sourceLocator: string
}

export interface PublicContentSource {
  title: string
  author?: string
  platform?: string
  url?: string
  originalText: string
  notes?: string[]
}

export interface PublicPointReference {
  id: string
  name: string
  aliases: string[]
  bodyAreaId: string
  professionalLocation: string
  everydayLocation: string
  contentHtml: string
  commonMistakes?: string
  notices?: string
}

export interface MethodPointLink {
  pointId: string
  order: number
  instruction: string
  point: PublicPointReference
}

export interface PublicProblemReference {
  id: string
  name: string
  aliases: string[]
  description?: string
  bodyAreaIds: string[]
}

export interface ProblemMethodLink {
  contentId: string
  order: number
  evidenceType: 'direct' | 'case' | 'author' | 'pending'
  evidenceText: string
  method: { id: string; title: string; methodName?: string; status: string }
}

export interface ProblemContentLink {
  problemId: string
  order: number
  evidenceType: 'direct' | 'case' | 'author' | 'pending'
  evidenceText: string
  problem: PublicProblemReference
}

/** 文集元数据独立于正文，方便以后增加专刊、音频与付费阅读而不改文章结构。 */
export interface AnthologyMeta {
  columnId?: string
  columnName?: string
  issueNumber?: number
  topics: string[]
  coverImage?: string
  editorNote?: string
  originalPublishedAt?: number
}

export interface AnthologyColumnConfig {
  id: string
  name: string
  description: string
  color: string
  sort_order: number
  status: 'visible' | 'hidden'
}

export interface PublishedContentItem {
  id: string
  type: PublicContentType
  title: string
  summary: string
  keywords: string[]
  areaIds: string[]
  contentHtml: string
  methodName?: string
  methodType?: string
  materials: string[]
  usageScope: string[]
  notices: string[]
  outsideScope: string[]
  helpConditions: string[]
  casesHtml: string
  source: PublicContentSource
  reviewedAt?: number
  publishedAt?: number
  guideAvailable: boolean
  anthology?: AnthologyMeta
  pointLinks?: MethodPointLink[]
  problemLinks?: ProblemContentLink[]
}

/** 来源弹层的显示模型，不再参与旧的多层知识编译。 */
export interface KnowledgeSource {
  id: string
  title: string
  authorOrSpeaker?: string
  publisherOrPlatform?: string
  publishedAt?: string
  sourceType: 'practitioner_experience' | 'web_source'
  directUrl?: string
  originalText?: string
  verificationStatus: 'pending' | 'verified'
  status: 'published'
  createdAt: number
  reviewedAt?: number
  version: number
  notes?: string[]
}
