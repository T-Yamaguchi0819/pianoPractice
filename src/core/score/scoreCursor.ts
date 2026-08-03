import { extractExpectedNotes, type OsmdNoteLike } from './expectedNotes'

/** OSMD Cursor のうち進行制御に必要な最小面 */
export interface OsmdCursorLike {
  reset(): void
  next(): void
  NotesUnderCursor(): OsmdNoteLike[]
  Iterator: { EndReached: boolean; CurrentMeasureIndex: number }
}

/** 1 始まり・両端含む小節範囲 */
export type MeasureRange = { start: number; end: number }

export type ScoreCursorOptions = {
  /** 判定対象の譜表 ID(省略時は全譜表) */
  staffIds?: readonly number[]
  /** 練習する小節範囲(省略時は全曲) */
  measureRange?: MeasureRange
}

/**
 * OSMD カーソルを「演奏位置(期待ノート集合が非空の位置)」単位で進めるラッパー。
 * 休符のみの位置や装飾音のみの位置は自動でスキップする(計画書 §5.3)。
 * 小節範囲を指定すると範囲外を曲末と同様に扱う(ループ練習用 §5.3)。
 */
export class ScoreCursor {
  constructor(
    private cursor: OsmdCursorLike,
    private options: ScoreCursorOptions = {},
  ) {}

  setStaffIds(staffIds: readonly number[] | undefined): void {
    this.options = { ...this.options, staffIds }
  }

  setMeasureRange(measureRange: MeasureRange | undefined): void {
    this.options = { ...this.options, measureRange }
  }

  /** 範囲末尾を越えたかどうか(範囲指定時のみ) */
  private pastRangeEnd(): boolean {
    const range = this.options.measureRange
    return (
      range !== undefined &&
      this.cursor.Iterator.CurrentMeasureIndex > range.end - 1
    )
  }

  get endReached(): boolean {
    return this.cursor.Iterator.EndReached || this.pastRangeEnd()
  }

  /** 現在位置の期待ノート集合。休符のみの位置や曲末・範囲外では空集合 */
  currentExpected(): Set<number> {
    if (this.endReached) return new Set()
    return extractExpectedNotes(
      this.cursor.NotesUnderCursor(),
      this.options.staffIds,
    )
  }

  /**
   * 次の演奏位置まで進める。見つかれば true、曲末(または範囲末尾)なら false。
   */
  advanceToNextPlayable(): boolean {
    while (!this.cursor.Iterator.EndReached) {
      this.cursor.next()
      if (this.endReached) break
      if (this.currentExpected().size > 0) return true
    }
    return false
  }

  /**
   * 先頭(範囲指定時は範囲の開始小節)に戻し、最初の演奏位置に合わせる。
   * 演奏位置が 1 つも無い場合は false。
   */
  resetToFirstPlayable(): boolean {
    this.cursor.reset()
    const range = this.options.measureRange
    if (range !== undefined) {
      while (
        !this.cursor.Iterator.EndReached &&
        this.cursor.Iterator.CurrentMeasureIndex < range.start - 1
      ) {
        this.cursor.next()
      }
    }
    if (this.endReached) return false
    if (this.currentExpected().size > 0) return true
    return this.advanceToNextPlayable()
  }
}
