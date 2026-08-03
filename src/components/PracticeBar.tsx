import type { PracticeSnapshot } from '../core/practice/practiceSession'

type Props = {
  snapshot: PracticeSnapshot | null
  scoreReady: boolean
  elapsedSec: number | null
  loopActive?: boolean
  loopCount?: number
  onStart: () => void
  onStop: () => void
}

/** 練習の開始/中断と、練習中・完走時の状態表示 */
export function PracticeBar({
  snapshot,
  scoreReady,
  elapsedSec,
  loopActive = false,
  loopCount = 0,
  onStart,
  onStop,
}: Props) {
  if (snapshot === null) {
    return (
      <button
        type="button"
        className="self-start rounded bg-accent px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
        disabled={!scoreReady}
        onClick={onStart}
      >
        練習を開始
      </button>
    )
  }

  if (snapshot.status === 'finished') {
    if (loopActive) {
      return (
        <div className="flex items-center gap-4 rounded border border-accent/40 bg-accent/5 px-4 py-2">
          <span className="text-sm text-accent">
            {loopCount + 1} 周目クリア!範囲の先頭に戻ります…
          </span>
          <button
            type="button"
            className="rounded border border-ink/30 px-3 py-1 text-sm hover:bg-ink/5"
            onClick={onStop}
          >
            中断
          </button>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-4 rounded border border-accent/40 bg-accent/5 px-4 py-2">
        <span className="font-serif text-lg text-accent">完走!</span>
        <span className="text-sm text-ink/70">
          所要時間 {elapsedSec !== null ? formatSec(elapsedSec) : '--'} / 誤打{' '}
          {snapshot.missCount} 回
        </span>
        <button
          type="button"
          className="rounded bg-accent px-3 py-1 text-sm text-white hover:opacity-90"
          onClick={onStart}
        >
          もう一度
        </button>
        <button
          type="button"
          className="rounded border border-ink/30 px-3 py-1 text-sm hover:bg-ink/5"
          onClick={onStop}
        >
          終了
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <span className="rounded bg-accent/10 px-2 py-0.5 text-sm text-accent">
        {loopActive ? `ループ練習中(${loopCount + 1} 周目)` : '練習中'}
      </span>
      <span className="text-sm text-ink/60">
        {snapshot.stepIndex} 音進行 / 誤打 {snapshot.missCount} 回
      </span>
      <button
        type="button"
        className="rounded border border-ink/30 px-3 py-1 text-sm hover:bg-ink/5"
        onClick={onStop}
      >
        中断
      </button>
    </div>
  )
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}
