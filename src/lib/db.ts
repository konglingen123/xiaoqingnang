import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
// @ts-ignore node:sqlite is provided by the supported Node 22+ runtime.
import { DatabaseSync } from 'node:sqlite'

export const SESSION_COOKIE = 'xqn_admin_session'
export const SESSION_SECONDS = 12 * 60 * 60
const ROOT = process.cwd()
const DB_FILE = process.env.XQN_DATABASE_FILE || path.join(ROOT, '.runtime', 'content.db')
const SCHEMA_FILE = path.join(ROOT, 'database', 'schema.sql')
const AREAS = new Set(['head','occiput','forehead','temple','eye','ear','cheek','nose','mouth','jaw','neck','shoulder','chest','breast','nipple-areola','abdomen','pelvis','upper-back','lower-back','buttocks','upper-arm','elbow','forearm','hand','thigh','knee','lower-leg','foot','vulva','penis','scrotum','perineum','anus','whole'])
const AREA_MAP: Record<string, string> = { 腰部:'lower-back', 腰骶部:'lower-back', 后腰:'lower-back', 腰:'lower-back', 腹部:'abdomen', 肚子:'abdomen', 足底:'foot', 脚:'foot', 头部:'head', 头面部:'head', 颈部:'neck', 肩部:'shoulder', 全身:'whole' }
const BANNED = ['治疗','根治','治愈','疗效','诊断','处方','患者','治好了','疾病调理','包治','药到病除','立刻见效','永不复发']
const PERMISSIONS: [string,string,string,number][] = [
  ['methods.read','查看方法库','基础数据库',10], ['methods.write','编辑方法库','基础数据库',20], ['methods.publish','发布方法','基础数据库',30],
  ['problems.read','查看问题库','基础数据库',40], ['problems.write','编辑问题库','基础数据库',50], ['points.read','查看穴位库','基础数据库',60], ['points.write','编辑穴位库','基础数据库',70],
  ['articles.read','查看文章管理','青囊文集',100], ['articles.write','编辑文章','青囊文集',110], ['articles.publish','发布文章','青囊文集',120], ['columns.manage','管理专栏','青囊文集',130], ['source.manage','来源同步与审核','青囊文集',140],
  ['backup.export','导出备份','系统工具',300], ['logs.read','查看操作记录','系统工具',310], ['permissions.manage','管理管理员权限','系统工具',320]
]
export type Db = any
export type Session = { user_id: string; username: string; csrf_token: string; account_type: 'super_admin'|'admin' }
export const now = () => Date.now()
export const text = (value: unknown) => String(value ?? '').trim()
export const json = (value: unknown) => JSON.stringify(value)
export const list = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) : text(value).split(/[\n,，;；]+/).map(v => v.trim()).filter(Boolean)
export const sha256 = (value: unknown) => crypto.createHash('sha256').update(String(value)).digest('hex')

export function openDb(): Db {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  const db = new DatabaseSync(DB_FILE)
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;')
  if (fs.existsSync(SCHEMA_FILE)) db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'))
  for (const [code, label, group, order] of PERMISSIONS) db.prepare('INSERT OR REPLACE INTO admin_permission_catalog(code,label,permission_group,sort_order) VALUES(?,?,?,?)').run(code, label, group, order)
  const stamp = now()
  const users = db.prepare('SELECT id FROM admin_users ORDER BY created_at,id').all() as Array<{id:string}>
  users.forEach((u, index) => db.prepare('INSERT OR IGNORE INTO admin_user_access(user_id,account_type,created_at,updated_at) VALUES(?,?,?,?)').run(u.id, index === 0 ? 'super_admin' : 'admin', stamp, stamp))
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(stamp)
  return db
}
export function closeDb(db: Db) { try { db.close() } catch {} }
export function one<T=any>(db: Db, sql: string, params: unknown[] = []): T|undefined { return db.prepare(sql).get(...params) as T|undefined }
export function all<T=any>(db: Db, sql: string, params: unknown[] = []): T[] { return db.prepare(sql).all(...params) as T[] }
export function run(db: Db, sql: string, params: unknown[] = []) { return db.prepare(sql).run(...params) }

