import { describe, expect, it } from 'vitest'
import type { OsmdNoteLike } from '../src/core/score/expectedNotes'
import { ScoreCursor, type OsmdCursorLike } from '../src/core/score/scoreCursor'

const C4 = 48
const E4 = 52
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

/** 位置の列でカーソルを模したモック */
class MockCursor implements OsmdCursorLike {
  private index = 0
  constructor(private positions: OsmdNoteLike[][]) {}

  Iterator = {
    EndReached: false,
  }

  reset() {
    this.index = 0
    this.Iterator.EndReached = this.positions.length === 0
  }

  next() {
    if (this.index < this.positions.length) this.index++
    this.Iterator.EndReached = this.index >= this.positions.length
  }

  NotesUnderCursor(): OsmdNoteLike[] {
    return this.positions[this.index] ?? []
  }
}

describe('ScoreCursor', () => {
  it('先頭の演奏位置から期待集合を返す', () => {
    const cursor = new MockCursor([[note(C4)], [note(E4)]])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    expect(score.resetToFirstPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([60]))
  })

  it('先頭が休符ならスキップして最初の音符に合わせる', () => {
    const cursor = new MockCursor([[rest()], [note(C4)]])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    expect(score.resetToFirstPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([60]))
  })

  it('途中の休符位置を自動スキップして進む', () => {
    const cursor = new MockCursor([[note(C4)], [rest()], [rest()], [note(E4)]])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    score.resetToFirstPlayable()
    expect(score.advanceToNextPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([64]))
  })

  it('曲末に達したら false を返し endReached になる', () => {
    const cursor = new MockCursor([[note(C4)], [rest()]])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    score.resetToFirstPlayable()
    expect(score.advanceToNextPlayable()).toBe(false)
    expect(score.endReached).toBe(true)
    expect(score.currentExpected()).toEqual(new Set())
  })

  it('全休符の譜面では resetToFirstPlayable が false', () => {
    const cursor = new MockCursor([[rest()], [rest()]])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    expect(score.resetToFirstPlayable()).toBe(false)
    expect(score.endReached).toBe(true)
  })

  it('staffIds フィルタで対象外だけの位置はスキップされる', () => {
    // 位置1: 右手C4+左手C3 / 位置2: 左手のみ / 位置3: 右手E4
    const cursor = new MockCursor([
      [note(C4, 1), note(C3, 2)],
      [note(C3, 2)],
      [note(E4, 1)],
    ])
    cursor.reset()
    const score = new ScoreCursor(cursor, { staffIds: [1] })
    score.resetToFirstPlayable()
    expect(score.currentExpected()).toEqual(new Set([60]))
    expect(score.advanceToNextPlayable()).toBe(true)
    expect(score.currentExpected()).toEqual(new Set([64]))
  })

  it('setStaffIds でフィルタを切り替えられる', () => {
    const cursor = new MockCursor([[note(C4, 1), note(C3, 2)]])
    cursor.reset()
    const score = new ScoreCursor(cursor)
    score.resetToFirstPlayable()
    expect(score.currentExpected()).toEqual(new Set([60, 48]))
    score.setStaffIds([2])
    expect(score.currentExpected()).toEqual(new Set([48]))
  })
})
