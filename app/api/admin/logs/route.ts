import { NextResponse } from 'next/server'
import { all, closeDb, openDb, requireSession } from '@/src/lib/db'
export const runtime='nodejs'
export async function GET(request:Request){const db=openDb();try{const auth=requireSession(db,request,false,'logs.read');if('error' in auth)return NextResponse.json({error:auth.error},{status:auth.status});return NextResponse.json({logs:all(db,'SELECT l.action,l.entity_type AS entityType,l.entity_id AS entityId,l.detail_json AS detail,l.created_at AS createdAt,u.username FROM admin_audit_logs l LEFT JOIN admin_users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 100')})}finally{closeDb(db)}}
