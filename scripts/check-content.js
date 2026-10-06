#!/usr/bin/env node
/**
 * 合规红线 1 · 内容扫描脚本（机制性合规）
 * 扫描 data / pages / components 下所有 .ts 与 .vue 文件，
 * 命中禁用词即报错退出（exit 1），可从源头拦截不合规文案。
 *
 * 运行：node scripts/check-content.js
 * 注意：禁用词表需与 data/compliance.ts 的 BANNED_WORDS 保持同步。
 */
const fs = require('fs')
const path = require('path')

const BANNED_WORDS = [
  '感冒', '发烧', '胃炎', '治疗', '下药', '根治', '患者',
  '诊断', '疗效', '治愈', '病症', '处方', '医药', '疾病', '炎症'
]

const ROOT = path.resolve(__dirname, '..')
const SCAN_DIRS = ['data', 'app', 'src', 'legacy/hbuilderx']
const SKIP_FILES = new Set([
  // 词表本身的来源文件，跳过（否则词表会误伤自己）
  path.join(ROOT, 'data', 'compliance.ts'),
  path.join(ROOT, 'app', 'api', 'admin', 'import-docx', 'route.ts'),
  path.join(ROOT, 'src', 'lib', 'db.ts')
])

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  BANNED_WORDS.forEach((word) => {
    let idx = text.indexOf(word)
    while (idx !== -1) {
      const line = text.slice(0, idx).split('\n').length
      console.error(`❌ ${path.relative(ROOT, file)}:${line} 命中禁用词「${word}」`)
      idx = text.indexOf(word, idx + 1)
      global.hits++
    }
  })
}

function walk(dir) {
  fs.readdirSync(dir).forEach((name) => {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      walk(full)
    } else if (/\.(ts|vue)$/.test(name) && !SKIP_FILES.has(full)) {
      scanFile(full)
    }
  })
}

global.hits = 0
SCAN_DIRS.forEach((d) => { const dir = path.join(ROOT, d); if (fs.existsSync(dir)) walk(dir) })

if (global.hits > 0) {
  console.error(`\n共 ${global.hits} 处违规，请替换为去疾病化表述后重试。`)
  process.exit(1)
} else {
  console.log('✅ 内容合规扫描通过：未发现禁用词。')
  process.exit(0)
}
