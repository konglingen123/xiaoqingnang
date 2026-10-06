'use client'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastContextValue = { show: (message: string, tone?: 'info'|'success'|'error') => void }
const ToastContext = createContext<ToastContextValue|null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{message:string;tone:string}|null>(null)
  const show = useCallback((message:string,tone='info') => { setToast({message,tone}); window.setTimeout(()=>setToast(null),3200) }, [])
  const value=useMemo(()=>({show}),[show])
  return <ToastContext.Provider value={value}>{children}{toast&&<div className={`toast toast-${toast.tone}`} role="status">{toast.message}</div>}</ToastContext.Provider>
}
export function useToast() { const value=useContext(ToastContext); if(!value) throw new Error('ToastProvider missing'); return value }
