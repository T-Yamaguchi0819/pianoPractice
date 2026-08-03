import { describe, expect, it } from 'vitest'
import { noteNumberToName, parseMidiMessage } from '../src/core/midi/messages'

describe('parseMidiMessage', () => {
  it('NoteOn を解析する', () => {
    expect(parseMidiMessage(new Uint8Array([0x90, 60, 100]))).toEqual({
      kind: 'on',
      note: 60,
      velocity: 100,
    })
  })

  it('NoteOff を解析する', () => {
    expect(parseMidiMessage(new Uint8Array([0x80, 60, 64]))).toEqual({
      kind: 'off',
      note: 60,
      velocity: 64,
    })
  })

  it('velocity 0 の NoteOn は NoteOff として扱う', () => {
    expect(parseMidiMessage(new Uint8Array([0x90, 72, 0]))).toEqual({
      kind: 'off',
      note: 72,
      velocity: 0,
    })
  })

  it('チャンネル番号を無視して解析する(ch5 の NoteOn)', () => {
    expect(parseMidiMessage(new Uint8Array([0x94, 40, 10]))).toEqual({
      kind: 'on',
      note: 40,
      velocity: 10,
    })
  })

  it('NoteOn/Off 以外のメッセージは null', () => {
    expect(parseMidiMessage(new Uint8Array([0xb0, 64, 127]))).toBeNull() // CC
    expect(parseMidiMessage(new Uint8Array([0xe0, 0, 64]))).toBeNull() // ピッチベンド
  })

  it('不完全なデータは null', () => {
    expect(parseMidiMessage(null)).toBeNull()
    expect(parseMidiMessage(new Uint8Array([]))).toBeNull()
    expect(parseMidiMessage(new Uint8Array([0x90, 60]))).toBeNull()
  })
})

describe('noteNumberToName', () => {
  it.each([
    [21, 'A0'],
    [60, 'C4'],
    [61, 'C#4'],
    [69, 'A4'],
    [108, 'C8'],
  ])('%i → %s', (note, name) => {
    expect(noteNumberToName(note)).toBe(name)
  })
})
