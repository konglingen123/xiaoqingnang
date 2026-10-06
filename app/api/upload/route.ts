import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { audit, closeDb, openDb, requireSession } from '@/src/lib/db'
export const runtime='nodejs'
export const maxDuration=60
export async function POST(request:Request){const db=openDb();try{const auth=requireSession(db,request,true,'articles.write');if('error' in auth)return NextResponse.json({error:auth.error},{status:auth.status});const type=(request.headers.get('content-type')||'').split(';')[0];if(!type.startsWith('image/')&&!type.startsWith('video/'))return NextResponse.json({error:'只支持图片或视频'},{status:415});const buffer=Buffer.from(await request.arrayBuffer());if(!buffer.length||buffer.length>120*1024*1024)return NextResponse.json({error:'文件为空或超过120MB'},{status:413});const url=new URL(request.url);const original=path.basename(url.searchParams.get('name')||'media');const suffix=path.extname(original).toLowerCase().slice(0,10)||'.bin';const dir=process.env.XQN_UPLOAD_DIR||path.join(process.cwd(),'.runtime','uploads');fs.mkdirSync(dir,{recursive:true});const filename=`${crypto.randomUUID().replaceAll('-','')}${suffix}`;fs.writeFileSync(path.join(dir,filename),buffer);audit(db,auth.session.user_id,'upload','media',filename,{contentType:type,bytes:buffer.length});return NextResponse.json({ok:true,url:`/media/${filename}`})}finally{closeDb(db)}}
