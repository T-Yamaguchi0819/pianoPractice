/**
 * 練習記録と設定の localStorage 読み書き(計画書 §8)。
 * Storage は注入可能にしてテストではメモリ実装を使う。
 * 読み書きの失敗(プライベートモード・容量超過・壊れた JSON)は握りつぶして
 * アプリの動作を止めない。
 */

export type ScoreRecord = {
  title: string
  playCount: number
  totalPracticeSec: number
  /** ISO 8601 */
  lastPlayedAt: string
  /** 完走(ループ含む)回数 */
  completions: number
}

export type Records = {
  [scoreId: string]: ScoreRecord
}

export type Settings = {
  midiDeviceId?: string
  showNoteNames: boolean
}

/** localStorage 互換の最小面 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const RECORDS_KEY = 'ppa:v1:records'
const SETTINGS_KEY = 'ppa:v1:settings'

const DEFAULT_SETTINGS: Settings = { showNoteNames: false }

function readJson<T>(storage: KeyValueStorage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(
  storage: KeyValueStorage,
  key: string,
  value: unknown,
): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // 保存できなくても練習は続行できる
  }
}

export function loadRecords(storage: KeyValueStorage): Records {
  const parsed = readJson<Records>(storage, RECORDS_KEY)
  return parsed !== null && typeof parsed === 'object' ? parsed : {}
}

export type PracticeResult = {
  scoreId: string
  title: string
  practiceSec: number
  /** この練習での完走(ループ含む)回数 */
  completions: number
  at?: Date
}

/** 1 回の練習(開始〜終了)の結果を記録へ加算して保存する */
export function recordPractice(
  storage: KeyValueStorage,
  result: PracticeResult,
): Records {
  const records = loadRecords(storage)
  const previous = records[result.scoreId]
  const at = result.at ?? new Date()
  records[result.scoreId] = {
    title: result.title,
    playCount: (previous?.playCount ?? 0) + 1,
    totalPracticeSec:
      (previous?.totalPracticeSec ?? 0) + Math.round(result.practiceSec),
    lastPlayedAt: at.toISOString(),
    completions: (previous?.completions ?? 0) + result.completions,
  }
  writeJson(storage, RECORDS_KEY, records)
  return records
}

/** 最近練習した順の [scoreId, record] リスト */
export function recentRecords(records: Records): [string, ScoreRecord][] {
  return Object.entries(records).sort(([, a], [, b]) =>
    b.lastPlayedAt.localeCompare(a.lastPlayedAt),
  )
}

export function loadSettings(storage: KeyValueStorage): Settings {
  const parsed = readJson<Partial<Settings>>(storage, SETTINGS_KEY)
  if (parsed === null || typeof parsed !== 'object') return DEFAULT_SETTINGS
  return {
    midiDeviceId:
      typeof parsed.midiDeviceId === 'string' ? parsed.midiDeviceId : undefined,
    showNoteNames: parsed.showNoteNames === true,
  }
}

export function saveSettings(
  storage: KeyValueStorage,
  settings: Settings,
): void {
  writeJson(storage, SETTINGS_KEY, settings)
}

/** 曲の同定 ID: fileName + ":" + sha256(content) 先頭16文字(計画書 §8) */
export async function computeScoreId(
  fileName: string,
  content: string,
): Promise<string> {
  const data = new TextEncoder().encode(content)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${fileName}:${hex.slice(0, 16)}`
}

/** MusicXML からタイトルを取り出す(movement-title / work-title、無ければ null) */
export function extractTitle(xml: string): string | null {
  const movement = /<movement-title>([^<]+)<\/movement-title>/.exec(xml)
  if (movement) return movement[1].trim()
  const work = /<work-title>([^<]+)<\/work-title>/.exec(xml)
  if (work) return work[1].trim()
  return null
}
