import { useRef, useState } from 'react'
import { extractMusicXml, ScoreLoadError } from '../core/score/loader'

export type PickedScore = { fileName: string; xml: string }

type Props = { onLoaded: (score: PickedScore) => void }

/** MusicXML ファイルのドラッグ&ドロップ + ファイル選択 */
export function FilePicker({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    try {
      const xml = await extractMusicXml(file.name, await file.arrayBuffer())
      setError(null)
      onLoaded({ fileName: file.name, xml })
    } catch (e) {
      setError(
        e instanceof ScoreLoadError
          ? e.message
          : 'ファイルの読み込みに失敗しました。',
      )
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="譜面ファイルを開く"
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-accent bg-accent/5' : 'border-ink/30'
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
      >
        <p className="text-ink/80">
          MusicXML ファイルをここにドラッグ&ドロップ
        </p>
        <p className="text-sm text-ink/50">
          またはクリックして選択(.xml / .musicxml / .mxl)
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xml,.musicxml,.mxl"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
