/**
 * 練習モードのステートマシン(計画書 §5.3)。
 *
 * WAITING: 期待ノート集合の充足を待つ。誤打は記録するが進行はブロックしない。
 * ADVANCE: 全充足で次の演奏位置へ(このクラス内では遷移処理として実装)。
 * FINISHED: 曲末に到達。
 *
 * React にも OSMD にも依存しない。カーソルは ExpectedCursor 経由で注入する。
 */

/** ScoreCursor が満たすインターフェース(テストではモックを注入) */
export interface ExpectedCursor {
  resetToFirstPlayable(): boolean
  advanceToNextPlayable(): boolean
  currentExpected(): Set<number>
}

export type PracticeStatus = 'waiting' | 'finished'

export type PracticeSnapshot = {
  status: PracticeStatus
  /** 現在の演奏位置で期待されるノート */
  expected: ReadonlySet<number>
  /** 期待ノートのうち充足済みのもの */
  satisfied: ReadonlySet<number>
  /** 現在押されている誤打ノート */
  wrongPressed: ReadonlySet<number>
  /** 誤打の累計回数 */
  missCount: number
  /** 完了した演奏位置の数 */
  stepIndex: number
}

export class PracticeSession {
  private expected: Set<number> = new Set()
  private satisfied = new Set<number>()
  private wrongPressed = new Set<number>()
  private missCount = 0
  private stepIndex = 0
  private status: PracticeStatus = 'waiting'

  constructor(private cursor: ExpectedCursor) {}

  /** 先頭から練習を開始する。演奏位置が無い譜面は即 FINISHED */
  start(): PracticeSnapshot {
    this.satisfied = new Set()
    this.wrongPressed = new Set()
    this.missCount = 0
    this.stepIndex = 0
    if (this.cursor.resetToFirstPlayable()) {
      this.status = 'waiting'
      this.expected = this.cursor.currentExpected()
    } else {
      this.status = 'finished'
      this.expected = new Set()
    }
    return this.snapshot()
  }

  noteOn(note: number): PracticeSnapshot {
    if (this.status === 'finished') return this.snapshot()

    if (this.expected.has(note)) {
      // 充足済みノートの再打鍵は誤打にしない
      this.satisfied.add(note)
      if (this.satisfied.size >= this.expected.size) this.advance()
    } else {
      this.missCount++
      this.wrongPressed.add(note)
    }
    return this.snapshot()
  }

  noteOff(note: number): PracticeSnapshot {
    this.wrongPressed.delete(note)
    return this.snapshot()
  }

  private advance(): void {
    this.stepIndex++
    this.satisfied = new Set()
    if (this.cursor.advanceToNextPlayable()) {
      this.expected = this.cursor.currentExpected()
    } else {
      this.status = 'finished'
      this.expected = new Set()
    }
  }

  snapshot(): PracticeSnapshot {
    return {
      status: this.status,
      expected: new Set(this.expected),
      satisfied: new Set(this.satisfied),
      wrongPressed: new Set(this.wrongPressed),
      missCount: this.missCount,
      stepIndex: this.stepIndex,
    }
  }
}
