import { PublishedContentItem } from '../typings/models'

const FAVORITES_KEY = 'xqn_reading_favorites'
const NOTES_KEY = 'xqn_reading_notes'

type NoteRecord = { contentId: string; text: string; updatedAt: number; title?: string }
const TITLES_KEY = 'xqn_reading_titles'

function read<T>(key: string, fallback: T): T {
  try {
    const value = uni.getStorageSync(key)
    return Array.isArray(fallback) ? (Array.isArray(value) ? value : fallback) as T : (value || fallback) as T
  } catch (e) {
    return fallback
  }
}

export function getFavoriteIds(): string[] {
  return read<string[]>(FAVORITES_KEY, []).filter(Boolean)
}

export function isFavorite(id: string): boolean {
  return getFavoriteIds().includes(id)
}

export function toggleFavorite(id: string, title = ''): boolean {
  if(title)uni.setStorageSync(TITLES_KEY,{...read<Record<string,string>>(TITLES_KEY,{}),[id]:title})
  const ids = getFavoriteIds()
  const index = ids.indexOf(id)
  if (index >= 0) ids.splice(index, 1)
  else ids.unshift(id)
  uni.setStorageSync(FAVORITES_KEY, ids)
  return index < 0
}

export function getNotes(): NoteRecord[] {
  return read<NoteRecord[]>(NOTES_KEY, []).filter((note) => note?.contentId && note?.text)
}

export function getNote(id: string): string {
  return getNotes().find((note) => note.contentId === id)?.text || ''
}

export function saveNote(id: string, text: string, title = ''): void {
  const notes = getNotes().filter((note) => note.contentId !== id)
  if (text.trim()) notes.unshift({ contentId: id, text: text.trim(), updatedAt: Date.now(), title })
  uni.setStorageSync(NOTES_KEY, notes)
}

export function favoriteItems(contents: PublishedContentItem[]) {
  const titles=read<Record<string,string>>(TITLES_KEY,{})
  return getFavoriteIds().map(id=>({id,title:contents.find(item=>item.id===id)?.title||titles[id]||'已收藏的资料'}))
}