export function stripTags(value: unknown) { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim() }
export function sanitizeHtml(value: unknown) { return String(value || '').replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '').trim() }
export function normalizeContent(input: any = {}) {
  const value: any = { ...input, type: input.type === 'article' ? 'article' : 'skill' }
  value.id=text(value.id); value.title=text(value.title); value.summary=text(value.summary); value.keywords=text(value.keywords)
  value.contentHtml=sanitizeHtml(value.contentHtml || value.methodContentHtml); value.casesHtml=sanitizeHtml(value.casesHtml)
  value.bodyAreaIds=[...new Set(list(value.bodyAreaIds || value.bodyArea).map(v => AREAS.has(v) ? v : AREA_MAP[v]).filter(Boolean))]
  value.accessLevel=value.accessLevel === 'subscription' ? 'subscription' : 'free'
  for (const key of ['methodName','methodType','materials','usageScope','notices','outsideScope','helpConditions','columnId','columnName','issueNumber','topics','coverImage','editorNote','sourceKind','sourceArticleId','reviewStatus','sourceTitle','sourceAuthor','sourcePlatform','sourceUrl','sourceText','sourceNotes']) value[key]=text(value[key])
  value.pointLinks=Array.isArray(input.pointLinks) ? input.pointLinks : []; value.problemLinks=Array.isArray(input.problemLinks) ? input.problemLinks : []
  return value
}
export function normalizePoint(input: any = {}) { const value={...input}; for (const key of ['id','name','bodyAreaId','professionalLocation','everydayLocation','commonMistakes','notices','sourceTitle','sourceText','sourceNotes']) value[key]=text(value[key]); value.aliases=list(value.aliases); value.contentHtml=sanitizeHtml(value.contentHtml); return value }
export function normalizeProblem(input: any = {}) { const value={...input}; for (const key of ['id','name','description','notes','needAsk','dangerNotice']) value[key]=text(value[key]); value.aliases=list(value.aliases); value.bodyAreaIds=[...new Set(list(value.bodyAreaIds).filter(v => AREAS.has(v)))]; value.methodLinks=Array.isArray(input.methodLinks)?input.methodLinks:[]; return value }
export function validateContent(content: any) { const required=['id','type','title','contentHtml','sourceTitle','sourceText']; if(content.type==='skill') required.push('methodName','methodType','materials','usageScope','outsideScope','helpConditions'); const missing=required.filter(k=>!text(content[k])); if(!['article','skill'].includes(content.type)) missing.push('type'); if(content.type==='skill'&&!content.bodyAreaIds.length) missing.push('bodyAreaIds'); if(!stripTags(content.contentHtml)) missing.push('contentHtml'); if(content.type==='skill'&&BANNED.some(w=>[content.title,content.summary,stripTags(content.contentHtml),content.usageScope,content.notices,content.outsideScope,content.helpConditions,stripTags(content.casesHtml)].join(' ').includes(w))) missing.push('compliance'); return [...new Set(missing)] }
export function validatePoint(point: any) { return ['id','name','bodyAreaId','professionalLocation','everydayLocation','contentHtml','sourceTitle','sourceText'].filter(k=>!text(point[k])) }
export function validateProblem(problem: any) { return [...['id','name'].filter(k=>!text(problem[k])), ...(problem.bodyAreaIds.length ? [] : ['bodyAreaIds'])] }

export function relations(db: Db, item: any, publicOnly = false) {
  if (item.type === 'skill') {
    item.pointLinks = all(db, 'SELECT l.point_id AS pointId,l.sort_order AS sortOrder,l.instruction,p.payload_json,p.status FROM content_point_links l JOIN admin_points p ON p.id=l.point_id WHERE l.content_id=? ORDER BY l.sort_order', [item.id]).filter((r:any)=>!publicOnly || r.status==='verified').map((r:any)=>({pointId:r.pointId,sortOrder:r.sortOrder,instruction:r.instruction,point:normalizePoint(JSON.parse(r.payload_json))}))
  }
  item.problemLinks = all(db, 'SELECT l.problem_id AS problemId,l.sort_order AS sortOrder,l.evidence_type AS evidenceType,l.evidence_text AS evidenceText,p.payload_json,p.status FROM problem_content_links l JOIN admin_problems p ON p.id=l.problem_id WHERE l.content_id=? ORDER BY l.sort_order', [item.id]).filter((r:any)=>!publicOnly || r.status==='verified').map((r:any)=>({problemId:r.problemId,sortOrder:r.sortOrder,evidenceType:r.evidenceType,evidenceText:r.evidenceText,problem:normalizeProblem(JSON.parse(r.payload_json))}))
  return item
}
export function publicList(db: Db, page=1, pageSize=24, contentId='', includeBody=false, search='') {
  const current=Math.max(1,Number(page)||1), size=Math.min(60,Math.max(1,Number(pageSize)||24)); const conditions=[contentId?"status='published' AND id=?":"status='published'"]; const args:any[]=contentId?[contentId]:[]; if(search&&!contentId){conditions.push('payload_json LIKE ?');args.push(`%${search}%`)} const where=conditions.join(' AND ')
  const count=(one<any>(db,`SELECT COUNT(*) AS count FROM admin_contents WHERE ${where}`,args)?.count)||0
  const rows=contentId?all<any>(db,`SELECT payload_json,status,version,updated_at,published_at FROM admin_contents WHERE ${where} LIMIT 1`,args):all<any>(db,`SELECT payload_json,status,version,updated_at,published_at FROM admin_contents WHERE ${where} ORDER BY published_at DESC,updated_at DESC LIMIT ? OFFSET ?`,[...args,size,(current-1)*size])
  const values=rows.map(row=>{const item=normalizeContent(JSON.parse(row.payload_json)); Object.assign(item,{status:row.status,version:row.version,updatedAt:row.updated_at,publishedAt:row.published_at}); if(!includeBody){item.contentHtml='';item.casesHtml='';item.sourceText='';item.sourceNotes='';item.rawSourceHtml='';item.sourceOriginalHtml='';item.sourceBodyHtml='';item.removedPromotions=[]} return relations(db,item,true)}); return {values,count,size,page:current}
}

