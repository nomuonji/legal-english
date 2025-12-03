
import { google } from 'googleapis';
import fs from 'fs-extra';

import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Missing YouTube credentials in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});

const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
});

interface VideoMetadata {
    title: string;
    description: string;
    tags?: string[];
}

async function uploadVideo(videoPath: string, metadata: VideoMetadata) {
    if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
    }

    const fileSize = fs.statSync(videoPath).size;

    console.log(`Uploading video: ${videoPath} (${fileSize} bytes)`);
    console.log(`Title: ${metadata.title}`);

    try {
        const res = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: metadata.title,
                    description: metadata.description,
                    tags: metadata.tags || [],
                    categoryId: '27', // Education
                },
                status: {
                    privacyStatus: 'public',
                    selfDeclaredMadeForKids: false,
                },
            },
            media: {
                body: fs.createReadStream(videoPath),
            },
        });

        console.log(`Video uploaded successfully!`);
        console.log(`Video ID: ${res.data.id}`);
        console.log(`URL: https://youtu.be/${res.data.id}`);

        return res.data;
    } catch (error) {
        console.error('Error uploading video:', error);
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: npx ts-node scripts/upload-youtube.ts <video_path> <metadata_json_path>');
        process.exit(1);
    }

    const videoPath = args[0];
    const metadataPath = args[1];

    if (!fs.existsSync(metadataPath)) {
        console.error(`Metadata file not found: ${metadataPath}`);
        process.exit(1);
    }

    const metadata = await fs.readJson(metadataPath);

    try {
        await uploadVideo(videoPath, metadata);
    } catch (error) {
        process.exit(1);
    }
}

main();
