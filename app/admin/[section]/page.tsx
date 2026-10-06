import { AdminGuard } from '@/src/components/AdminShell'
import { AdminWorkspace } from '@/src/components/AdminWorkspace'
export const runtime='nodejs'
const allowed=['articles','methods','problems','points','columns','review','logs','backup','permissions'] as const
export default async function AdminSectionPage({params}:{params:Promise<{section:string}>}){
  const {section}=await params
  if(!allowed.includes(section as any)) return <div className="empty">页面不存在</div>
  return <AdminGuard><AdminWorkspace section={section as any}/></AdminGuard>
}