export function cookies(request: Request) { const header=request.headers.get('cookie')||''; return Object.fromEntries(header.split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(v=>v.length===2)) }
export function currentSession(db: Db, request: Request): Session|null { const token=cookies(request)[SESSION_COOKIE]; if(!token) return null; const hash=sha256(token); const row=one<any>(db,'SELECT s.*,u.username,a.account_type FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id LEFT JOIN admin_user_access a ON a.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?',[hash,now()]); return row ? {user_id:row.user_id,username:row.username,csrf_token:row.csrf_token,account_type:row.account_type||'admin'} : null }
export function requireSession(db: Db, request: Request, write=false, permission='') { const session=currentSession(db,request); if(!session) return {error:'请先登录',status:401 as const}; if(write && session.csrf_token !== (request.headers.get('x-csrf-token')||'')) return {error:'安全校验失败，请刷新页面后重试',status:403 as const}; if(permission && session.account_type!=='super_admin' && !one<any>(db,'SELECT enabled FROM admin_user_permissions WHERE user_id=? AND permission_code=?',[session.user_id,permission])?.enabled) return {error:'当前账号没有此操作权限',status:403 as const}; return {session} }
export function hashPassword(password:string,salt:string) { return crypto.pbkdf2Sync(password,Buffer.from(salt,'hex'),310000,32,'sha256').toString('hex') }
export function issueSession(db:Db,userId:string) { const token=crypto.randomBytes(32).toString('base64url'), csrf=crypto.randomBytes(18).toString('base64url'); run(db,'INSERT INTO admin_sessions(token_hash,user_id,csrf_token,expires_at,created_at) VALUES(?,?,?,?,?)',[sha256(token),userId,csrf,now()+SESSION_SECONDS*1000,now()]); return {token,csrf} }
export function audit(db:Db,userId:string|undefined,action:string,entityType:string,entityId:string|undefined,detail:unknown={}) { run(db,'INSERT INTO admin_audit_logs(user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?)',[userId||null,action,entityType,entityId||null,json(detail),now()]) }
export function saveContent(db:Db, content:any, userId:string) { const value=normalizeContent(content), previous=one<any>(db,'SELECT version FROM admin_contents WHERE id=?',[value.id]), missing=validateContent(value), status=missing.length?'draft':'ready', version=(previous?.version||0)+1, stamp=now(); value.status=status; value.updatedAt=stamp; value.version=version; db.exec('BEGIN'); try { if(previous) run(db,'UPDATE admin_contents SET title=?,method_name=?,status=?,payload_json=?,updated_at=?,version=? WHERE id=?',[value.title,value.methodName||'',status,json(value),stamp,version,value.id]); else run(db,'INSERT INTO admin_contents(id,title,method_name,status,payload_json,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?)',[value.id,value.title,value.methodName||'',status,json(value),stamp,stamp,version]); run(db,'DELETE FROM content_point_links WHERE content_id=?',[value.id]); for(const [i,link] of value.pointLinks.entries()) run(db,'INSERT INTO content_point_links(content_id,point_id,sort_order,instruction) VALUES(?,?,?,?)',[value.id,text(link.pointId),i,text(link.instruction)]); run(db,'DELETE FROM problem_content_links WHERE content_id=?',[value.id]); for(const [i,link] of value.problemLinks.entries()) run(db,'INSERT INTO problem_content_links(problem_id,content_id,evidence_type,evidence_text,sort_order) VALUES(?,?,?,?,?)',[text(link.problemId),value.id,['direct','case','author','pending'].includes(link.evidenceType)?link.evidenceType:'pending',text(link.evidenceText),i]); audit(db,userId,'save','content',value.id,{status,version}); db.exec('COMMIT') } catch(e){db.exec('ROLLBACK');throw e} return {content:relations(db,value),missing} }
