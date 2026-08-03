import { describe, expect, it } from 'vitest'
import type { OsmdNoteLike } from '../src/core/score/expectedNotes'
import { ScoreCursor, type OsmdCursorLike } from '../src/core/score/scoreCursor'

const C4 = 48
const E4 = 52
const G4 = 55
const C3 = 36

function note(halfTone: number, staffId = 1): OsmdNoteLike {
  return {
    isRest: () => false,
    Pitch: {},
    halfTone,
    ParentStaff: { Id: staffId },
  }
}

function rest(): OsmdNoteLike {
  return { isRest: () => true, Pitch: undefined, halfTone: 0 }
}

type Position = { measure: number; notes: OsmdNoteLike[] }

/** 位置の列でカーソルを模したモック(measure は 1 始まり) */
class MockCursor implements OsmdCursorLike {
  private index = 0
  constructor(private positions: Position[]) {}

  Iterator = {
    EndReached: false,
    CurrentMeasureIndex: 0,
  }

  private sync() {
    this.Iterator.EndReached = this.index >= this.positions.length
    this.Iterator.CurrentMeasureIndex = this.Iterator.EndReached
      ? Math.max(0, this.positions.length - 1)
      : this.positions[this.index].measure - 1
  }

  reset() {
    this.index = 0
    this.sync()
  }

  next() {
    if (this.index < this.positions.length) this.index++
    this.sync()
  }

  NotesUnderCursor(): OsmdNoteLike[] {
    return this.positions[this.index]?.notes ?? []
  }
}

const pos = (measure: number, notes: OsmdNoteLike[]): Position => ({
  measure,
  notes,
})

describe('ScoreCursor', () => {
  it('先頭の演奏位置から期待集合を返す', () => {
    const cursor = new MockCursor([pos(1, [note(C4)]), pos(1, [note(E4)])])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    expect(score.resetToFirstPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([60]))
  })

  it('先頭が休符ならスキップして最初の音符に合わせる', () => {
    const cursor = new MockCursor([pos(1, [rest()]), pos(1, [note(C4)])])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    expect(score.resetToFirstPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([60]))
  })

  it('途中の休符位置を自動スキップして進む', () => {
    const cursor = new MockCursor([
      pos(1, [note(C4)]),
      pos(1, [rest()]),
      pos(2, [rest()]),
      pos(2, [note(E4)]),
    ])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    score.resetToFirstPlayable()
    expect(score.advanceToNextPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([64]))
  })

  it('曲末に達したら false を返し endReached になる', () => {
    const cursor = new MockCursor([pos(1, [note(C4)]), pos(1, [rest()])])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    score.resetToFirstPlayable()
    expect(score.advanceToNextPlayable()).toBe(false)
    expect(score.endReached).toBe(true)
    expect(score.currentExpected()).toEqual(new Set())
  })

  it('全休符の譜面では resetToFirstPlayable が false', () => {
    const cursor = new MockCursor([pos(1, [rest()]), pos(1, [rest()])])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    expect(score.resetToFirstPlayable()).toBe(false)
    expect(score.endReached).toBe(true)
  })

  it('staffIds フィルタで対象外だけの位置はスキップされる', () => {
    const cursor = new MockCursor([
      pos(1, [note(C4, 1), note(C3, 2)]),
      pos(1, [note(C3, 2)]),
      pos(2, [note(E4, 1)]),
    ])
    cursor.reset()
    const score = new ScoreCursor(cursor, { staffIds: [1] })
    score.resetToFirstPlayable()
    expect(score.currentExpected()).toEqual(new Set([60]))
    expect(score.advanceToNextPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([64]))
  })

  it('setStaffIds でフィルタを切り替えられる', () => {
    const cursor = new MockCursor([pos(1, [note(C4, 1), note(C3, 2)])])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    score.resetToFirstPlayable()
    expect(score.currentExpected()).toEqual(new Set([60, 48]))
    score.setStaffIds([2])
    expect(score.currentExpected()).toEqual(new Set([48]))
  })

  describe('小節範囲', () => {
    const fourMeasures = () => {
      const cursor = new MockCursor([
        pos(1, [note(C4)]),
        pos(2, [note(E4)]),
        pos(3, [note(G4)]),
        pos(4, [note(C3)]),
      ])
      cursor.reset()
      return cursor
    }

    it('範囲の開始小節から始まる', () => {
      const score = new ScoreCursor(fourMeasures(), {
        measureRange: { start: 2, end: 3 },
      })
      expect(score.resetToFirstPlayable()).toBe(true)
      expect(score.currentExpected()).toEqual(new Set([64]))
    })

    it('範囲の終了小節を越えたら曲末扱いになる', () => {
      const score = new ScoreCursor(fourMeasures(), {
        measureRange: { start: 2, end: 3 },
      })
      score.resetToFirstPlayable()
      expect(score.advanceToNextPlayable()).toBe(true) // 3小節目
      expect(score.currentExpected()).toEqual(new Set([67]))
      expect(score.advanceToNextPlayable()).toBe(false) // 4小節目は範囲外
      expect(score.endReached).toBe(true)
    })

    it('リセットすると範囲の先頭に戻る(ループ練習)', () => {
      const score = new ScoreCursor(fourMeasures(), {
        measureRange: { start: 2, end: 3 },
      })
      score.resetToFirstPlayable()
      score.advanceToNextPlayable()
      score.advanceToNextPlayable() // 範囲末尾を越える
      expect(score.resetToFirstPlayable()).toBe(true)
      expect(score.currentExpected()).toEqual(new Set([64]))
    })

    it('開始小節が休符のみでも次の演奏位置に合わせる', () => {
      const cursor = new MockCursor([
        pos(1, [note(C4)]),
        pos(2, [rest()]),
        pos(3, [note(G4)]),
      ])
      cursor.reset()
      const score = new ScoreCursor(cursor, {
        measureRange: { start: 2, end: 3 },
      })
      expect(score.resetToFirstPlayable()).toBe(true)
      expect(score.currentExpected()).toEqual(new Set([67]))
    })

    it('setMeasureRange で範囲を解除できる', () => {
      const score = new ScoreCursor(fourMeasures(), {
        measureRange: { start: 2, end: 2 },
      })
      score.resetToFirstPlayable()
      expect(score.advanceToNextPlayable()).toBe(false)
      score.setMeasureRange(undefined)
      expect(score.resetToFirstPlayable()).toBe(true)
      expect(score.currentExpected()).toEqual(new Set([60]))
    })
  })
})
