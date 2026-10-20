# 司法書士 暗記ラボ（旧 Legal English）

## エージェント向けの入口

[情報源・制作・公開先の関係](docs/content-relationships.md) に、原本・台本・公開記事・YouTubeチャンネル・対応表の正本を集約。[動画と記事の運用手順](docs/video-note-links.md) と併せて読む。

Learning OSに取り込んだ本人の学習用Markdownを、司法書士試験の想起練習動画へ編集する制作・投稿リポジトリ。

## 法律英語Shorts（2026-10-20再開）

- 正本：法務省「法令用語日英標準対訳辞書」第19.0版（`sources/jlt/`、日本法令外国語訳データベースシステムからCSV取得。利用規約に従い引用・複製可）。
- 台本：`shorts/<id>.json`。英語は辞書の訳語（`via: candidate`）か、その行の注釈に出てくる語（`via: note`）だけ。用例は辞書の和文・英文・出典と完全一致。
- 制作：`npm run shorts:prepare -- <id> [--voice]` → `npx remotion render src/index.ts LegalShort out/shorts/<id>/video.mp4 --props=out/shorts/<id>/props.json` → `npm run shorts:review -- <id>`。PRでは Actions **Legal Shorts** が全Shortsを音声付きで書き出す。
- 英語音声：Piper `en_US-joe-medium`（データセットCC0）。ryan・lessac・hfc系は非商用ライセンスのため使わない。
- 画面は1080×1920。下約420px・右150pxはShortsのUIが重なるので文字を置かない。
- 旧Legal Englishの `input/*.json`（約7,900件）はGemini生成で、存在しない訴えや条文番号の誤り・重複を確認済み。使わない。

## 元にするノート

正本は private repository `nomuonji/learning-os` の
`data/sources/judicial-scrivener/2026-10-10-user-notes/raw/試験勉強/`。
公開済みLiving Notesや英語バイリンガル版は、このチャンネルの題材正本ではない。

- `不登法（暗記）.md`
- `暗記（会社法）.md`
- `民事訴訟法（暗記）.md`
- 各科目の元ノート、暗記構造シート

`#絶対覚えられない` → `#覚えられない` → `#まだ覚えてない` の節を優先候補にする。
タグは本人の過去の印で、現在の学習成績や効果測定値とはみなさない。
画像埋め込みは画像未取得フラグを残す。画像の中身を推測しない。

GitHub connectorの `fetch_file` で得た `{path, blobSha, content}` を `.source-cache/` へ置き、
`npm run memory:catalog -- .source-cache/*.json` で節・タグ・原本ハッシュの目録を更新する。
原本全文をこの公開repoへコピーしない。目録は11ノート1,084節。本人が苦手印を直接付けた節を優先し、親見出しへの誤伝播を避ける。全文・全添付画像の教材化が完了したという意味ではない。

## 動画の編集単位

1本で、混同しやすい2〜4論点を扱う。用語の羅列やノートの読み上げを目的にしない。

1. 最初に事例で問う。答えは隠す。
2. 読み上げ終了後、5〜6秒の無音で思い出す。
3. 要件・理由・例外を同じ比較地図へ結びつける。
4. 一語だけ条件を変えた問題で、境界を確かめる。
5. 順番と言い方を変えた再テストで締める。

台本の品質ルール（2026-10-20追加）：

- 各カードの `verdict` は「問いへの直接の答え」（数字・要否・期限）。権利の名前だけを答え画面の見出しにしない。読み上げも答えから始める（テストで検査）。
- 問いは答えを左右する条件（公開会社か、取締役会の有無など）を必ず書く。再テストでは条件を一つだけ変える。
- 数字が会社の種類などで変わる回は `matrix`（行＝カード、列＝条件）を付ける。答え画面では `matrixColumn` の該当セルを強調し、ひっかけ画面は `trap.matrixColumn` の列を強調する。
- チャプターは場面単位でまとめ、YouTubeの「各10秒以上」条件を満たす。字幕は文単位に分けて音声の範囲内に置く。

復習の目安は翌日・3日後・7日後。最適な間隔や暗記成功を保証する数値ではない。
理解・想起を使う設計の参考：Karpicke & Blunt (2011), DOI:10.1126/science.1199327。
この動画そのものの効果は未測定。原本の誤り・古い制度・曖昧な略記は現行の条文・通達で確認し、独自の説明・問題へ編集する。

## 試作

`shareholder-proposal-numbers`：会社法ノートの「株主提案権の種類と要件」（#数字、#まだ覚えてない）。
議題・当日の議案・事前通知に「1％又は300個」「8週間」「公開会社の6か月」がどう付くかを問う。
会社法303〜305条を2026-10-20に確認。定款による緩和なし、当該事項の議決権ありという前提。
元ノートの要約欄にある再提案制限の紛らわしい記述は再利用せず、詳細は別回へ分離した。

## 制作

```bash
npm ci
npm run memory:prepare -- shareholder-proposal-numbers       # 無音プレビュー
# VOICEVOX Engineをlocalhost:50021で起動後
npm run memory:prepare -- shareholder-proposal-numbers --voice
npx remotion render src/index.ts JudicialMemory out/shareholder-proposal-numbers/video.mp4 --props=out/shareholder-proposal-numbers/props.json
node --import tsx scripts/memory/review-frames.ts shareholder-proposal-numbers
```

音声は VOICEVOX:青山龍星（ノーマル、style ID 13）。概要欄にクレジット。
音声長を実測して各場面・無音の想起時間を配置する。無音プレビューを本番動画と取り違えない。
BGM・効果音の連打・装飾用キャラクターは、この試作には入れない。

PRを作ると Actions **Judicial Memory** が音声付きMP4・各場面画像・コマ送り・概要欄・字幕原稿・チャプターを出力する。
`review.json` の自動出力は検証項目で、視覚審査・聴取・暗記効果を自動合格にしない。
映像・音を確認し、答えの先出し、文字切れ、法律用語の誤読、問題の条件抜けを直す。

## 投稿とチャンネル

既存 Legal English の OAuth 接続を利用。旧ランダム英単語生成・公開投稿workflowは退役。
新規の定期投稿は未設定。チャンネル名案・説明は `channel.json`。

既存のOAuthはアップロード専用で、チャンネル情報の読み取り権限はないことを実機確認済み。権限を増やさず、アップロード応答のチャンネルID・非公開状態とStudioで照合する。チャンネル説明や公開状態の変更は、読み取り権限がなければ既存IDを使ってStudioで行う。

Actions **Judicial YouTube**：

- `channel-info`：既存認証のチャンネルID・名称を確認。
- `update-description`：チャンネル説明を変更しreadback。チャンネル名はYouTube APIで変更不可のため、Studioで変更する。
- `upload-private`：成功したJudicial Memoryのrun IDとlesson IDを渡す。現在の台本と一致する音声付き動画を非公開で投稿し、YouTube IDを`state/youtube.json`へ記録。
- `publish`：確認済みの既存YouTube IDを公開へ変更。再アップロードしない。

アップロードの結果が不明なエラーになったら、Studioの実動画を確認してから再実行する。
公開後は維持率だけで暗記効果を測らず、再テストで言えたか、翌日思い出せたかを次作の改善に使う。
旧動画の削除や一括非公開化は行わない。
