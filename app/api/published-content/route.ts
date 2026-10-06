import { route } from '@/src/lib/http'
import { listContent, publicColumns } from '@/src/services/content'
export const runtime='nodejs'
export async function GET(req:Request) { return route(db=>({...listContent(db,new URL(req.url)),columns:publicColumns(db)})) }
