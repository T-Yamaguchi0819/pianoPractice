import { noteNumberToName } from '../core/midi/messages'

const LOWEST_NOTE = 21 // A0
const HIGHEST_NOTE = 108 // C8
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

type KeyDef = { note: number; whiteIndex: number }

const whiteKeys: KeyDef[] = []
const blackKeys: KeyDef[] = []
{
  let whiteIndex = 0
  for (let note = LOWEST_NOTE; note <= HIGHEST_NOTE; note++) {
    if (BLACK_PITCH_CLASSES.has(note % 12)) {
      // 直後の白鍵の境界(whiteIndex)にまたがる位置に描画する
      blackKeys.push({ note, whiteIndex })
    } else {
      whiteKeys.push({ note, whiteIndex })
      whiteIndex++
    }
  }
}
const WHITE_COUNT = whiteKeys.length // 52
const WHITE_WIDTH_PCT = 100 / WHITE_COUNT
const BLACK_WIDTH_PCT = WHITE_WIDTH_PCT * 0.6

function whiteKeyColor(
  note: number,
  pressed: ReadonlySet<number>,
  highlights?: ReadonlyMap<number, KeyHighlight>,
): string {
  const highlight = highlights?.get(note)
  if (highlight) return WHITE_HIGHLIGHT[highlight]
  return pressed.has(note) ? 'bg-neutral-300' : 'bg-white'
}

function blackKeyColor(
  note: number,
  pressed: ReadonlySet<number>,
  highlights?: ReadonlyMap<number, KeyHighlight>,
): string {
  const highlight = highlights?.get(note)
  if (highlight) return BLACK_HIGHLIGHT[highlight]
  return pressed.has(note) ? 'bg-neutral-500' : 'bg-ink'
}

/** 練習モードでの鍵の状態(計画書 §5.4: 期待=青、正打=緑、誤打=赤) */
export type KeyHighlight = 'expected' | 'correct' | 'wrong'

const WHITE_HIGHLIGHT: Record<KeyHighlight, string> = {
  expected: 'bg-sky-300',
  correct: 'bg-emerald-300',
  wrong: 'bg-red-300',
}
const BLACK_HIGHLIGHT: Record<KeyHighlight, string> = {
  expected: 'bg-sky-600',
  correct: 'bg-emerald-600',
  wrong: 'bg-red-600',
}

type Props = {
  pressed: ReadonlySet<number>
  highlights?: ReadonlyMap<number, KeyHighlight>
  showNoteNames?: boolean
  /** クリック/タッチによるデバッグ入力(計画書 §13)。省略時は表示専用 */
  onNoteOn?: (note: number) => void
  onNoteOff?: (note: number) => void
}

/** 88鍵のバーチャル鍵盤。押下中の鍵をハイライトし、クリックでも発音イベントを出す */
export function VirtualKeyboard({
  pressed,
  highlights,
  showNoteNames = false,
  onNoteOn,
  onNoteOff,
}: Props) {
  const interactive = onNoteOn !== undefined

  const pointerHandlers = (note: number) =>
    interactive
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            e.preventDefault()
            onNoteOn?.(note)
          },
          onPointerUp: () => onNoteOff?.(note),
          onPointerLeave: () => {
            if (pressed.has(note)) onNoteOff?.(note)
          },
        }
      : {}

  return (
    <div
      className="relative flex h-32 w-full touch-none select-none sm:h-40"
      role="group"
      aria-label="バーチャル鍵盤"
    >
      {whiteKeys.map(({ note }) => (
        <button
          key={note}
          type="button"
          aria-label={noteNumberToName(note)}
          className={`flex flex-1 items-end justify-center rounded-b-sm border border-ink/25 pb-1 ${whiteKeyColor(
            note,
            pressed,
            highlights,
          )}`}
          {...pointerHandlers(note)}
        >
          {showNoteNames && (
            <span className="pointer-events-none text-[0.5rem] leading-none text-ink/50">
              {noteNumberToName(note)}
            </span>
          )}
        </button>
      ))}
      {blackKeys.map(({ note, whiteIndex }) => (
        <button
          key={note}
          type="button"
          aria-label={noteNumberToName(note)}
          className={`absolute top-0 z-10 h-[62%] rounded-b-sm border border-ink/40 ${blackKeyColor(
            note,
            pressed,
            highlights,
          )}`}
          style={{
            left: `${whiteIndex * WHITE_WIDTH_PCT - BLACK_WIDTH_PCT / 2}%`,
            width: `${BLACK_WIDTH_PCT}%`,
          }}
          {...pointerHandlers(note)}
        />
      ))}
    </div>
  )
}
