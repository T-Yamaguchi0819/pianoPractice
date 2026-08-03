import { useState } from 'react'
import { FilePicker, type PickedScore } from './components/FilePicker'
import { MidiPanel } from './components/MidiPanel'
import { NoteLog } from './components/NoteLog'
import { ScoreView } from './components/ScoreView'
import { VirtualKeyboard } from './components/VirtualKeyboard'
import { useMidi } from './hooks/useMidi'
import { SAMPLES, type SampleMeta } from './samples'

function App() {
  const {
    status,
    devices,
    selectedId,
    setSelectedId,
    pressed,
    log,
    emitDebugNote,
  } = useMidi()
  const [showNoteNames, setShowNoteNames] = useState(false)
  const [score, setScore] = useState<PickedScore | null>(null)
  const [sampleError, setSampleError] = useState<string | null>(null)

  const loadSample = async (sample: SampleMeta) => {
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}samples/${sample.file}`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setScore({ fileName: sample.file, xml: await res.text() })
      setSampleError(null)
    } catch {
      setSampleError('サンプル曲を読み込めませんでした。')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
        <h1 className="font-serif text-2xl">ピアノ練習</h1>
        <MidiPanel
          status={status}
          devices={devices}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-6 pb-4">
        {score === null ? (
          <>
            <FilePicker onLoaded={setScore} />
            <section>
              <h2 className="mb-2 text-sm font-bold text-ink/70">
                サンプル曲(パブリックドメイン)
              </h2>
              <ul className="flex flex-wrap gap-2">
                {SAMPLES.map((sample) => (
                  <li key={sample.file}>
                    <button
                      type="button"
                      className="rounded border border-ink/30 px-3 py-1.5 text-sm hover:bg-ink/5"
                      onClick={() => void loadSample(sample)}
                    >
                      {sample.title}
                      <span className="ml-1 text-xs text-ink/50">
                        {sample.composer}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {sampleError && (
                <p className="mt-2 text-sm text-red-700">{sampleError}</p>
              )}
            </section>
            <section>
              <h2 className="mb-2 text-sm font-bold text-ink/70">入力ログ</h2>
              <NoteLog entries={log} />
            </section>
          </>
        ) : (
          <>
            <button
              type="button"
              className="self-start text-sm text-accent underline-offset-2 hover:underline"
              onClick={() => setScore(null)}
            >
              ← 別の曲を開く
            </button>
            <ScoreView xml={score.xml} />
          </>
        )}

        <label className="flex items-center gap-2 self-end text-sm text-ink/70">
          <input
            type="checkbox"
            checked={showNoteNames}
            onChange={(e) => setShowNoteNames(e.target.checked)}
          />
          音名を表示
        </label>
      </main>

      <footer className="px-2 pb-2">
        <VirtualKeyboard
          pressed={pressed}
          showNoteNames={showNoteNames}
          onNoteOn={(note) => emitDebugNote('on', note)}
          onNoteOff={(note) => emitDebugNote('off', note)}
        />
      </footer>
    </div>
  )
}

export default App
