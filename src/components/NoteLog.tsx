import { noteNumberToName } from '../core/midi/messages'
import type { NoteLogEntry } from '../hooks/useMidi'

/** 打鍵イベントの確認用ログ(Phase 1 の動作確認が主目的) */
export function NoteLog({ entries }: { entries: NoteLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-ink/50">
        まだ入力がありません。鍵盤を弾く(または画面の鍵盤をクリックする)とここに表示されます。
      </p>
    )
  }
  return (
    <ul className="max-h-48 space-y-0.5 overflow-y-auto font-mono text-xs text-ink/80">
      {entries.map((e) => (
        <li key={e.id}>
          {e.kind === 'on' ? 'NoteOn ' : 'NoteOff'}{' '}
          {noteNumberToName(e.note).padEnd(4, ' ')} vel={e.velocity}
          {e.source === 'debug' && (
            <span className="text-ink/40">(クリック)</span>
          )}
        </li>
      ))}
    </ul>
  )
}
