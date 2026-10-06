import { NextResponse } from 'next/server'
import { all, closeDb, openDb, requireSession } from '@/src/lib/db'
export const runtime='nodejs'
export async function GET(request:Request){const db=openDb();try{const auth=requireSession(db,request,false,'backup.export');if('error' in auth)return NextResponse.json({error:auth.error},{status:auth.status});const body={exportedAt:Date.now(),contents:all<any>(db,'SELECT payload_json FROM admin_contents ORDER BY updated_at DESC').map(r=>JSON.parse(r.payload_json))};return new NextResponse(JSON.stringify(body,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="xiaoqingnang-backup.json"'}})}finally{closeDb(db)}}
