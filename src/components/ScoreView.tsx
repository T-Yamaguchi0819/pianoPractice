import { useEffect, useRef, useState } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'

const INK_COLOR = '#000000'
const DIM_COLOR = '#c0b9ad'

/**
 * 判定対象外の譜表の音符を薄い色にする(計画書 §5.2)。
 * dimStaffId が null なら全音符を通常色に戻す。呼び出し後に再描画が必要。
 */
function applyStaffDim(
  osmd: OpenSheetMusicDisplay,
  dimStaffId: number | null,
): void {
  for (const measure of osmd.Sheet.SourceMeasures) {
    for (const container of measure.VerticalSourceStaffEntryContainers) {
      for (const staffEntry of container.StaffEntries) {
        if (!staffEntry) continue
        const dim =
          dimStaffId !== null && staffEntry.ParentStaff.Id === dimStaffId
        for (const voiceEntry of staffEntry.VoiceEntries) {
          voiceEntry.StemColor = dim ? DIM_COLOR : INK_COLOR
          for (const note of voiceEntry.Notes) {
            note.NoteheadColor = dim ? DIM_COLOR : INK_COLOR
          }
        }
      }
    }
  }
}

type Props = {
  xml: string
  /** 譜面の描画完了時に OSMD インスタンスを渡す(練習モードのカーソル制御用) */
  onReady?: (osmd: OpenSheetMusicDisplay) => void
  onUnload?: () => void
  /** 手動カーソル操作の表示(練習中は非表示にする) */
  showManualControls?: boolean
  /** 薄く描画する譜表 ID(パート選択で判定対象外の側)。null で全て通常表示 */
  dimmedStaffId?: number | null
}

/** OSMD による譜面描画とカーソル制御 */
export function ScoreView({
  xml,
  onReady,
  onUnload,
  showManualControls = true,
  dimmedStaffId = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onReadyRef = useRef(onReady)
  const onUnloadRef = useRef(onUnload)
  onReadyRef.current = onReady
  onUnloadRef.current = onUnload

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const osmd = new OpenSheetMusicDisplay(container, {
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
      followCursor: true,
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
        onReadyRef.current?.(osmd)
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
      onUnloadRef.current?.()
      container.innerHTML = ''
    }
  }, [xml])

  // パート選択に応じて判定対象外の譜表を薄く描画(再描画を伴う)
  useEffect(() => {
    const osmd = osmdRef.current
    if (!ready || osmd === null) return
    applyStaffDim(osmd, dimmedStaffId)
    osmd.render()
    osmd.cursor.show()
  }, [ready, dimmedStaffId])

  const cursor = () => osmdRef.current?.cursor

  return (
    <div className="flex flex-col gap-2">
      {showManualControls && (
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
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div
        ref={containerRef}
        className="min-h-40 overflow-y-auto bg-white/60"
      />
    </div>
  )
}
