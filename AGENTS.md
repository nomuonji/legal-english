# 司法書士 暗記ラボ

まず [情報源・制作・公開先の関係](docs/content-relationships.md) を読む。原本Markdown → 制作repo → 公開記事・固定YouTubeチャンネルの担当と、個別対応の正本をまとめている。

このrepoは旧Legal Englishから転換済み。長尺は司法書士の暗記動画。法律英語は2026-10-20にShortsとして再開（下記）。旧ランダム生成（`input/*.json`、Gemini生成・未検証）は使わない。

## 法律英語Shorts

- 英語の法令用語は `sources/jlt/law-je-dic-19.0.csv`（法務省「法令用語日英標準対訳辞書」v19.0）にある訳語・注釈・用例だけを使う。台本 `shorts/queue/<id>.json` の `refs` と `example` は辞書と完全一致が必須で、`npm run shorts:check` が検査する。AIの訳語や旧 `input/` を使わない。
- 1本1語（または訳し分けの1セット）。クイズ→無音で考える→答え→落とし穴（使い分け基準・注釈が根拠）→条文英訳の用例→再テスト→関連語（`related`）→2問目の再テスト→まとめ。再テスト2問以上と関連語ビートは必須。40〜100秒（2026-10-20 ユーザー：尺は長めでよい、内容を厚く）。
- 終わりは自動で付く締めの場面（今日の語の一覧・次回予告・挨拶・ゆっくり暗転）。台本に書かない。`reading` にかなの読みを入れる（締めと次回予告の読み上げ用）。
- 日本語の説明は独自編集。辞書にない法的主張を足すときは条文で確認する。日本語音声行に英字を入れない（英語は英語音声行かカタカナの say）。
- **エージェントの担当は台本をキュー `shorts/queue/` に入れるところまで**（手順は [docs/shorts-queue.md](docs/shorts-queue.md)）。生成から投稿は Actions **Legal Shorts Publish** が毎日自動で行う（2026-10-20 ユーザー指示）。エージェントは描画・投稿・公開状態を手で変えない。
- 画面：既存キャラクター（`public/images/mouth-*.png`）が口パク、吹き出し字幕、VOICEVOX冥鳴ひまり＋Piper kristin、BGMは `public/bgm/credits.json` 登録曲のみ。

- 題材正本は `nomuonji/learning-os` の `data/sources/judicial-scrivener/2026-10-10-user-notes/raw/試験勉強/` にある本人の学習用Markdown。公開済みLiving Notesやバイリンガル版を代用しない。
- `sources/catalog.json` で本人が直接付けた苦手印を探し、対象節の原本をGitHubで読む。目録だけから教材本文を推測しない。原本全文・埋め込み画像をこの公開repoへ転載しない。
- 学習用の略記は現行条文・通達等で確認し、前提・例外が消えない独自の事例・説明に編集する。元ノートの誤りは動画へ引き継がない。
- 一動画は「混ざる知識を区別して答えられる」一つの目標へ。問い→読み上げ後の無音想起→理由・比較→条件を変えた問題→再テスト。ノートの要約朗読や数字の羅列に戻さない。
- 台本は `lessons/<id>.json`。`npm run memory:prepare -- <id> --voice` で音声長を実測する。無音プレビューを本番に使わない。
- 変更に応じて型・ESLint・想起タイミング検証を行い、実MP4の画と音を確認する。コードが通ったことを教材の暗記効果・本人評価・視聴者評価と取り違えない。
- `Judicial Memory` が制作、`Judicial YouTube` が既存チャンネルへの投稿。認証情報をログやrepoへ出さない。新規の定期投稿や旧動画の削除・一括非公開化はユーザー指示なしに設定しない。
- 試作は非公開で投稿する。公開は既存YouTube IDを使い、同じ動画を再アップロードしない。アップロード結果不明時はStudioを確認してから再実行する。

- 動画と公開記事を一組で運用する。対応表は `sources/video-notes.json`、投稿結果は `state/youtube.json`。概要欄→記事URL、記事→同一IDの埋め込みを揃え、`node scripts/memory/note-link.mjs <id> --check` と実画面で確認する。埋め込み設置と一般読者の再生可否を混同しない。詳細手順は `docs/video-note-links.md`。

詳細はREADME.md。原本の非公開状態や本人の学習履歴そのものを変更しない。
