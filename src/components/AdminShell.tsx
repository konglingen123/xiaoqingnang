'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from './ToastProvider'
import { ADMIN_SECTIONS, type AdminBootstrap, type AdminSection, adminRequest } from '@/src/lib/admin-client'

const GROUPS=['青囊文集','基础数据库','系统工具']
const glyphs:Record<AdminSection,string>={articles:'文',columns:'栏',review:'审',methods:'法',problems:'问',points:'穴',permissions:'权',logs:'记',backup:'备'}

export function useAdminBootstrap() {
  const [bootstrap,setBootstrap]=useState<AdminBootstrap|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  const load=()=>{setLoading(true);setError('');adminRequest<AdminBootstrap>('/api/admin/bootstrap').then(setBootstrap).catch(e=>setError(e.message)).finally(()=>setLoading(false))}
  useEffect(load,[])
  return {bootstrap,loading,error,refresh:load}
}

export function AdminGuard({children}:{children:ReactNode}) {
  const {bootstrap,loading,error,refresh}=useAdminBootstrap(); const router=useRouter()
  useEffect(()=>{if(!loading&&bootstrap&&!bootstrap.authenticated) router.replace('/admin')},[loading,bootstrap,router])
  if(loading) return <div className="admin-loading" role="status">正在验证后台会话…</div>
  if(error) return <div className="admin-loading"><div className="admin-error"><span>{error}</span><button className="admin-button secondary" onClick={refresh}>重新加载</button></div></div>
  if(!bootstrap?.authenticated) return null
  return <AdminLayout bootstrap={bootstrap}>{children}</AdminLayout>
}

export function AdminLayout({children,bootstrap}:{children:ReactNode;bootstrap:AdminBootstrap}) {
  const pathname=usePathname()||'/admin'; const router=useRouter(); const {show}=useToast(); const [open,setOpen]=useState(true); const [expanded,setExpanded]=useState<Record<string,boolean>>({青囊文集:true,基础数据库:true,系统工具:true})
  const can=(item:typeof ADMIN_SECTIONS[number])=>bootstrap.user?.accountType==='super_admin'||bootstrap.permissions.some(p=>p.code===item.permission)
  const sections=useMemo(()=>GROUPS.map(group=>({group,items:ADMIN_SECTIONS.filter(item=>item.group===group&&can(item))})).filter(section=>section.items.length),[bootstrap])
  const logout=async()=>{try{await adminRequest('/api/admin/logout',{method:'POST',headers:{'X-CSRF-Token':bootstrap.user?.csrfToken||''}});show('已退出后台','success');router.replace('/admin')}catch(e:any){show(e.message||'退出失败','error')}}
  return <div className="admin-shell"><aside className={`admin-sidebar ${open?'is-open':''}`} aria-label="后台导航"><div className="admin-logo"><b>青</b><div><strong>小青囊</strong><span>内容后台</span></div></div><button className="admin-collapse" onClick={()=>setOpen(!open)} aria-label={open?'收起菜单':'展开菜单'} aria-expanded={open}>{open?'‹':'›'}</button><nav className="admin-nav">{sections.map(section=><section key={section.group}><button className="admin-group-toggle" onClick={()=>setExpanded(x=>({...x,[section.group]:!x[section.group]}))} aria-expanded={expanded[section.group]}><span>{section.group}</span><span aria-hidden="true">{expanded[section.group]?'⌄':'›'}</span></button>{expanded[section.group]&&section.items.map(item=>{const active=pathname===`/admin/${item.key}`||pathname.startsWith(`/admin/${item.key}/`);return <Link className={active?'active':''} href={`/admin/${item.key}`} key={item.key} aria-current={active?'page':undefined}><span className="nav-icon" aria-hidden="true">{glyphs[item.key]}</span><span>{item.label}</span></Link>})}</section>)}</nav></aside><main className="admin-main"><header className="admin-top"><div className="admin-breadcrumb"><Link href="/admin/articles">后台</Link><span>/</span><strong>{ADMIN_SECTIONS.find(item=>pathname===`/admin/${item.key}`||pathname.startsWith(`/admin/${item.key}/`))?.label||'控制台'}</strong></div><div className="admin-top-actions"><Link href="/" className="admin-button secondary">回到首页</Link><button className="admin-button secondary" onClick={logout}>退出</button></div></header>{children}</main></div>
}
