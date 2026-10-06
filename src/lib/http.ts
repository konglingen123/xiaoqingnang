import { NextResponse } from 'next/server'
import { closeDb, openDb, requireSession, type Db, type Session } from './db'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function authorized(db: Db, req: Request, permission = '', write = false): Session {
  const result = requireSession(db, req, write, permission)
  if ('error' in result) throw new HttpError(result.status!, result.error!)
  return result.session
}
export async function readJson(req: Request) {
  if (Number(req.headers.get('content-length')) > 2_000_000) throw new HttpError(413, '请求内容过大')
  const raw = await req.text()
  if (Buffer.byteLength(raw) > 2_000_000) throw new HttpError(413, '请求内容过大')
  try { return JSON.parse(raw) } catch { throw new HttpError(400, '请求数据格式不正确') }
}
export async function route(work: (db: Db) => unknown | Promise<unknown>) {
  const db = openDb()
  try {
    const result = await work(db)
    return result instanceof Response ? result : NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({error: error.message}, {status: error.status})
    console.error('[api]', error)
    return NextResponse.json({error: '操作失败，数据未保存，请稍后重试'}, {status: 500})
  } finally { closeDb(db) }
}
