import type { NoteEvent } from './messages'

/** 押下中ノート集合に NoteEvent を適用した新しい集合を返す(元の集合は変更しない) */
export function applyNoteEvent(
  pressed: ReadonlySet<number>,
  event: NoteEvent,
): Set<number> {
  const next = new Set(pressed)
  if (event.kind === 'on') {
    next.add(event.note)
  } else {
    next.delete(event.note)
  }
  return next
}
