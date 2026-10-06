import { route, authorized } from '@/src/lib/http'
import { detail } from '@/src/services/content'
export const runtime='nodejs'
export async function GET(req:Request,ctx:{params:Promise<{id:string}>}) {
  const {id}=await ctx.params
  return route(db=>{ authorized(db,req);const content=detail(db,id,true);authorized(db,req,content.type==='article'?'articles.read':'methods.read');return {content} })
}
