export type HandSelection = 'both' | 'right' | 'left'

type Props = {
  hand: HandSelection
  onHandChange: (hand: HandSelection) => void
  measureCount: number | null
  rangeStart: string
  rangeEnd: string
  onRangeChange: (start: string, end: string) => void
  rangeError: string | null
  disabled?: boolean
}

const HAND_LABELS: { value: HandSelection; label: string }[] = [
  { value: 'both', label: '両手' },
  { value: 'right', label: '右手のみ' },
  { value: 'left', label: '左手のみ' },
]

/** パート選択と小節範囲ループの設定(計画書 §5.2 / §5.3) */
export function ControlBar({
  hand,
  onHandChange,
  measureCount,
  rangeStart,
  rangeEnd,
  onRangeChange,
  rangeError,
  disabled = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <fieldset
        className="flex items-center gap-3"
        disabled={disabled}
        aria-label="パート選択"
      >
        {HAND_LABELS.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-1 text-ink/80">
            <input
              type="radio"
              name="hand"
              value={value}
              checked={hand === value}
              onChange={() => onHandChange(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="flex items-center gap-1 text-ink/80">
        <span>ループ小節:</span>
        <input
          type="number"
          min={1}
          max={measureCount ?? undefined}
          value={rangeStart}
          placeholder="開始"
          disabled={disabled}
          className="w-16 rounded border border-ink/30 bg-white px-2 py-0.5"
          aria-label="ループ開始小節"
          onChange={(e) => onRangeChange(e.target.value, rangeEnd)}
        />
        <span>〜</span>
        <input
          type="number"
          min={1}
          max={measureCount ?? undefined}
          value={rangeEnd}
          placeholder="終了"
          disabled={disabled}
          className="w-16 rounded border border-ink/30 bg-white px-2 py-0.5"
          aria-label="ループ終了小節"
          onChange={(e) => onRangeChange(rangeStart, e.target.value)}
        />
        {measureCount !== null && (
          <span className="text-ink/50">/ 全 {measureCount} 小節</span>
        )}
        {(rangeStart !== '' || rangeEnd !== '') && (
          <button
            type="button"
            className="ml-1 text-accent underline-offset-2 hover:underline disabled:opacity-40"
            disabled={disabled}
            onClick={() => onRangeChange('', '')}
          >
            解除
          </button>
        )}
      </div>
      {rangeError && <span className="text-red-700">{rangeError}</span>}
    </div>
  )
}
