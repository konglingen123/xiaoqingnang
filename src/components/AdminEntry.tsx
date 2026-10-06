'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminEntry(){
  const router=useRouter(); const [boot,setBoot]=useState<any>(null); const [form,setForm]=useState({username:'',password:''}); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false)
  useEffect(()=>{
    let active=true
    const controller=new AbortController()
    const timer=window.setTimeout(()=>controller.abort(),10000)
    fetch('/api/admin/bootstrap',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async r=>{const d=await r.json().catch(()=>({error:'服务器返回了无法读取的数据。'}));if(!r.ok)throw new Error(d.error||'后台验证失败，请重试。');return d})
      .then(d=>{if(!active)return;setBoot(d);if(d.authenticated)router.replace('/admin/articles')})
      .catch(error=>{if(active)setMessage(error?.name==='AbortError'?'后台验证超时，请刷新页面重试。':(error?.message||'后台验证失败，请刷新页面重试。'))})
      .finally(()=>window.clearTimeout(timer))
    return ()=>{active=false;controller.abort();window.clearTimeout(timer)}
  },[router])
  if(!boot)return <main className="login-wrap"><div className="login-card"><p>{message||'正在验证后台…'}</p>{message&&<button className="admin-button" type="button" onClick={()=>window.location.reload()}>重新验证</button>}</div></main>
  const setup=Boolean(boot.needsSetup)
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');const r=await fetch(setup?'/api/admin/setup':'/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});const d=await r.json().catch(()=>({}));setBusy(false);if(!r.ok){setMessage(d.error||'操作失败');return}if(setup){setMessage('初始化完成，请继续登录');setBoot({...boot,needsSetup:false})}else router.replace('/admin/articles')}
  return <main className="login-wrap"><form className="login-card admin-form" onSubmit={submit}><div className="admin-logo login-logo"><b>青</b><div><strong>小青囊</strong><span>内容后台</span></div></div><h1>{setup?'首次初始化':'管理员登录'}</h1><p>{message|| (setup?'创建第一个超级管理员。后续普通管理员权限可在后台配置。':'使用管理员账号进入内容后台。')}</p><label>用户名<input autoComplete="username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required/></label><label>密码<input autoComplete={setup?'new-password':'current-password'} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={8}/></label><button className="admin-button" disabled={busy}>{busy?'处理中…':setup?'创建超级管理员':'登录后台'}</button></form></main>
}
