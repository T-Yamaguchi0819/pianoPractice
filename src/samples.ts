/** 同梱するパブリックドメインのサンプル曲(public/samples/ 配下) */
export type SampleMeta = {
  file: string
  title: string
  composer: string
}

export const SAMPLES: SampleMeta[] = [
  {
    file: 'kirakiraboshi.musicxml',
    title: 'きらきら星',
    composer: 'フランス民謡',
  },
  {
    file: 'choucho.musicxml',
    title: 'ちょうちょう',
    composer: 'ドイツ民謡',
  },
  {
    file: 'mary-lamb.musicxml',
    title: 'メリーさんの羊',
    composer: 'アメリカ民謡',
  },
  {
    file: 'kaeru-no-gassho.musicxml',
    title: 'かえるの合唱',
    composer: 'ドイツ民謡',
  },
  {
    file: 'ode-to-joy.musicxml',
    title: '歓喜の歌(簡易アレンジ)',
    composer: 'ベートーヴェン',
  },
  {
    file: 'minuet-in-g.musicxml',
    title: 'メヌエット ト長調(冒頭8小節)',
    composer: 'クリスティアン・ペツォールト',
  },
]
