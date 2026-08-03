import JSZip from 'jszip'

/** 譜面ファイルの読み込み失敗。message はそのままユーザーに表示できる日本語 */
export class ScoreLoadError extends Error {}

const TEXT_EXTENSIONS = ['.xml', '.musicxml']

/**
 * ファイル名と中身から MusicXML 文字列を取り出す。
 * .xml / .musicxml はそのまま、.mxl は ZIP を展開して取り出す。
 */
export async function extractMusicXml(
  fileName: string,
  data: ArrayBuffer | Uint8Array | string,
): Promise<string> {
  const lower = fileName.toLowerCase()

  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    const text =
      typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data)
    if (text.trim() === '') {
      throw new ScoreLoadError('ファイルが空です。')
    }
    return text
  }

  if (lower.endsWith('.mxl')) {
    if (typeof data === 'string') {
      throw new ScoreLoadError('.mxl はバイナリとして読み込んでください。')
    }
    return extractFromMxl(data)
  }

  throw new ScoreLoadError(
    '対応していないファイル形式です。.xml / .musicxml / .mxl のファイルを選択してください。',
  )
}

async function extractFromMxl(data: ArrayBuffer | Uint8Array): Promise<string> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(data)
  } catch {
    throw new ScoreLoadError(
      '.mxl ファイルを展開できませんでした。ファイルが壊れている可能性があります。',
    )
  }

  // MusicXML 圧縮形式の規約: META-INF/container.xml の rootfile が本体を指す
  const container = zip.file('META-INF/container.xml')
  if (container) {
    const containerText = await container.async('text')
    const match = /full-path="([^"]+)"/.exec(containerText)
    if (match) {
      const rootfile = zip.file(match[1])
      if (rootfile) return rootfile.async('text')
    }
  }

  // フォールバック: META-INF 以外にある最初の .xml / .musicxml
  const candidates = zip.filter(
    (path) =>
      !path.startsWith('META-INF/') &&
      TEXT_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)),
  )
  if (candidates.length > 0) return candidates[0].async('text')

  throw new ScoreLoadError('.mxl の中に MusicXML が見つかりませんでした。')
}
