// @ts-nocheck
const fs = require('fs-extra');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, '../public/audio');

// 削除対象のファイルパターンのリスト（正規表現）
// これらのパターンに一致するファイルは「動画専用の音声」とみなされ、削除されます。
const PATTERNS_TO_DELETE = [
    /^title\.mp3$/,
    /^word.*\.mp3$/,
    /^definition.*\.mp3$/,
    /^context.*\.mp3$/,
    /^example.*\.mp3$/,
    /^vocab_.*\.mp3$/
];

async function cleanup() {
    console.log('Cleaning up temporary audio files...');

    if (!fs.existsSync(AUDIO_DIR)) {
        console.log('Audio directory does not exist.');
        return;
    }

    const files = await fs.readdir(AUDIO_DIR);
    let deletedCount = 0;

    for (const file of files) {
        const shouldDelete = PATTERNS_TO_DELETE.some(pattern => pattern.test(file));
        if (shouldDelete) {
            await fs.unlink(path.join(AUDIO_DIR, file));
            // console.log(`Deleted: ${file}`); // 詳細ログが必要な場合はコメントアウトを外す
            deletedCount++;
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} files.`);
}

cleanup();
