import { all, one, normalizeContent, relations, sanitizeHtml, type Db } from '@/src/lib/db'
import { RED_FLAGS, SAFETY_STOP_TEXT } from '@/data/compliance'
import { AREAS } from '@/data/areas'
import { HttpError } from '@/src/lib/http'

const projection = `id,title,status,version,updated_at,published_at,
 json_extract(payload_json,'$.type') AS type,
 substr(json_extract(payload_json,'$.summary'),1,180) AS summary,
 json_extract(payload_json,'$.coverImage') AS coverImage,
 json_extract(payload_json,'$.columnId') AS columnId,
 json_extract(payload_json,'$.columnName') AS columnName,
 json_extract(payload_json,'$.sourceAuthor') AS sourceAuthor,
 json_extract(payload_json,'$.methodName') AS methodName,
 json_extract(payload_json,'$.reviewStatus') AS reviewStatus,
 json_extract(payload_json,'$.sourceKind') AS sourceKind,
 json_extract(payload_json,'$.keywords') AS keywords,
 json_extract(payload_json,'$.bodyAreaIds') AS bodyAreaIds,
 coalesce(json_extract(payload_json,'$.readingMinutes'),1) AS readingMinutes`

function card(row: any) {
  return {id:row.id,title:row.title,type:row.type||'skill',summary:row.summary||'',
    coverImage:row.coverImage||'',columnId:row.columnId||'',columnName:row.columnName||'',
    sourceAuthor:row.sourceAuthor||'',methodName:row.methodName||'',keywords:parseJsonArray(row.keywords),areaIds:parseJsonArray(row.bodyAreaIds),status:row.status,
    version:row.version,updatedAt:row.updated_at,publishedAt:row.published_at,
    reviewStatus:row.reviewStatus,sourceKind:row.sourceKind,readingMinutes:row.readingMinutes}
}
function parseJsonArray(value:any): string[] { if(Array.isArray(value)) return value.map(String); try { const parsed=JSON.parse(value||'[]'); return Array.isArray(parsed)?parsed.map(String):[] } catch { return String(value||'').split(/[,，\n]+/).map(v=>v.trim()).filter(Boolean) } }
export function listContent(db: Db, url: URL, admin = false) {
  const q = (url.searchParams.get('q') || url.searchParams.get('search') || '').trim().slice(0,200)
  if (!admin && url.searchParams.get('mode') === 'chat' && RED_FLAGS.some(word => q.includes(word))) {
    return {contents:[],total:0,page:1,pageSize:24,hasMore:false,safetyStop:SAFETY_STOP_TEXT}
  }
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page'))||1))
  const pageSize = Math.min(500, Math.max(1,Math.floor(Number(url.searchParams.get('pageSize'))||24)))
  const where: string[] = [admin ? "status != 'archived'" : "status='published'"]
  const args: any[] = []
  const type = url.searchParams.get('type')
  if (type === 'article' || type === 'skill') {where.push("json_extract(payload_json,'$.type')=?");args.push(type)}
  const column = url.searchParams.get('column')
  if (column) {where.push("json_extract(payload_json,'$.columnId')=?");args.push(column)}
  const area = url.searchParams.get('area') || url.searchParams.get('areaId')
  if (area) {
    where.push(`(EXISTS (SELECT 1 FROM json_each(json_extract(c.payload_json,'$.bodyAreaIds')) WHERE value=?)
      OR EXISTS (SELECT 1 FROM content_point_links l JOIN admin_points p ON p.id=l.point_id WHERE l.content_id=c.id AND p.status='verified' AND p.body_area_id=?)
      OR EXISTS (SELECT 1 FROM problem_content_links l JOIN admin_problems p ON p.id=l.problem_id JOIN json_each(json_extract(p.payload_json,'$.bodyAreaIds')) a WHERE l.content_id=c.id AND p.status='verified' AND a.value=?))`)
    args.push(area,area,area)
  }
  if (q) {
    const terms = [q]
    if (url.searchParams.get('mode')==='chat') {
      for (const area of AREAS) if ([area.name,...area.aliases].some(name=>q.includes(name))) terms.push(area.name,...area.aliases)
    }
    const fields = ["title","json_extract(payload_json,'$.contentHtml')","json_extract(payload_json,'$.summary')","json_extract(payload_json,'$.keywords')"]
    where.push('(' + [...new Set(terms)].map(term => {
      args.push(...fields.map(()=>'%'+term.replace(/[\\%_]/g,'\\$&')+'%'))
      return '('+fields.map(f=>f+" LIKE ? ESCAPE '\\'").join(' OR ')+')'
    }).join(' OR ') + ` OR EXISTS (SELECT 1 FROM problem_content_links l JOIN admin_problems p ON p.id=l.problem_id WHERE l.content_id=c.id AND p.status='verified' AND (p.name LIKE ? OR json_extract(p.payload_json,'$.aliases') LIKE ?)))`)
    args.push('%'+q+'%','%'+q+'%')
  }
  if (admin) {
    const status=url.searchParams.get('status')
    if (status) {where.push('status=?');args.push(status)}
    const review="coalesce(json_extract(payload_json,'$.sourceKind'),'')='zibingziyi' AND status!='published' AND coalesce(json_extract(payload_json,'$.reviewStatus'),'')!='reviewed'"
    if (url.searchParams.get('view')==='review') where.push('('+review+')')
    else if (type==='article') where.push('NOT ('+review+')')
  }
  const condition=where.join(' AND ')
  const total=one<any>(db,'SELECT count(*) AS total FROM admin_contents c WHERE '+condition,args)?.total||0
  const contents=all<any>(db,'SELECT '+projection+' FROM admin_contents c WHERE '+condition+' ORDER BY published_at DESC,updated_at DESC,id LIMIT ? OFFSET ?',[...args,pageSize,(page-1)*pageSize]).map(card)
  return {contents,total,page,pageSize,hasMore:page*pageSize<total}
}
export function publicColumns(db:Db) {
  return all(db,`SELECT col.id,col.name,col.description,col.color,col.sort_order AS sortOrder,count(c.id) AS count
    FROM anthology_columns col JOIN admin_contents c ON json_extract(c.payload_json,'$.columnId')=col.id
    WHERE col.status='visible' AND c.status='published' AND json_extract(c.payload_json,'$.type')='article'
    GROUP BY col.id ORDER BY col.sort_order,col.name`)
}
export function detail(db:Db,id:string,admin=false) {
  const row=one<any>(db,'SELECT * FROM admin_contents WHERE id=?'+(admin?'':" AND status='published'"),[id])
  if(!row) throw new HttpError(404,'资料不存在或尚未发布')
  const value=relations(db,{...normalizeContent(JSON.parse(row.payload_json)),status:row.status,version:row.version,updatedAt:row.updated_at,publishedAt:row.published_at},!admin)
  if(admin) return value
  const {rawSourceHtml,sourceOriginalHtml,sourceBodyHtml,removedPromotions,sourceNotes,...published}=value
  return {...published,contentHtml:sanitizeHtml(value.contentHtml),casesHtml:sanitizeHtml(value.casesHtml)}
}
