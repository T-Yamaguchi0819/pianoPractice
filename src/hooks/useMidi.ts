import { useCallback, useEffect, useRef, useState } from 'react'
import type { NoteEvent } from '../core/midi/messages'
import {
  MidiManager,
  type DeviceInfo,
  type MidiAccessLike,
} from '../core/midi/midiManager'
import { applyNoteEvent } from '../core/midi/pressedNotes'

export type MidiStatus = 'requesting' | 'unsupported' | 'denied' | 'ready'

export type NoteLogEntry = NoteEvent & {
  id: number
  source: 'midi' | 'debug'
}

const LOG_LIMIT = 20

export type UseMidiOptions = {
  /** 前回選択していたデバイス ID(接続時に優先して自動選択する) */
  preferredDeviceId?: string
}

/**
 * Web MIDI 接続の状態・デバイス選択・押下中ノート集合を管理するフック。
 * デバッグ鍵盤(クリック入力)も同じ経路で pressed / log に反映する。
 */
export function useMidi({ preferredDeviceId }: UseMidiOptions = {}) {
  const [status, setStatus] = useState<MidiStatus>('requesting')
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set())
  const [log, setLog] = useState<NoteLogEntry[]>([])
  const managerRef = useRef<MidiManager | null>(null)
  const nextLogId = useRef(0)
  const noteListenersRef = useRef(new Set<(event: NoteEvent) => void>())

  const handleNote = useCallback(
    (event: NoteEvent, source: NoteLogEntry['source']) => {
      setPressed((prev) => applyNoteEvent(prev, event))
      setLog((prev) =>
        [{ ...event, id: nextLogId.current++, source }, ...prev].slice(
          0,
          LOG_LIMIT,
        ),
      )
      noteListenersRef.current.forEach((listener) => listener(event))
    },
    [],
  )

  /** MIDI・デバッグ鍵盤の両方の NoteEvent を購読する(練習モード用) */
  const subscribeNote = useCallback((listener: (event: NoteEvent) => void) => {
    noteListenersRef.current.add(listener)
    return () => {
      noteListenersRef.current.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!('requestMIDIAccess' in navigator)) {
      setStatus('unsupported')
      return
    }
    let disposed = false
    let manager: MidiManager | null = null
    navigator
      .requestMIDIAccess({ sysex: false })
      .then((access) => {
        if (disposed) return
        // MIDIAccess は MidiAccessLike を構造的に満たすが、ハンドラ型の
        // 契約差(MIDIMessageEvent)があるためここでだけキャストする
        manager = new MidiManager(access as unknown as MidiAccessLike)
        managerRef.current = manager
        manager.onNote((event) => handleNote(event, 'midi'))
        manager.onDevicesChanged((list) => setDevices(list))
        setDevices(manager.listDevices())
        setStatus('ready')
      })
      .catch(() => {
        if (!disposed) setStatus('denied')
      })
    return () => {
      disposed = true
      manager?.dispose()
      managerRef.current = null
    }
  }, [handleNote])

  // デバイスリストの変化に選択を追随。
  // 未選択なら前回使用デバイス(あれば)→ 先頭の順で自動選択、消えたら乗り換え
  useEffect(() => {
    setSelectedId((current) => {
      if (current !== null && devices.some((d) => d.id === current)) {
        return current
      }
      if (
        preferredDeviceId !== undefined &&
        devices.some((d) => d.id === preferredDeviceId)
      ) {
        return preferredDeviceId
      }
      return devices[0]?.id ?? null
    })
  }, [devices, preferredDeviceId])

  // 選択デバイスの購読を切り替え。押しっぱなしノートの取り残しを防ぐためリセット
  useEffect(() => {
    if (status !== 'ready') return
    managerRef.current?.selectDevice(selectedId)
    setPressed(new Set())
  }, [status, selectedId])

  const emitDebugNote = useCallback(
    (kind: NoteEvent['kind'], note: number) => {
      handleNote({ kind, note, velocity: kind === 'on' ? 100 : 0 }, 'debug')
    },
    [handleNote],
  )

  return {
    status,
    devices,
    selectedId,
    setSelectedId,
    pressed,
    log,
    emitDebugNote,
    subscribeNote,
  }
}
