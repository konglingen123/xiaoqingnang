import { route, authorized, HttpError } from '@/src/lib/http'
import { detail } from '@/src/services/content'
import { audit, now, run, validateContent } from '@/src/lib/db'
export const runtime='nodejs'
export async function POST(req:Request,ctx:{params:Promise<{id:string;action:string}>}) {
  const {id,action}=await ctx.params
  return route(db=>{
    authorized(db,req)
    if(!['publish','withdraw','archive','restore'].includes(action)) throw new HttpError(400,'不支持的操作')
    const content=detail(db,id,true)
    const user=authorized(db,req,(content.type==='article'?'articles':'methods')+(action==='publish'?'.publish':'.write'),true)
    if(action==='publish') {
      const missing=validateContent(content)
      if(missing.length) throw new HttpError(422,'请补充：'+missing.join('、'))
      if(content.sourceKind==='zibingziyi'&&content.reviewStatus!=='reviewed') throw new HttpError(422,'来源文章需要先完成人工商业复核')
      if([...content.pointLinks,...content.problemLinks].some((link:any)=>(link.point||link.problem)?.status!=='verified')) throw new HttpError(422,'请先审核关联的问题和穴位')
      content.reviewedBy=user.username;content.reviewedAt=now()
    }
    const status=action==='publish'?'published':action==='withdraw'?'withdrawn':action==='archive'?'archived':'draft'
    content.status=status;content.version++;content.updatedAt=now()
    content.publishedAt=status==='published'?now():null
    run(db,'UPDATE admin_contents SET status=?,payload_json=?,version=?,updated_at=?,published_at=?,withdrawn_at=? WHERE id=?',[status,JSON.stringify(content),content.version,content.updatedAt,content.publishedAt,status==='withdrawn'?now():null,id])
    audit(db,user.user_id,action,'content',id,{status})
    return {ok:true,content}
  })
}
