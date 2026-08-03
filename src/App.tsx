import { useCallback, useEffect, useRef, useState } from 'react'
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { FilePicker, type PickedScore } from './components/FilePicker'
import { MidiPanel } from './components/MidiPanel'
import { NoteLog } from './components/NoteLog'
import { PracticeBar } from './components/PracticeBar'
import { ScoreView } from './components/ScoreView'
import {
  VirtualKeyboard,
  type KeyHighlight,
} from './components/VirtualKeyboard'
import {
  PracticeSession,
  type PracticeSnapshot,
} from './core/practice/practiceSession'
import { ScoreCursor, type OsmdCursorLike } from './core/score/scoreCursor'
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
    subscribeNote,
  } = useMidi()
  const [showNoteNames, setShowNoteNames] = useState(false)
  const [score, setScore] = useState<PickedScore | null>(null)
  const [sampleError, setSampleError] = useState<string | null>(null)

  // 練習モード
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const sessionRef = useRef<PracticeSession | null>(null)
  const [scoreReady, setScoreReady] = useState(false)
  const [snapshot, setSnapshot] = useState<PracticeSnapshot | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState<number | null>(null)

  const startPractice = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) return
    // OSMD Cursor は OsmdCursorLike を構造的に満たす(§7.1 で API 確認済み)
    const cursor = new ScoreCursor(osmd.cursor as unknown as OsmdCursorLike)
    const session = new PracticeSession(cursor)
    sessionRef.current = session
    startedAtRef.current = Date.now()
    setElapsedSec(null)
    setSnapshot(session.start())
  }, [])

  const stopPractice = useCallback(() => {
    sessionRef.current = null
    startedAtRef.current = null
    setSnapshot(null)
    osmdRef.current?.cursor.reset()
  }, [])

  // MIDI / デバッグ鍵盤の打鍵を練習セッションへ流す
  useEffect(
    () =>
      subscribeNote((event) => {
        const session = sessionRef.current
        if (!session) return
        const next =
          event.kind === 'on'
            ? session.noteOn(event.note)
            : session.noteOff(event.note)
        setSnapshot((prev) => {
          if (
            next.status === 'finished' &&
            prev?.status !== 'finished' &&
            startedAtRef.current !== null
          ) {
            setElapsedSec((Date.now() - startedAtRef.current) / 1000)
          }
          return next
        })
      }),
    [subscribeNote],
  )

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

  // 練習中の鍵盤ハイライト(期待=青、正打=緑、誤打=赤)
  const highlights = new Map<number, KeyHighlight>()
  if (snapshot !== null && snapshot.status === 'waiting') {
    snapshot.expected.forEach((note) =>
      highlights.set(
        note,
        snapshot.satisfied.has(note) ? 'correct' : 'expected',
      ),
    )
    snapshot.wrongPressed.forEach((note) => highlights.set(note, 'wrong'))
  }

  const practicing = snapshot !== null

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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="text-sm text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  stopPractice()
                  setScore(null)
                }}
              >
                ← 別の曲を開く
              </button>
              <PracticeBar
                snapshot={snapshot}
                scoreReady={scoreReady}
                elapsedSec={elapsedSec}
                onStart={startPractice}
                onStop={stopPractice}
              />
            </div>
            <ScoreView
              xml={score.xml}
              showManualControls={!practicing}
              onReady={(osmd) => {
                osmdRef.current = osmd
                setScoreReady(true)
              }}
              onUnload={() => {
                osmdRef.current = null
                sessionRef.current = null
                setScoreReady(false)
                setSnapshot(null)
              }}
            />
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
          highlights={highlights}
          showNoteNames={showNoteNames}
          onNoteOn={(note) => emitDebugNote('on', note)}
          onNoteOff={(note) => emitDebugNote('off', note)}
        />
      </footer>
    </div>
  )
}

export default App
