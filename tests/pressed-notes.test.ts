import { describe, expect, it } from 'vitest'
import { applyNoteEvent } from '../src/core/midi/pressedNotes'

describe('applyNoteEvent', () => {
  it('NoteOn でノートを追加する', () => {
    const next = applyNoteEvent(new Set(), {
      kind: 'on',
      note: 60,
      velocity: 100,
    })
    expect([...next]).toEqual([60])
  })

  it('NoteOff でノートを削除する', () => {
    const next = applyNoteEvent(new Set([60, 64]), {
      kind: 'off',
      note: 60,
      velocity: 0,
    })
    expect([...next]).toEqual([64])
  })

  it('押していないノートの NoteOff は何もしない', () => {
    const next = applyNoteEvent(new Set([60]), {
      kind: 'off',
      note: 72,
      velocity: 0,
    })
    expect([...next]).toEqual([60])
  })

  it('元の集合を変更しない', () => {
    const original = new Set([60])
    applyNoteEvent(original, { kind: 'on', note: 64, velocity: 1 })
    expect([...original]).toEqual([60])
  })
})
