import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { NextResponse } from 'next/server'
import { closeDb, normalizeContent, openDb, requireSession, saveContent, stripTags, audit } from '@/src/lib/db'
export const runtime='nodejs'
export const maxDuration=60
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c])}
export async function POST(request:Request){
  const db=openDb()
  try{
    const auth=requireSession(db,request,true,'articles.write'); if('error' in auth) return NextResponse.json({error:auth.error},{status:auth.status})
    const type=(request.headers.get('content-type')||'').split(';')[0]; if(type!=='application/vnd.openxmlformats-officedocument.wordprocessingml.document') return NextResponse.json({error:'目前只支持 .docx 文件'},{status:415})
    const buffer=Buffer.from(await request.arrayBuffer()); if(!buffer.length||buffer.length>120*1024*1024) return NextResponse.json({error:'Word 文件为空或超过120MB'},{status:413})
    const original=path.basename(new URL(request.url).searchParams.get('name')||'article.docx'); const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'xqn-docx-')); const archive=path.join(tempDir,'article.docx')
    try{
      fs.writeFileSync(archive,buffer); const xml=execFileSync('unzip',['-p',archive,'word/document.xml'],{encoding:'utf8',maxBuffer:120*1024*1024})
      const paragraphs=[...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(m=>[...m[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(x=>x[1]).join('').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()).filter(Boolean)
      const html=paragraphs.map((p,i)=>`<${i===0?'h2':'p'}>${escapeHtml(p)}</${i===0?'h2':'p'}>`).join(''); if(stripTags(html).length<20) return NextResponse.json({error:'没有从 Word 中读取到有效正文'},{status:422})
      const title=path.basename(original,path.extname(original)).replace(/^\d{4}-\d{2}-\d{2}_/,'').trim(); const content=normalizeContent({id:`CNT-${crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase()}`,type:'article',title,summary:stripTags(html).slice(0,108),contentHtml:html,sourceTitle:title,sourcePlatform:'Word 导入',sourceText:`原始 Word 文件：${original}`,sourceNotes:'由后台导入，请在发布前校对正文、图片、专栏与阅读边界。',outsideScope:'本文用于资料阅读，不作为诊断、处方或自行操作指引。',columnName:'青囊选读',status:'draft'})
      const saved=saveContent(db,content,auth.session.user_id); audit(db,auth.session.user_id,'import','article',content.id,{name:original,bytes:buffer.length}); return NextResponse.json({ok:true,content:saved.content,missing:saved.missing})
    }finally{fs.rmSync(tempDir,{recursive:true,force:true})}
  }finally{closeDb(db)}
}
