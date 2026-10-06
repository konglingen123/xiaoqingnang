import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
export const runtime='nodejs'
const types:Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4'}
export async function GET(_request:Request,context:{params:Promise<{filename:string}>}){const {filename}=await context.params;const root=process.env.XQN_UPLOAD_DIR||path.join(process.cwd(),'.runtime','uploads');const target=path.join(root,path.basename(filename));if(!fs.existsSync(target))return NextResponse.json({error:'素材不存在'},{status:404});const ext=path.extname(target).toLowerCase();return new NextResponse(fs.readFileSync(target),{headers:{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'public, max-age=86400'}})}
