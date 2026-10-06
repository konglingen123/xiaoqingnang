import { AdminGuard } from '@/src/components/AdminShell'
import { ContentEditor } from '@/src/components/ContentEditor'
import { CatalogEditor } from '@/src/components/CatalogEditor'
export const runtime='nodejs'
export default async function AdminEditPage({params}:{params:Promise<{section:string;id:string}>}){
  const {section,id}=await params; const type=section==='methods'?'skill':'article'
  if(!['articles','methods','problems','points'].includes(section)) return <div className="empty">页面不存在</div>
  return <AdminGuard>{section==='problems'?<CatalogEditor id={id==='new'?undefined:id} kind="problem"/>:section==='points'?<CatalogEditor id={id==='new'?undefined:id} kind="point"/>:<ContentEditor id={id==='new'?undefined:id} type={type}/>}</AdminGuard>
}
