import { NextResponse } from 'next/server'
import { closeDb, cookies, openDb, run, SESSION_COOKIE, sha256 } from '@/src/lib/db'
export const runtime='nodejs'
export async function POST(request:Request){const db=openDb();try{const token=cookies(request)[SESSION_COOKIE];if(token)run(db,'DELETE FROM admin_sessions WHERE token_hash=?',[sha256(token)]);const response=NextResponse.json({ok:true});response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,sameSite:'strict',path:'/',maxAge:0});return response}finally{closeDb(db)}}
