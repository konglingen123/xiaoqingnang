import { NextResponse } from 'next/server'
import { closeDb, openDb, requireSession, run } from '@/src/lib/db'
export const runtime='nodejs'
export async function POST(request:Request,context:{params:Promise<{id:string}>}){const {id}=await context.params;const db=openDb();try{const auth=requireSession(db,request,true,'columns.manage');if('error' in auth)return NextResponse.json({error:auth.error},{status:auth.status});run(db,'DELETE FROM anthology_columns WHERE id=?',[id]);return NextResponse.json({ok:true})}finally{closeDb(db)}}
