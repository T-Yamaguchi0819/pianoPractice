import { describe, expect, it } from 'vitest'
import {
  MidiManager,
  type MidiAccessLike,
  type MidiInputLike,
} from '../src/core/midi/midiManager'
import type { NoteEvent } from '../src/core/midi/messages'

class MockInput implements MidiInputLike {
  onmidimessage: ((event: { data: Uint8Array | null }) => void) | null = null
  constructor(
    public id: string,
    public name: string,
  ) {}

  emit(bytes: number[]) {
    this.onmidimessage?.({ data: new Uint8Array(bytes) })
  }
}

class MockAccess implements MidiAccessLike {
  inputs = new Map<string, MockInput>()
  onstatechange: ((event: unknown) => void) | null = null

  addInput(input: MockInput) {
    this.inputs.set(input.id, input)
    this.onstatechange?.({})
  }

  removeInput(id: string) {
    this.inputs.delete(id)
    this.onstatechange?.({})
  }
}

const noteOn = (note: number, velocity = 100) => [0x90, note, velocity]

describe('MidiManager', () => {
  it('デバイスを列挙する', () => {
    const access = new MockAccess()
    access.inputs.set('a', new MockInput('a', 'Piano A'))
    const manager = new MidiManager(access)
    expect(manager.listDevices()).toEqual([{ id: 'a', name: 'Piano A' }])
  })

  it('選択したデバイスの NoteOn/Off だけを購読する', () => {
    const access = new MockAccess()
    const pianoA = new MockInput('a', 'Piano A')
    const pianoB = new MockInput('b', 'Piano B')
    access.inputs.set('a', pianoA)
    access.inputs.set('b', pianoB)
    const manager = new MidiManager(access)

    const received: NoteEvent[] = []
    manager.onNote((e) => received.push(e))
    manager.selectDevice('a')

    pianoA.emit(noteOn(60))
    pianoB.emit(noteOn(72)) // 非選択デバイスは無視
    pianoA.emit([0xb0, 64, 127]) // CC は無視

    expect(received).toEqual([{ kind: 'on', note: 60, velocity: 100 }])
  })

  it('デバイスを切り替えると前のデバイスの購読を解除する', () => {
    const access = new MockAccess()
    const pianoA = new MockInput('a', 'Piano A')
    const pianoB = new MockInput('b', 'Piano B')
    access.inputs.set('a', pianoA)
    access.inputs.set('b', pianoB)
    const manager = new MidiManager(access)

    const received: NoteEvent[] = []
    manager.onNote((e) => received.push(e))
    manager.selectDevice('a')
    manager.selectDevice('b')

    pianoA.emit(noteOn(60))
    pianoB.emit(noteOn(72))

    expect(received).toEqual([{ kind: 'on', note: 72, velocity: 100 }])
    expect(manager.selectedId).toBe('b')
  })

  it('抜き差しでデバイスリスト変更を通知し、選択中デバイスが消えたら選択解除する', () => {
    const access = new MockAccess()
    const pianoA = new MockInput('a', 'Piano A')
    access.inputs.set('a', pianoA)
    const manager = new MidiManager(access)
    manager.selectDevice('a')

    const updates: string[][] = []
    manager.onDevicesChanged((devices) =>
      updates.push(devices.map((d) => d.id)),
    )

    access.addInput(new MockInput('b', 'Piano B'))
    expect(updates).toEqual([['a', 'b']])
    expect(manager.selectedId).toBe('a')

    access.removeInput('a')
    expect(updates).toEqual([['a', 'b'], ['b']])
    expect(manager.selectedId).toBeNull()
    expect(pianoA.onmidimessage).toBeNull()
  })

  it('dispose で購読とハンドラをすべて解除する', () => {
    const access = new MockAccess()
    const pianoA = new MockInput('a', 'Piano A')
    access.inputs.set('a', pianoA)
    const manager = new MidiManager(access)

    const received: NoteEvent[] = []
    manager.onNote((e) => received.push(e))
    manager.selectDevice('a')
    manager.dispose()

    pianoA.emit(noteOn(60))
    expect(received).toEqual([])
    expect(access.onstatechange).toBeNull()
  })
})
