import { describe, expect, it } from 'vitest'
import {
  extractExpectedNotes,
  midiFromHalfTone,
  type OsmdNoteLike,
} from '../src/core/score/expectedNotes'

// halfTone は C0 基準。C4(MIDI 60)= 48
const C4 = 48
const E4 = 52
const G4 = 55
const C3 = 36

type NoteOptions = {
  rest?: boolean
  staffId?: number
  grace?: boolean
  tieStart?: boolean
  tieContinuation?: boolean
}

function makeNote(halfTone: number, options: NoteOptions = {}): OsmdNoteLike {
  const note: OsmdNoteLike = {
    isRest: () => options.rest ?? false,
    Pitch: options.rest ? undefined : {},
    halfTone,
    ParentStaff: { Id: options.staffId ?? 1 },
  }
  if (options.grace) note.ParentVoiceEntry = { IsGrace: true }
  if (options.tieStart) note.NoteTie = { StartNote: note }
  if (options.tieContinuation) note.NoteTie = { StartNote: {} }
  return note
}

describe('midiFromHalfTone', () => {
  it('halfTone 48 = C4 = MIDI 60', () => {
    expect(midiFromHalfTone(48)).toBe(60)
  })
})

describe('extractExpectedNotes', () => {
  it('単音', () => {
    expect(extractExpectedNotes([makeNote(C4)])).toEqual(new Set([60]))
  })

  it('和音は全構成音を含む', () => {
    const notes = [makeNote(C4), makeNote(E4), makeNote(G4)]
    expect(extractExpectedNotes(notes)).toEqual(new Set([60, 64, 67]))
  })

  it('両手同時(譜表 1 と 2)は両方含む', () => {
    const notes = [makeNote(C4, { staffId: 1 }), makeNote(C3, { staffId: 2 })]
    expect(extractExpectedNotes(notes)).toEqual(new Set([60, 48]))
  })

  it('staffIds を指定すると対象譜表のみ含む(右手のみ練習)', () => {
    const notes = [makeNote(C4, { staffId: 1 }), makeNote(C3, { staffId: 2 })]
    expect(extractExpectedNotes(notes, [1])).toEqual(new Set([60]))
  })

  it('休符は含まない', () => {
    const notes = [makeNote(C4), makeNote(0, { rest: true })]
    expect(extractExpectedNotes(notes)).toEqual(new Set([60]))
  })

  it('休符のみなら空集合', () => {
    expect(extractExpectedNotes([makeNote(0, { rest: true })])).toEqual(
      new Set(),
    )
  })

  it('タイの開始音は含み、後続音は含まない', () => {
    const start = makeNote(C4, { tieStart: true })
    const continuation = makeNote(E4, { tieContinuation: true })
    expect(extractExpectedNotes([start, continuation])).toEqual(new Set([60]))
  })

  it('装飾音(grace note)は含まない', () => {
    const notes = [makeNote(C4), makeNote(E4, { grace: true })]
    expect(extractExpectedNotes(notes)).toEqual(new Set([60]))
  })

  it('同じ MIDI 番号の異名同音は 1 つにまとまる', () => {
    // C#4 と Db4 はどちらも halfTone 49
    expect(extractExpectedNotes([makeNote(49), makeNote(49)])).toEqual(
      new Set([61]),
    )
  })
})
