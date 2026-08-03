import { FilePicker, type PickedScore } from './FilePicker'
import { NoteLog } from './NoteLog'
import { recentRecords, type Records } from '../core/storage/records'
import type { NoteLogEntry } from '../hooks/useMidi'
import type { SampleMeta } from '../samples'
import { SAMPLES } from '../samples'

type Props = {
  records: Records
  log: NoteLogEntry[]
  sampleError: string | null
  onLoaded: (score: PickedScore) => void
  onLoadSample: (sample: SampleMeta) => void
}

/** 曲を開く前のホーム画面: 使い方・ファイル選択・サンプル曲・練習記録 */
export function Home({
  records,
  log,
  sampleError,
  onLoaded,
  onLoadSample,
}: Props) {
  const recent = recentRecords(records)

  return (
    <>
      <section className="rounded border border-ink/15 bg-white/50 px-4 py-3 text-sm text-ink/70">
        <h2 className="mb-1 font-bold text-ink/80">使い方</h2>
        <ol className="list-inside list-decimal space-y-0.5">
          <li>MIDI キーボードを USB で接続する(Chrome / Edge / Firefox)</li>
          <li>MusicXML の譜面を開く(下のサンプル曲でも OK)</li>
          <li>
            「練習を開始」を押し、青く光る鍵を弾くと譜面が進む。間違えても
            止まらずに待ってくれる
          </li>
        </ol>
      </section>

      <FilePicker onLoaded={onLoaded} />

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
                onClick={() => onLoadSample(sample)}
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

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-ink/70">最近練習した曲</h2>
          <ul className="divide-y divide-ink/10 rounded border border-ink/15 bg-white/50">
            {recent.slice(0, 8).map(([scoreId, record]) => (
              <li
                key={scoreId}
                className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-2"
              >
                <span className="font-serif">{record.title}</span>
                <span className="text-xs text-ink/60">
                  練習 {record.playCount} 回 / 累計{' '}
                  {formatDuration(record.totalPracticeSec)} / 完走{' '}
                  {record.completions} 回 / 最終{' '}
                  {formatDate(record.lastPlayedAt)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-ink/50">
            ※
            譜面ファイル自体は保存されません。練習を再開するときは同じファイルを
            もう一度開いてください。
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink/70">入力ログ</h2>
        <NoteLog entries={log} />
      </section>
    </>
  )
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}秒`
  const totalMin = Math.floor(sec / 60)
  if (totalMin < 60) return `${totalMin}分`
  return `${Math.floor(totalMin / 60)}時間${totalMin % 60}分`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}
