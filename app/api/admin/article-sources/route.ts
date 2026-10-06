import { NextResponse } from 'next/server'
import { closeDb, openDb, requireSession, one } from '@/src/lib/db'
export const runtime='nodejs'
export async function GET(request:Request){const db=openDb();try{const auth=requireSession(db,request,false,'source.manage');if('error' in auth)return NextResponse.json({error:auth.error},{status:auth.status});return NextResponse.json({sourceKey:'zibingziyi',total:(one<any>(db,'SELECT COUNT(*) AS count FROM anthology_source_links WHERE source_key=?',['zibingziyi'])||{}).count||0,candidates:(one<any>(db,"SELECT COUNT(*) AS count FROM anthology_source_candidates WHERE source_key=? AND screening_status IN ('candidate','selected')",['zibingziyi'])||{}).count||0})}finally{closeDb(db)}}
