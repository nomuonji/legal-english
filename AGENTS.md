# 司法書士 暗記ラボ

このrepoは旧Legal Englishから転換済み。新しい法律英語の量産は行わない。

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
