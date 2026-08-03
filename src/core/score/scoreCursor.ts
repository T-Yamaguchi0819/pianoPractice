import { extractExpectedNotes, type OsmdNoteLike } from './expectedNotes'

/** OSMD Cursor のうち進行制御に必要な最小面 */
export interface OsmdCursorLike {
  reset(): void
  next(): void
  NotesUnderCursor(): OsmdNoteLike[]
  Iterator: { EndReached: boolean }
}

export type ScoreCursorOptions = {
  /** 判定対象の譜表 ID(省略時は全譜表) */
  staffIds?: readonly number[]
}

/**
 * OSMD カーソルを「演奏位置(期待ノート集合が非空の位置)」単位で進めるラッパー。
 * 休符のみの位置や装飾音のみの位置は自動でスキップする(計画書 §5.3)。
 */
export class ScoreCursor {
  constructor(
    private cursor: OsmdCursorLike,
    private options: ScoreCursorOptions = {},
  ) {}

  setStaffIds(staffIds: readonly number[] | undefined): void {
    this.options = { ...this.options, staffIds }
  }

  get endReached(): boolean {
    return this.cursor.Iterator.EndReached
  }

  /** 現在位置の期待ノート集合。休符のみの位置や曲末では空集合 */
  currentExpected(): Set<number> {
    if (this.endReached) return new Set()
    return extractExpectedNotes(
      this.cursor.NotesUnderCursor(),
      this.options.staffIds,
    )
  }

  /**
   * 次の演奏位置まで進める。見つかれば true、曲末に達したら false。
   */
  advanceToNextPlayable(): boolean {
    while (!this.endReached) {
      this.cursor.next()
      if (this.endReached) break
      if (this.currentExpected().size > 0) return true
    }
    return false
  }

  /**
   * 先頭に戻し、最初の演奏位置に合わせる。
   * 演奏位置が 1 つも無い(全休符など)場合は false。
   */
  resetToFirstPlayable(): boolean {
    this.cursor.reset()
    if (this.endReached) return false
    if (this.currentExpected().size > 0) return true
    return this.advanceToNextPlayable()
  }
}
