import fs from 'node:fs';
import {getNoteLink} from './note-links.mjs';

try {
  const id = process.argv[2], note = getNoteLink(id);
  const title = note.lesson.title.replace(/[\[\]\r\n]/g, '');
  const block = '## 対応動画\n\n[' + title + '](https://youtu.be/' + note.videoId + ')\n\n' +
    '動画では答えを見る前に声に出して答え、この記事では比較表と確認問題で復習してください。\n';
  fs.mkdirSync('out/' + id, {recursive: true});
  fs.writeFileSync('out/' + id + '/note-link.md', block);
  const result = {lessonId: id, noteUrl: note.url, videoId: note.videoId, embedVerified: false, playbackVerified: false};
  if (process.argv.includes('--check')) {
    const response = await fetch(note.url, {signal: AbortSignal.timeout(20000)});
    if (!response.ok || new URL(response.url).hostname !== 'shihoshoshi.antonbase.com') throw Error('Published note did not load at its public origin');
    const html = await response.text();
    if (!html.includes('data-note-video="' + note.videoId + '"') ||
        !html.includes('https://www.youtube-nocookie.com/embed/' + note.videoId)) throw Error('Public note has no player for the matching video ID');
    result.embedVerified = true;
  }
  fs.writeFileSync('out/' + id + '/note-link.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  console.log('Article block: out/' + id + '/note-link.md. Upsert the corresponding article section, then run --check. An embedded player does not prove public playback.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
