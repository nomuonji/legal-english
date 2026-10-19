# 司法書士 暗記ラボ（旧 Legal English）

Learning OSに取り込んだ本人の学習用Markdownを、司法書士試験の想起練習動画へ編集する制作・投稿リポジトリ。

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
原本全文をこの公開repoへコピーしない。目録は3ノート48節から開始し、全科目完了ではない。

## 動画の編集単位

1本で、混同しやすい2〜4論点を扱う。用語の羅列やノートの読み上げを目的にしない。

1. 最初に事例で問う。答えは隠す。
2. 読み上げ終了後、5〜6秒の無音で思い出す。
3. 要件・理由・例外を同じ比較地図へ結びつける。
4. 一語だけ条件を変えた問題で、境界を確かめる。
5. 順番と言い方を変えた再テストで締める。

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

Actions **Judicial YouTube**：

- `channel-info`：既存認証のチャンネルID・名称を確認。
- `update-description`：チャンネル説明を変更しreadback。チャンネル名はYouTube APIで変更不可のため、Studioで変更する。
- `upload-private`：成功したJudicial Memoryのrun IDとlesson IDを渡す。現在の台本と一致する音声付き動画を非公開で投稿し、YouTube IDを`state/youtube.json`へ記録。
- `publish`：確認済みの既存YouTube IDを公開へ変更。再アップロードしない。

アップロードの結果が不明なエラーになったら、Studioの実動画を確認してから再実行する。
公開後は維持率だけで暗記効果を測らず、再テストで言えたか、翌日思い出せたかを次作の改善に使う。
旧動画の削除や一括非公開化は行わない。
