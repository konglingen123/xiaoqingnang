import { route, authorized, readJson, HttpError } from '@/src/lib/http'
import { all, one, run } from '@/src/lib/db'
export const runtime='nodejs'

export async function GET(req:Request){
  return route(db=>{
    authorized(db,req,'permissions.manage')
    const catalog=all<any>(db,'SELECT code,label,permission_group AS permissionGroup FROM admin_permission_catalog ORDER BY sort_order')
    const users=all<any>(db,`SELECT u.id,u.username,a.account_type AS accountType,u.created_at AS createdAt
      FROM admin_users u JOIN admin_user_access a ON a.user_id=u.id ORDER BY u.created_at,u.id`).map((u:any)=>({...u,permissions:all<any>(db,'SELECT permission_code AS code FROM admin_user_permissions WHERE user_id=? AND enabled=1',[u.id]).map((x:any)=>x.code),catalog}))
    return {users,catalog}
  })
}

export async function POST(req:Request){
  return route(async db=>{
    const actor=authorized(db,req,'permissions.manage',true); const body=await readJson(req); const userId=String(body.userId||'');
    const target=one<any>(db,'SELECT account_type AS accountType FROM admin_user_access WHERE user_id=?',[userId]);
    if(!target) throw new HttpError(404,'管理员不存在');
    if(target.accountType==='super_admin') throw new HttpError(400,'超级管理员权限不可改');
    const allowed=new Set(all<any>(db,'SELECT code FROM admin_permission_catalog').map((x:any)=>x.code)); const values=[...new Set(Array.isArray(body.permissions)?body.permissions.filter((x:any)=>allowed.has(String(x))).map(String):[])];
    run(db,'DELETE FROM admin_user_permissions WHERE user_id=?',[userId]); for(const code of values) run(db,'INSERT INTO admin_user_permissions(user_id,permission_code,enabled,updated_at) VALUES(?,?,1,?)',[userId,code,Date.now()]);
    run(db,'INSERT INTO admin_audit_logs(user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?)',[actor.user_id,'permissions.update','admin_user',userId,JSON.stringify({permissions:values}),Date.now()]); return {ok:true,permissions:values}
  })
}
