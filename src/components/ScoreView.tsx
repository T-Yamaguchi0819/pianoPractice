import { useEffect, useRef, useState } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'

type Props = { xml: string }

/**
 * OSMD による譜面描画とカーソル制御。
 * Phase 2 では手動ボタンでカーソルを音符単位に進める(練習モード結合は Phase 4)。
 */
export function ScoreView({ xml }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const osmd = new OpenSheetMusicDisplay(container, {
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
    })
    osmd
      .load(xml)
      .then(() => {
        if (cancelled) return
        osmd.render()
        osmd.cursor.show()
        osmdRef.current = osmd
        setReady(true)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const detail = e instanceof Error ? e.message : String(e)
        setError(
          `譜面を読み込めませんでした。MusicXML として解釈できない内容です。(${detail})`,
        )
      })
    return () => {
      cancelled = true
      osmdRef.current = null
      setReady(false)
      container.innerHTML = ''
    }
  }, [xml])

  const cursor = () => osmdRef.current?.cursor

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 self-end">
        <button
          type="button"
          className="rounded border border-ink/30 px-3 py-1 text-sm hover:bg-ink/5 disabled:opacity-40"
          disabled={!ready}
          onClick={() => cursor()?.reset()}
        >
          先頭へ
        </button>
        <button
          type="button"
          className="rounded border border-ink/30 px-3 py-1 text-sm hover:bg-ink/5 disabled:opacity-40"
          disabled={!ready}
          onClick={() => cursor()?.previous()}
        >
          ← 戻る
        </button>
        <button
          type="button"
          className="rounded bg-accent px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-40"
          disabled={!ready}
          onClick={() => cursor()?.next()}
        >
          進む →
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div
        ref={containerRef}
        className="min-h-40 overflow-y-auto bg-white/60"
      />
    </div>
  )
}
