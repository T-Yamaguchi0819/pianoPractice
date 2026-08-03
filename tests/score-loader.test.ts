import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractMusicXml, ScoreLoadError } from '../src/core/score/loader'

const XML =
  '<?xml version="1.0"?><score-partwise version="4.0"></score-partwise>'

const encode = (text: string) => new TextEncoder().encode(text)

describe('extractMusicXml', () => {
  it('.musicxml の文字列はそのまま返す', async () => {
    await expect(extractMusicXml('song.musicxml', XML)).resolves.toBe(XML)
  })

  it('.xml のバイナリを UTF-8 として復号する', async () => {
    await expect(extractMusicXml('曲.XML', encode(XML))).resolves.toBe(XML)
  })

  it('空のファイルはエラー', async () => {
    await expect(extractMusicXml('song.xml', '  \n')).rejects.toThrow(
      ScoreLoadError,
    )
  })

  it('.mxl から container.xml の rootfile を辿って取り出す', async () => {
    const zip = new JSZip()
    zip.file(
      'META-INF/container.xml',
      '<?xml version="1.0"?><container><rootfiles>' +
        '<rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/>' +
        '</rootfiles></container>',
    )
    zip.file('score.xml', XML)
    const data = await zip.generateAsync({ type: 'uint8array' })

    await expect(extractMusicXml('song.mxl', data)).resolves.toBe(XML)
  })

  it('.mxl に container.xml が無くても最初の .xml を拾う', async () => {
    const zip = new JSZip()
    zip.file('untitled.xml', XML)
    const data = await zip.generateAsync({ type: 'uint8array' })

    await expect(extractMusicXml('song.mxl', data)).resolves.toBe(XML)
  })

  it('壊れた .mxl はエラー', async () => {
    await expect(
      extractMusicXml('song.mxl', encode('not a zip')),
    ).rejects.toThrow('.mxl ファイルを展開できませんでした')
  })

  it('MusicXML を含まない .mxl はエラー', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'hello')
    const data = await zip.generateAsync({ type: 'uint8array' })

    await expect(extractMusicXml('song.mxl', data)).rejects.toThrow(
      '.mxl の中に MusicXML が見つかりませんでした',
    )
  })

  it('対応していない拡張子はエラー', async () => {
    await expect(extractMusicXml('song.mid', encode('x'))).rejects.toThrow(
      '対応していないファイル形式',
    )
  })
})
