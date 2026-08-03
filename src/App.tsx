import { useState } from 'react'
import { MidiPanel } from './components/MidiPanel'
import { NoteLog } from './components/NoteLog'
import { VirtualKeyboard } from './components/VirtualKeyboard'
import { useMidi } from './hooks/useMidi'

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-baseline justify-between px-6 py-4">
        <h1 className="font-serif text-2xl">ピアノ練習</h1>
        <MidiPanel
          status={status}
          devices={devices}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-6">
        <section className="flex-1">
          <h2 className="mb-2 text-sm font-bold text-ink/70">入力ログ</h2>
          <NoteLog entries={log} />
        </section>

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
