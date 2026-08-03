/** NoteOn / NoteOff に正規化した MIDI イベント */
export type NoteEvent = {
  kind: 'on' | 'off'
  note: number
  velocity: number
}

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

/**
 * 生の MIDI メッセージを NoteEvent に変換する。
 * NoteOn/NoteOff 以外(CC・ピッチベンド等)と不完全なデータは null。
 * velocity 0 の NoteOn は慣習どおり NoteOff として扱う。
 */
export function parseMidiMessage(
  data: Uint8Array | null | undefined,
): NoteEvent | null {
  if (!data || data.length < 3) return null
  const status = data[0] & 0xf0
  const note = data[1]
  const velocity = data[2]
  if (status === NOTE_ON) {
    return velocity === 0
      ? { kind: 'off', note, velocity: 0 }
      : { kind: 'on', note, velocity }
  }
  if (status === NOTE_OFF) {
    return { kind: 'off', note, velocity }
  }
  return null
}

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

/** MIDI ノート番号 → 音名(例: 60 → "C4")。中央ハ = C4 の国際式 */
export function noteNumberToName(note: number): string {
  const octave = Math.floor(note / 12) - 1
  return `${NOTE_NAMES[note % 12]}${octave}`
}
