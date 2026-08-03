import type { DeviceInfo } from '../core/midi/midiManager'
import type { MidiStatus } from '../hooks/useMidi'

type Props = {
  status: MidiStatus
  devices: DeviceInfo[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** MIDI 接続状態の表示とデバイス選択 */
export function MidiPanel({ status, devices, selectedId, onSelect }: Props) {
  if (status === 'requesting') {
    return <p className="text-sm text-ink/60">MIDI アクセスを要求中…</p>
  }
  if (status === 'unsupported') {
    return (
      <p className="text-sm text-ink/70">
        お使いのブラウザは Web MIDI API に対応していません。Chrome / Edge /
        Firefox でお試しください。画面下の鍵盤クリックでは動作確認できます。
      </p>
    )
  }
  if (status === 'denied') {
    return (
      <p className="text-sm text-ink/70">
        MIDI デバイスへのアクセスが拒否されました。ブラウザのサイト設定で MIDI
        を許可してから再読み込みしてください。
      </p>
    )
  }
  if (devices.length === 0) {
    return (
      <p className="text-sm text-ink/70">
        MIDI デバイスが見つかりません。キーボードを USB
        接続してください(接続すると自動で認識されます)。画面下の鍵盤クリックでも試せます。
      </p>
    )
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink/70">MIDI デバイス:</span>
      <select
        className="rounded border border-ink/30 bg-white px-2 py-1"
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  )
}
