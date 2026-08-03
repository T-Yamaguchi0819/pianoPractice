import { describe, expect, it } from 'vitest'
import {
  computeScoreId,
  extractTitle,
  loadRecords,
  loadSettings,
  recentRecords,
  recordPractice,
  saveSettings,
  type KeyValueStorage,
} from '../src/core/storage/records'

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>()
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
}

describe('records', () => {
  it('空のストレージからは空の記録を返す', () => {
    expect(loadRecords(new MemoryStorage())).toEqual({})
  })

  it('壊れた JSON は空の記録として扱う', () => {
    const storage = new MemoryStorage()
    storage.setItem('ppa:v1:records', '{broken')
    expect(loadRecords(storage)).toEqual({})
  })

  it('練習結果を加算して保存する', () => {
    const storage = new MemoryStorage()
    recordPractice(storage, {
      scoreId: 'a.xml:0123456789abcdef',
      title: 'きらきら星',
      practiceSec: 60.4,
      completions: 1,
      at: new Date('2026-08-03T10:00:00Z'),
    })
    const records = recordPractice(storage, {
      scoreId: 'a.xml:0123456789abcdef',
      title: 'きらきら星',
      practiceSec: 30,
      completions: 2,
      at: new Date('2026-08-03T11:00:00Z'),
    })
    expect(records['a.xml:0123456789abcdef']).toEqual({
      title: 'きらきら星',
      playCount: 2,
      totalPracticeSec: 90,
      lastPlayedAt: '2026-08-03T11:00:00.000Z',
      completions: 3,
    })
    // 再読み込みでも残る
    expect(loadRecords(storage)['a.xml:0123456789abcdef'].playCount).toBe(2)
  })

  it('recentRecords は最終練習日の新しい順', () => {
    const storage = new MemoryStorage()
    recordPractice(storage, {
      scoreId: 'old',
      title: '古い曲',
      practiceSec: 10,
      completions: 0,
      at: new Date('2026-08-01T00:00:00Z'),
    })
    recordPractice(storage, {
      scoreId: 'new',
      title: '新しい曲',
      practiceSec: 10,
      completions: 0,
      at: new Date('2026-08-02T00:00:00Z'),
    })
    expect(recentRecords(loadRecords(storage)).map(([id]) => id)).toEqual([
      'new',
      'old',
    ])
  })
})

describe('settings', () => {
  it('未保存ならデフォルト設定', () => {
    expect(loadSettings(new MemoryStorage())).toEqual({
      midiDeviceId: undefined,
      showNoteNames: false,
    })
  })

  it('保存した設定を読み戻せる', () => {
    const storage = new MemoryStorage()
    saveSettings(storage, { midiDeviceId: 'dev-1', showNoteNames: true })
    expect(loadSettings(storage)).toEqual({
      midiDeviceId: 'dev-1',
      showNoteNames: true,
    })
  })
})

describe('computeScoreId', () => {
  it('同じ内容なら同じ ID、異なる内容なら異なる ID', async () => {
    const a1 = await computeScoreId('a.xml', '<score/>')
    const a2 = await computeScoreId('a.xml', '<score/>')
    const b = await computeScoreId('a.xml', '<score>x</score>')
    expect(a1).toBe(a2)
    expect(a1).not.toBe(b)
    expect(a1).toMatch(/^a\.xml:[0-9a-f]{16}$/)
  })
})

describe('extractTitle', () => {
  it('movement-title を優先して取り出す', () => {
    const xml =
      '<work><work-title>作品名</work-title></work><movement-title>楽章名</movement-title>'
    expect(extractTitle(xml)).toBe('楽章名')
  })

  it('movement-title が無ければ work-title', () => {
    expect(extractTitle('<work-title>作品名</work-title>')).toBe('作品名')
  })

  it('どちらも無ければ null', () => {
    expect(extractTitle('<score-partwise/>')).toBeNull()
  })
})
