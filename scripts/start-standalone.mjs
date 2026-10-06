import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const staticSource = resolve(root, '.next', 'static')
const staticTarget = resolve(root, '.next', 'standalone', '.next', 'static')

if (!existsSync(staticSource)) {
  throw new Error('找不到 .next/static，请先执行 npm run build。')
}

mkdirSync(staticTarget, { recursive: true })
cpSync(staticSource, staticTarget, { recursive: true })

const child = spawn(process.execPath, [resolve(root, '.next', 'standalone', 'server.js')], {
  cwd: root,
  env: { ...process.env, PORT: process.env.PORT || '4173' },
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
