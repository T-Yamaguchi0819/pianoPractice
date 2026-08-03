import { describe, expect, it } from 'vitest'
import {
  PracticeSession,
  type ExpectedCursor,
} from '../src/core/practice/practiceSession'

/** 期待集合の列でカーソルを模したモック */
class MockCursor implements ExpectedCursor {
  private index = 0
  constructor(private steps: number[][]) {}

  resetToFirstPlayable(): boolean {
    this.index = 0
    return this.steps.length > 0
  }

  advanceToNextPlayable(): boolean {
    this.index++
    return this.index < this.steps.length
  }

  currentExpected(): Set<number> {
    return new Set(this.steps[this.index] ?? [])
  }
}

describe('PracticeSession', () => {
  it('単音を正しく押すと次の位置へ進む', () => {
    const session = new PracticeSession(new MockCursor([[60], [64]]))
    session.start()
    const snap = session.noteOn(60)
    expect(snap.status).toBe('waiting')
    expect(snap.stepIndex).toBe(1)
    expect([...snap.expected]).toEqual([64])
    expect(snap.satisfied.size).toBe(0)
  })

  it('和音は全構成音が揃うまで待機し、順番にゆっくり押しても進む', () => {
    const session = new PracticeSession(new MockCursor([[60, 64, 67], [72]]))
    session.start()

    let snap = session.noteOn(60)
    expect(snap.status).toBe('waiting')
    expect(snap.stepIndex).toBe(0)
    expect([...snap.satisfied]).toEqual([60])

    // ゆっくり押す: 60 を離しても充足済みは維持される
    snap = session.noteOff(60)
    expect([...snap.satisfied]).toEqual([60])

    snap = session.noteOn(64)
    expect(snap.stepIndex).toBe(0)

    snap = session.noteOn(67)
    expect(snap.stepIndex).toBe(1)
    expect([...snap.expected]).toEqual([72])
  })

  it('誤打はカウントするが進行をブロックせず、充足済みも維持する', () => {
    const session = new PracticeSession(new MockCursor([[60, 64], [72]]))
    session.start()

    session.noteOn(60)
    let snap = session.noteOn(61) // 誤打
    expect(snap.missCount).toBe(1)
    expect([...snap.wrongPressed]).toEqual([61])
    expect([...snap.satisfied]).toEqual([60]) // 充足済み維持
    expect(snap.status).toBe('waiting')

    snap = session.noteOff(61)
    expect(snap.wrongPressed.size).toBe(0)
    expect(snap.missCount).toBe(1) // 累計は残る

    snap = session.noteOn(64) // 残りを充足
    expect(snap.stepIndex).toBe(1)
  })

  it('充足済みノートの再打鍵は誤打にならない', () => {
    const session = new PracticeSession(new MockCursor([[60, 64]]))
    session.start()
    session.noteOn(60)
    session.noteOff(60)
    const snap = session.noteOn(60) // 同じ音をもう一度
    expect(snap.missCount).toBe(0)
    expect(snap.stepIndex).toBe(0)
  })

  it('最後の位置を弾き終えると FINISHED になる', () => {
    const session = new PracticeSession(new MockCursor([[60], [64]]))
    session.start()
    session.noteOn(60)
    const snap = session.noteOn(64)
    expect(snap.status).toBe('finished')
    expect(snap.stepIndex).toBe(2)
    expect(snap.expected.size).toBe(0)
  })

  it('FINISHED 後の打鍵は無視される', () => {
    const session = new PracticeSession(new MockCursor([[60]]))
    session.start()
    session.noteOn(60)
    const snap = session.noteOn(99)
    expect(snap.missCount).toBe(0)
    expect(snap.status).toBe('finished')
  })

  it('同音連打は位置ごとに新しい打鍵が必要', () => {
    const session = new PracticeSession(new MockCursor([[60], [60], [60]]))
    session.start()
    let snap = session.noteOn(60)
    expect(snap.stepIndex).toBe(1)
    // 押しっぱなしでは進まない(noteOn イベントが来ない限り充足しない)
    expect(snap.satisfied.size).toBe(0)
    session.noteOff(60)
    snap = session.noteOn(60)
    expect(snap.stepIndex).toBe(2)
    session.noteOff(60)
    snap = session.noteOn(60)
    expect(snap.status).toBe('finished')
    expect(snap.stepIndex).toBe(3)
  })

  it('演奏位置の無い譜面は開始直後に FINISHED', () => {
    const session = new PracticeSession(new MockCursor([]))
    const snap = session.start()
    expect(snap.status).toBe('finished')
    expect(snap.stepIndex).toBe(0)
  })

  it('start() で再スタートすると状態がリセットされる', () => {
    const session = new PracticeSession(new MockCursor([[60], [64]]))
    session.start()
    session.noteOn(61) // 誤打
    session.noteOn(60)
    const snap = session.start()
    expect(snap.status).toBe('waiting')
    expect(snap.missCount).toBe(0)
    expect(snap.stepIndex).toBe(0)
    expect([...snap.expected]).toEqual([60])
  })
})
