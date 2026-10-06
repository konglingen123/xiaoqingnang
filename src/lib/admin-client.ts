export const ADMIN_SECTIONS = [
  { key: 'articles', label: '文章管理', group: '青囊文集', permission: 'articles.read', write: 'articles.write', description: '管理已发布文章与本地编辑稿。来源文章的审核在「来源同步与审核」。' },
  { key: 'columns', label: '专栏设计', group: '青囊文集', permission: 'columns.manage', write: 'columns.manage', description: '整理专栏的名称、介绍、颜色与展示顺序。' },
  { key: 'review', label: '来源同步与审核', group: '青囊文集', permission: 'source.manage', write: 'source.manage', description: '从自病自医扫描候选，在这里查看尚未完成审核的资料。' },
  { key: 'methods', label: '方法库', group: '基础数据库', permission: 'methods.read', write: 'methods.write', description: '维护方法内容、适用范围、关联部位与资料来源。' },
  { key: 'problems', label: '问题库', group: '基础数据库', permission: 'problems.read', write: 'problems.write', description: '整理用户说法、问题描述与方法关联。' },
  { key: 'points', label: '穴位库', group: '基础数据库', permission: 'points.read', write: 'points.write', description: '维护专业定位与日常找法，供方法库重复引用。' },
  { key: 'permissions', label: '管理员权限', group: '系统工具', permission: 'permissions.manage', write: 'permissions.manage', description: '配置普通管理员可以访问的菜单与操作。' },
  { key: 'logs', label: '操作记录', group: '系统工具', permission: 'logs.read', write: '', description: '查看最近的操作人、操作时间与变更记录。' },
  { key: 'backup', label: '导出备份', group: '系统工具', permission: 'backup.export', write: '', description: '导出内容资料，供留档与迁移参考。' },
] as const
export type AdminSection = typeof ADMIN_SECTIONS[number]['key']
export type AdminBootstrap = { authenticated: boolean; needsSetup: boolean; user: {username: string; accountType: string; csrfToken: string}|null; permissions: {code: string; label?: string; permissionGroup?: string}[] }
export class AdminRequestError extends Error { constructor(message: string, public status: number) { super(message) } }
export async function adminRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new AdminRequestError(data?.error || (response.status === 401 ? '登录已过期，请重新登录。' : '请求失败，请稍后重试。'), response.status)
  if (data === null) throw new Error('服务器返回了无法读取的数据，请重试。')
  return data as T
}
export const writeOptions = (csrf: string, body?: unknown): RequestInit => ({method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf}, ...(body === undefined ? {} : {body: JSON.stringify(body)})})
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。'
export const STATUS_LABELS: Record<string, string> = {draft:'草稿',ready:'待发布',published:'已发布',withdrawn:'已撤回',verified:'已审核',archived:'已归档',needs_review:'商业复核',clean:'未发现商业痕迹',reviewed:'已复核',candidate:'待筛选',selected:'待导入',ignored:'已忽略',imported:'已导入',visible:'显示中',hidden:'已隐藏'}
export function formatDate(value: unknown) { if (!value) return '—'; const date = new Date(value as string|number); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit'}) }
