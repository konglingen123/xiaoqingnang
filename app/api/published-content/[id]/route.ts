import { route } from '@/src/lib/http'
import { detail } from '@/src/services/content'
export const runtime='nodejs'
export async function GET(_req:Request,ctx:{params:Promise<{id:string}>}) { const {id}=await ctx.params; return route(db=>({content:detail(db,id)})) }
