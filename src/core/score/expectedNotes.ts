/**
 * OSMD のカーソル下ノートから「期待ノート集合(MIDI 番号の Set)」を抽出する。
 *
 * OSMD の Note / Cursor への依存はこのファイルと scoreCursor.ts に隔離し、
 * 構造的型(*Like)経由で扱うことでモック注入テストを可能にする(計画書 §7.1)。
 */

/** OSMD Note のうち抽出に必要な最小面 */
export interface OsmdNoteLike {
  isRest(): boolean
  /** ピッチを持たない音(休符以外にもあり得る)は undefined */
  Pitch?: unknown
  /** C0 からの半音数。MIDI 番号 = halfTone + 12 */
  halfTone: number
  /** タイ。StartNote が自分自身でなければタイの後続音 */
  NoteTie?: { StartNote: unknown }
  ParentVoiceEntry?: { IsGrace?: boolean }
  /** 譜表 ID(大譜表なら 1=右手, 2=左手)。パート選択のフィルタに使う */
  ParentStaff?: { Id: number }
}

/** OSMD の halfTone 値 → MIDI ノート番号 */
export function midiFromHalfTone(halfTone: number): number {
  return halfTone + 12
}

/**
 * カーソル位置の全ノートから期待ノート集合を作る。
 * - 休符・装飾音(grace)・タイの後続音は除外(計画書 §5.3)
 * - staffIds を渡すと対象譜表のノートだけを含める(右手のみ/左手のみ練習用)
 */
export function extractExpectedNotes(
  notes: readonly OsmdNoteLike[],
  staffIds?: readonly number[],
): Set<number> {
  const expected = new Set<number>()
  for (const note of notes) {
    if (note.isRest()) continue
    if (note.ParentVoiceEntry?.IsGrace) continue
    if (note.NoteTie && note.NoteTie.StartNote !== note) continue
    if (
      staffIds !== undefined &&
      note.ParentStaff !== undefined &&
      !staffIds.includes(note.ParentStaff.Id)
    ) {
      continue
    }
    if (note.Pitch === undefined || note.Pitch === null) continue
    expected.add(midiFromHalfTone(note.halfTone))
  }
  return expected
}
