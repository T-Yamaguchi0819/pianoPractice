import { parseMidiMessage, type NoteEvent } from './messages'

export type DeviceInfo = { id: string; name: string }

/** 実機 MIDIInput とテスト用モックの両方を満たす最小限の構造的型 */
export interface MidiInputLike {
  id: string
  name?: string | null
  onmidimessage: ((event: { data: Uint8Array | null }) => void) | null
}

export interface MidiAccessLike {
  inputs: { forEach(callback: (input: MidiInputLike) => void): void }
  onstatechange: ((event: unknown) => void) | null
}

/**
 * Web MIDI API の薄いラッパー。
 * デバイス列挙・選択・NoteOn/Off の購読と、抜き差し(statechange)への追随を担う。
 * React には依存しない。
 */
export class MidiManager {
  private access: MidiAccessLike
  private selected: MidiInputLike | null = null
  private noteListeners = new Set<(event: NoteEvent) => void>()
  private deviceListeners = new Set<(devices: DeviceInfo[]) => void>()

  constructor(access: MidiAccessLike) {
    this.access = access
    access.onstatechange = () => {
      const devices = this.listDevices()
      if (this.selected && !devices.some((d) => d.id === this.selected?.id)) {
        this.selectDevice(null)
      }
      this.deviceListeners.forEach((listener) => listener(devices))
    }
  }

  listDevices(): DeviceInfo[] {
    const devices: DeviceInfo[] = []
    this.access.inputs.forEach((input) => {
      devices.push({ id: input.id, name: input.name ?? '(名称不明)' })
    })
    return devices
  }

  get selectedId(): string | null {
    return this.selected?.id ?? null
  }

  /** id のデバイスの購読を開始する。null で購読解除のみ */
  selectDevice(id: string | null): void {
    if (this.selected) this.selected.onmidimessage = null
    this.selected = null
    if (id === null) return

    let target: MidiInputLike | undefined
    this.access.inputs.forEach((input) => {
      if (input.id === id) target = input
    })
    if (!target) return

    target.onmidimessage = (event) => {
      const parsed = parseMidiMessage(event.data)
      if (parsed) this.noteListeners.forEach((listener) => listener(parsed))
    }
    this.selected = target
  }

  onNote(listener: (event: NoteEvent) => void): () => void {
    this.noteListeners.add(listener)
    return () => this.noteListeners.delete(listener)
  }

  onDevicesChanged(listener: (devices: DeviceInfo[]) => void): () => void {
    this.deviceListeners.add(listener)
    return () => this.deviceListeners.delete(listener)
  }

  dispose(): void {
    this.selectDevice(null)
    this.access.onstatechange = null
    this.noteListeners.clear()
    this.deviceListeners.clear()
  }
}
