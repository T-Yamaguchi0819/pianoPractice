import { useCallback, useEffect, useRef, useState } from 'react'
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { ControlBar, type HandSelection } from './components/ControlBar'
import type { PickedScore } from './components/FilePicker'
import { Home } from './components/Home'
import { MidiPanel } from './components/MidiPanel'
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
import {
  ScoreCursor,
  type MeasureRange,
  type OsmdCursorLike,
} from './core/score/scoreCursor'
import {
  computeScoreId,
  extractTitle,
  loadRecords,
  loadSettings,
  recordPractice,
  saveSettings,
  type KeyValueStorage,
  type Records,
} from './core/storage/records'
import { useMidi } from './hooks/useMidi'
import { type SampleMeta } from './samples'

/** localStorage が使えない環境(プライベートモード等)でも動かすためのフォールバック */
const memoryStorage: KeyValueStorage = {
  getItem: () => null,
  setItem: () => {},
}

function getStorage(): KeyValueStorage {
  try {
    window.localStorage.getItem('ppa:probe')
    return window.localStorage
  } catch {
    return memoryStorage
  }
}

const storage = getStorage()
const initialSettings = loadSettings(storage)

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
  } = useMidi({ preferredDeviceId: initialSettings.midiDeviceId })
  const [showNoteNames, setShowNoteNames] = useState(
    initialSettings.showNoteNames,
  )
  const [score, setScore] = useState<PickedScore | null>(null)
  const [sampleError, setSampleError] = useState<string | null>(null)

  // 設定の永続化(計画書 §8)
  useEffect(() => {
    saveSettings(storage, {
      midiDeviceId: selectedId ?? undefined,
      showNoteNames,
    })
  }, [selectedId, showNoteNames])

  // 練習記録(計画書 §5.5 / §8)
  const [records, setRecords] = useState<Records>(() => loadRecords(storage))
  const scoreMetaRef = useRef<{ id: string; title: string } | null>(null)
  const practiceStartedRef = useRef<number | null>(null)
  const completionsRef = useRef(0)

  useEffect(() => {
    scoreMetaRef.current = null
    if (score === null) return
    let cancelled = false
    const title = extractTitle(score.xml) ?? score.fileName
    void computeScoreId(score.fileName, score.xml).then((id) => {
      if (!cancelled) scoreMetaRef.current = { id, title }
    })
    return () => {
      cancelled = true
    }
  }, [score])

  /** 進行中の練習を記録へ反映して締める(未開始なら何もしない) */
  const commitPracticeRecord = useCallback(() => {
    const startedAt = practiceStartedRef.current
    const meta = scoreMetaRef.current
    practiceStartedRef.current = null
    if (startedAt === null || meta === null) {
      completionsRef.current = 0
      return
    }
    setRecords(
      recordPractice(storage, {
        scoreId: meta.id,
        title: meta.title,
        practiceSec: (Date.now() - startedAt) / 1000,
        completions: completionsRef.current,
      }),
    )
    completionsRef.current = 0
  }, [])

  // 練習モード
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const sessionRef = useRef<PracticeSession | null>(null)
  const [scoreReady, setScoreReady] = useState(false)
  const [snapshot, setSnapshot] = useState<PracticeSnapshot | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState<number | null>(null)

  // 練習 UX(パート選択・小節範囲ループ)
  const [hand, setHand] = useState<HandSelection>('both')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [measureCount, setMeasureCount] = useState<number | null>(null)
  const [loopCount, setLoopCount] = useState(0)
  const loopActiveRef = useRef(false)

  const parsedRange = ((): {
    range: MeasureRange | undefined
    error: string | null
  } => {
    if (rangeStart === '' && rangeEnd === '') {
      return { range: undefined, error: null }
    }
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (
      rangeStart === '' ||
      rangeEnd === '' ||
      !Number.isInteger(start) ||
      !Number.isInteger(end)
    ) {
      return {
        range: undefined,
        error: '開始と終了の両方の小節番号を指定してください',
      }
    }
    if (
      start < 1 ||
      start > end ||
      (measureCount !== null && end > measureCount)
    ) {
      return { range: undefined, error: '小節範囲が正しくありません' }
    }
    return { range: { start, end }, error: null }
  })()

  const startPractice = useCallback(() => {
    const osmd = osmdRef.current
    if (!osmd) return
    commitPracticeRecord() // 「もう一度」等で直前の練習が残っていれば先に記録
    // OSMD Cursor は OsmdCursorLike を構造的に満たす(§7.1 で API 確認済み)
    const cursor = new ScoreCursor(osmd.cursor as unknown as OsmdCursorLike, {
      staffIds: hand === 'right' ? [1] : hand === 'left' ? [2] : undefined,
      measureRange: parsedRange.range,
    })
    const session = new PracticeSession(cursor)
    sessionRef.current = session
    loopActiveRef.current = parsedRange.range !== undefined
    startedAtRef.current = Date.now()
    practiceStartedRef.current = Date.now()
    completionsRef.current = 0
    setLoopCount(0)
    setElapsedSec(null)
    setSnapshot(session.start())
  }, [hand, parsedRange.range, commitPracticeRecord])

  const stopPractice = useCallback(() => {
    commitPracticeRecord()
    sessionRef.current = null
    loopActiveRef.current = false
    startedAtRef.current = null
    setSnapshot(null)
    setLoopCount(0)
    osmdRef.current?.cursor.reset()
  }, [commitPracticeRecord])

  // 小節範囲ループ: 完走したら少し置いて範囲の先頭から再開(計画書 §5.3)
  useEffect(() => {
    if (snapshot?.status !== 'finished' || !loopActiveRef.current) return
    const timer = setTimeout(() => {
      const session = sessionRef.current
      if (session === null) return
      setLoopCount((count) => count + 1)
      startedAtRef.current = Date.now()
      setSnapshot(session.start())
    }, 700)
    return () => clearTimeout(timer)
  }, [snapshot])

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
          if (next.status === 'finished' && prev?.status !== 'finished') {
            completionsRef.current++
            if (startedAtRef.current !== null) {
              setElapsedSec((Date.now() - startedAtRef.current) / 1000)
            }
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
          <Home
            records={records}
            log={log}
            sampleError={sampleError}
            onLoaded={setScore}
            onLoadSample={(sample) => void loadSample(sample)}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="text-sm text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  stopPractice()
                  setScore(null)
                  setRangeStart('')
                  setRangeEnd('')
                }}
              >
                ← 別の曲を開く
              </button>
              <PracticeBar
                snapshot={snapshot}
                scoreReady={scoreReady}
                elapsedSec={elapsedSec}
                loopActive={loopActiveRef.current}
                loopCount={loopCount}
                onStart={startPractice}
                onStop={stopPractice}
              />
            </div>
            <ControlBar
              hand={hand}
              onHandChange={setHand}
              measureCount={measureCount}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onRangeChange={(start, end) => {
                setRangeStart(start)
                setRangeEnd(end)
              }}
              rangeError={parsedRange.error}
              disabled={practicing}
            />
            <ScoreView
              xml={score.xml}
              showManualControls={!practicing}
              onReady={(osmd) => {
                osmdRef.current = osmd
                setScoreReady(true)
                setMeasureCount(osmd.Sheet.SourceMeasures.length)
              }}
              onUnload={() => {
                osmdRef.current = null
                sessionRef.current = null
                setScoreReady(false)
                setSnapshot(null)
                setMeasureCount(null)
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
