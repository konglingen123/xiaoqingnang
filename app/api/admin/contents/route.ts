import crypto from 'node:crypto'
import { route, authorized, readJson, HttpError } from '@/src/lib/http'
import { listContent } from '@/src/services/content'
import { one, normalizeContent, saveContent } from '@/src/lib/db'
export const runtime='nodejs'
export async function GET(req:Request) {
  return route(db=>{
    const url=new URL(req.url)
    const permission=url.searchParams.get('view')==='review'?'source.manage':url.searchParams.get('type')==='skill'?'methods.read':'articles.read'
    authorized(db,req,permission)
    if(!url.searchParams.has('type')) url.searchParams.set('type','article')
    return listContent(db,url,true)
  })
}
export async function POST(req:Request) {
  return route(async db=>{
    const raw=(await readJson(req)).content||{}
    const previous=raw.id?one<any>(db,'SELECT payload_json,version FROM admin_contents WHERE id=?',[raw.id]):null
    if(previous) {
      const old=JSON.parse(previous.payload_json)
      if(old.type!==raw.type) throw new HttpError(400,'资料类型不能更改')
      if(Number(raw.version)!==previous.version) throw new HttpError(409,'资料已被更新，请重新打开后编辑')
    }
    const user=authorized(db,req,raw.type==='article'?'articles.write':'methods.write',true)
    const content=normalizeContent({...raw,id:raw.id||'CNT-'+crypto.randomUUID()})
    return {ok:true,...saveContent(db,content,user.user_id)}
  })
}
