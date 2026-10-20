import fs from 'node:fs';
import path from 'node:path';

export function getNoteLink(id, root = '.') {
  if (!/^[a-z0-9-]+$/.test(id || '')) throw Error('Valid lesson ID required');
  const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const note = read('sources/video-notes.json')[id];
  if (!note || note.publicationStatus !== 'published' ||
      !/^https:\/\/shihoshoshi\.antonbase\.com\/notes\/[a-z0-9-]+$/.test(note.url)) throw Error('Matching published note required');
  const statePath = path.join(root, 'state/youtube.json');
  const receipts = fs.existsSync(statePath) ? read('state/youtube.json') : {};
  const ids = [...new Set(Object.entries(receipts).filter(([key]) => key.startsWith('[judicial-memory:' + id + ':')).map(([, value]) => value.videoId).filter(Boolean))];
  if (note.videoId) ids.push(note.videoId);
  const unique = [...new Set(ids)];
  if (unique.length !== 1 || !/^[A-Za-z0-9_-]{11}$/.test(unique[0])) throw Error('Resolve missing or conflicting existing video IDs; do not re-upload');
  return { ...note, videoId: unique[0], lesson: read('lessons/' + id + '.json') };
}

export function withNoteLink(description, url) {
  if (description.includes(url)) return description;
  return '📖 この動画の復習ノート（比較表・確認問題）\n' + url +
    '\n外部リンクが開けない場合は、URLをコピーしてブラウザで開いてください。\n\n' + description;
}
