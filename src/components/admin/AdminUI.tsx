'use client'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { STATUS_LABELS } from '@/src/lib/admin-client'

export function PageHeading({title,description,actions}:{title:string;description?:string;actions?:ReactNode}) {
  return <div className="admin-page-heading"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="admin-actions">{actions}</div>}</div>
}
export function ErrorNotice({message,retry}:{message:string;retry?:()=>void}) {
  return <div className="admin-error" role="alert"><span>{message}</span>{retry&&<button className="admin-button secondary" onClick={retry}>重新加载</button>}</div>
}
export function Loading(){return <div className="admin-empty" role="status"><span className="admin-spinner"/>正在加载资料…</div>}
export function Empty({filtered=false}:{filtered?:boolean}) {return <div className="admin-empty"><strong>{filtered?'没有匹配的资料':'暂无资料'}</strong><p>{filtered?'试试其他关键词，或清除筛选条件。':'新建资料后会显示在这里。'}</p></div>}
export function Status({value}:{value:string}){return <span className={`admin-status status-${value}`}>{STATUS_LABELS[value]||value||'—'}</span>}
export function Pagination({page,total,size=24,onChange,busy=false}:{page:number;total:number;size?:number;onChange:(page:number)=>void;busy?:boolean}) {
  const pages=Math.max(1,Math.ceil(total/size))
  return <nav className="admin-pagination" aria-label="列表分页"><span>共 {total.toLocaleString('zh-CN')} 条{total>0&&` · ${(page-1)*size+1}–${Math.min(page*size,total)} 条`}</span><div><button className="admin-button secondary" disabled={page<=1||busy} onClick={()=>onChange(page-1)}>上一页</button><span aria-live="polite">{page} / {pages}</span><button className="admin-button secondary" disabled={page>=pages||busy} onClick={()=>onChange(page+1)}>下一页</button></div></nav>
}
export function Dialog({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null); const titleId=useId()
  useEffect(()=>{const previous=document.activeElement as HTMLElement;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus()}},[])
  return <dialog ref={ref} className="admin-modal" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><div className="admin-modal-head"><h2 id={titleId}>{title}</h2><button type="button" aria-label="关闭对话框" className="admin-icon-button" disabled={busy} onClick={onClose}>×</button></div>{children}</dialog>
}
export function ConfirmDialog({title,description,busy,onCancel,onConfirm,label='确认',error}:{title:string;description:string;busy:boolean;onCancel:()=>void;onConfirm:()=>void;label?:string;error?:string}) {
  return <Dialog title={title} onClose={onCancel} busy={busy}><p className="admin-dialog-description">{description}</p>{error&&<ErrorNotice message={error}/>}<div className="admin-dialog-actions"><button autoFocus className="admin-button secondary" disabled={busy} onClick={onCancel}>取消</button><button className="admin-button" disabled={busy} onClick={onConfirm}>{busy?'处理中…':label}</button></div></Dialog>
}
