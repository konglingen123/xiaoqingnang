'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import FrontBottomNav from '@/src/components/FrontBottomNav'
import { RED_FLAGS, SAFETY_STOP_TEXT } from '@/data/compliance'
import BodyFigure from '@/src/components/BodyFigure'

type Item = { id: string; title: string; type?: 'article' | 'skill'; summary?: string; columnName?: string; sourceAuthor?: string; keywords?: string[]; areaIds?: string[] }
type ResultCard = Item & { facts: string[] }

function facts(item: Item) {
  return [item.type === 'article' ? '青囊文集' : '养护方法', item.columnName, item.sourceAuthor].filter(Boolean).slice(0, 3) as string[]
}

export default function HomePage() {
  const [mode, setMode] = useState<'search' | 'body'>('search')
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [cards, setCards] = useState<ResultCard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/published-content?page=1&pageSize=200&type=skill').then((response) => response.json()).then((data) => setItems(data.contents || [])).catch(() => setItems([]))
  }, [])

  const suggestions = useMemo(() => {
    const values = items.flatMap((item) => [item.columnName, ...(item.keywords || []), ...(item.areaIds || [])]).filter((value): value is string => Boolean(value && value.length >= 2 && value.length <= 8))
    return Array.from(new Set(values)).slice(0, 3)
  }, [items])

  async function submitSearch(value = query) {
    const text = value.trim()
    if (!text || loading) return
    if (RED_FLAGS.some((word) => text.includes(word))) { window.alert(SAFETY_STOP_TEXT); return }
    setSubmitted(text); setQuery(''); setLoading(true)
    try {
      const response = await fetch(`/api/published-content?page=1&pageSize=24&mode=chat&q=${encodeURIComponent(text)}`)
      const data = await response.json()
      setCards((data.contents || []).map((item: Item) => ({ ...item, facts: facts(item) })))
    } finally { setLoading(false) }
  }

  return (
    <main className="front-page">
        <header className="front-mode-header">
        <div className="front-brand-lockup"><img className="front-brand-logo" src="/brand/logo-round-v2.svg" alt="小青囊" /><div><div className="front-brand-name">小青囊</div><div className="front-brand-note">日常养护技能库</div></div></div>
        <div className="front-mode-switch" role="tablist" aria-label="查找方式"><button className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}>找方法</button><button className={mode === 'body' ? 'active' : ''} onClick={() => setMode('body')}>看身体</button></div>
      </header>

      {mode === 'search' ? <>
        <section className="front-conversation" aria-live="polite">
          {!submitted ? <div className="front-welcome"><div className="front-hero-panel"><div className="front-sun"><i /><i /><b /></div><div className="front-leaf front-leaf-one" /><div className="front-leaf front-leaf-two" /><div className="front-hero-copy"><div className="front-eyebrow"><span />从已审核的内容中查找</div><h1>今天，想照顾<br />身体的<strong>哪里？</strong></h1><p>说一个位置或日常感受，我们帮你找到可以安全了解和尝试的养护方法。</p></div></div>{suggestions.length > 0 && <div className="front-suggestions"><div className="front-suggestion-label">不知道怎么说？试试这些</div>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => submitSearch(suggestion)}>{suggestion}<span>›</span></button>)}</div>}</div> : <div className="front-messages"><div className="front-user-row"><div className="front-user-bubble">{submitted}</div></div><div className="front-assistant-row"><div className="front-assistant-avatar">囊</div><div className="front-assistant-bubble">{loading ? '正在已审核内容中查找…' : cards.length ? `找到 ${cards.length} 个相关内容` : '暂时没有找到已审核的相关内容'}</div></div>{!loading && cards.length > 0 && <div className="front-result-list">{cards.map((card) => <Link key={`${card.type}-${card.id}`} href={`/article/${card.id}`} className="front-result-card"><div className="front-result-meta"><span className={card.type === 'article' ? 'article' : ''}>{card.type === 'article' ? '文' : '法'}</span><small>{card.type === 'article' ? '青囊文集' : '养护方法'}</small><b>›</b></div><strong>{card.title}</strong><p>{card.summary || (card.type === 'article' ? '阅读这篇青囊文集文章' : '查看这项养护方法的完整说明')}</p><div className="front-fact-row">{card.facts.map((fact) => <span key={fact}>{fact}</span>)}</div></Link>)}</div>}{!loading && cards.length === 0 && <div className="front-empty-note">换一个更具体的位置或名称试试</div>}</div>}
        </section>
        <div className="front-composer-wrap"><form className="front-composer" onSubmit={(event) => { event.preventDefault(); submitSearch() }}><span className="front-search-mark" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => { if (!submitted) window.location.href = '/chat' }} placeholder="例如：久坐后腰骶部不舒服" aria-label="搜索养护内容" /><button className={query.trim() ? '' : 'disabled'} aria-label="开始搜索">↑</button></form></div>
      </> : <section className="front-body-mode"><div className="front-body-header"><strong>点击身体位置</strong><span>选择你关心的部位</span></div><BodyFigure /></section>}
      <FrontBottomNav active="home" />
    </main>
  )
}
