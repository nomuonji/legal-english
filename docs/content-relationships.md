# 情報源・制作・公開先の関係

この文書は、司法書士 暗記ラボと司法書士ノートを引き継ぐエージェントの入口。旧名Legal Englishとrepo名legal-englishが残っていても、現在の用途は司法書士試験の暗記教材である。加えて2026-10-20から、同じチャンネルのShortsで法律英語を再開した（正本は法務省の標準対訳辞書 `sources/jlt/`、台本 `shorts/<id>.json`。記事との一組運用は長尺のみ）。

## 役割と正本

| 段階 | 正本・所在地 | 役割 |
| --- | --- | --- |
| 元の学習ノート | private repo [nomuonji/learning-os](https://github.com/nomuonji/learning-os) の `data/sources/judicial-scrivener/2026-10-10-user-notes/raw/試験勉強/` | 本人が勉強に使っていたMarkdown。題材の出発点。公開済み記事を代用しない |
| 法的根拠 | 現行条文・通達・裁判例などの一次資料 | 元ノートの略記・古い制度・誤りを確認する。元ノートを法的正確性の保証とは扱わない |
| 制作・投稿 | [nomuonji/legal-english](https://github.com/nomuonji/legal-english) | 目録 `sources/catalog.json`、台本 `lessons/<id>.json`、Remotion/VOICEVOX、投稿workflow |
| 公開記事の内容 | Learning OSのLiving Notes DB。研究記事は適用済みresearch packetが公開本文の正本 | 読者向けに独自編集した比較表・確認問題・根拠。元Markdownとは別の成果物 |
| 記事の公開先 | [司法書士ノート](https://shihoshoshi.antonbase.com/) の `/notes/<slug>` | 学習用記事と対応動画の埋め込み。public / publishedのNoteだけ表示 |
| 動画の公開先 | [司法書士 暗記ラボ](https://www.youtube.com/@shihoshoshi-anki-lab) | チャンネルID `UC-ZpuXrmV957gQsn4C2GtQQ`。既存Legal Englishチャンネルを転換して使用 |
| 記事と動画の対応 | 制作repoの `sources/video-notes.json` | lesson ID → 公開記事URL。記事はこの対応表から探す |
| 実際の投稿結果 | 制作repoの `state/youtube.json` | YouTube ID・チャンネル・投稿状態の記録。記録後の変更はStudio/実ページでも確認 |
| 継続判断・経緯 | My Portal Context `QHkcHOZChiQjgw4UHA4e`（Projects: video, learning-os） | 方針・訂正・現在地。記事本文や投稿結果の代替DBにはしない |

## 内容の流れ

本人の元Markdownの該当節を読む → 一次資料で確認 → 一つの学習目標として台本と記事を編集 → 音声付き動画を投稿 → 同じ動画IDを記事に埋め込む → 概要欄にその記事URLを掲載。

動画は事例・図解・無音の想起時間・再テストを担い、記事は比較表・条件・例外・確認問題・根拠を担う。記事を単なる台本転載にしない。

## 別エージェントの開始手順

1. My Portalを使える場合は `world_map_get` のagentGuideに従い、上のContextを読む。
2. 本repoの `AGENTS.md` と [運用手順](video-note-links.md) を読む。
3. `sources/video-notes.json` と `state/youtube.json` で対象lesson・記事・動画を特定する。repo名や記事タイトルから別チャンネルを推測しない。
4. 台本の `source.repository/path/blobSha/sectionId/sectionSha256` を手掛かりに、private repoの元Markdownを読む。目録や公開記事だけから原本を推測しない。
5. 原本を読めないときは取得できないと明示し、別の公開ノートを勝手に原本扱いしない。
6. 変更後、概要欄URL・記事の埋め込みID・一般読者の再生可否をそれぞれ確認する。既存動画を再アップロードしない。

## 記事側の実装

Learning OSの `app/public-site/[domainSlug]/notes/[slug]/page.tsx` が公開記事を取得し、司法書士domainだけMarkdownのYouTube埋め込みを有効にする。`components/markdown.tsx` → `lib/notes/youtube-link.ts` → `components/note-video.tsx` が単独の正規YouTubeリンクを16:9プレーヤーへ変換する。

研究記事は `lib/notes/repository.ts` → `lib/research/public-projection.mjs` で適用済みpacketの本文を投影する。通常の `upsert_note` で別の保存本文だけを更新しても、研究記事の公開表示は変わらない。新規記事の公開はLearning OSの正式な公開経路を使い、既存研究記事の訂正では現在の対応機能を確認する。DBの直接改変や原本の公開で解決しない。

## 境界

- 「ノート」は、原本Markdownと公開復習記事のどちらかを必ず区別する。原本全文・添付画像・私的学習履歴を公開repoへ転載しない。
- Learning OSのprivate学習アプリは `learning-os.youfree731.workers.dev`。記事の公開URLとして使わない。
- English Notes `english.antonbase.com`、別の公開ノートサイト `notes.antonbase.com`、他の動画チャンネルとは別系統。
- 旧動画の削除・一括非公開化、新規の定期投稿、他domainの運用変更はこの関係図の整備に含まれない。
- YouTubeはupload-only OAuthのため、公開設定や説明変更は既存IDのStudioを利用する場合がある。認証情報を文書やログへ書かない。

## 2026-10-20確認時点の具体例

| 項目 | 値 |
| --- | --- |
| lesson ID | `shareholder-proposal-numbers` |
| 原本 | 上記raw/試験勉強/ 内の `暗記（会社法）.md`、株主提案権の種類と要件 |
| 公開記事 | https://shihoshoshi.antonbase.com/notes/research-679f2b6d-6c65-4199-be2e-ac3746d4752b |
| 動画 | https://youtu.be/g3m3u0smx04 |
| 状態 | 記事公開・埋め込み確認済み。動画は非公開の試作で一般再生不可 |
| 残る制約 | YouTube概要欄の外部URLをクリック可能にする一度の確認は未完了 |

これは確認日の記録。将来の作業では最新の対応表と公開状態を読む。
