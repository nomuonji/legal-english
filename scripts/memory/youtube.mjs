import fs from 'node:fs';
import crypto from 'node:crypto';
import {google} from 'googleapis';
import {withNoteLink} from './note-links.mjs';
try {
const {YOUTUBE_CLIENT_ID:clientId,YOUTUBE_CLIENT_SECRET:clientSecret,YOUTUBE_REFRESH_TOKEN:refreshToken,MODE:mode,LESSON:lesson,VIDEO_ID:videoId}=process.env;
if(!clientId||!clientSecret||!refreshToken) throw Error('Missing existing Legal English YouTube credentials');
const auth=new google.auth.OAuth2(clientId,clientSecret);
auth.setCredentials({refresh_token:refreshToken});
const yt=google.youtube({version:'v3',auth});
const json=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,d)=>{fs.mkdirSync(p.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
const settings=json('channel.json');
const isMissingReadScope=error=>error.response?.status===403 && (
  error.response?.data?.error?.errors?.some(e=>e.reason==='insufficientPermissions') ||
  error.response?.data?.error?.message?.includes('insufficient authentication scopes'));
let canRead=true;
let channel;
try {
  const result=await yt.channels.list({part:['snippet','brandingSettings','contentDetails'],mine:true});
  if(result.data.items?.length!==1) throw Error('Expected one authenticated channel');
  channel=result.data.items[0];
  if(channel.id!==settings.channelId) throw Error('YouTube credential belongs to a different channel');
} catch(error) {
  if(!isMissingReadScope(error)) throw error;
  canRead=false;
  channel={id:settings.channelId,snippet:{title:settings.title}};
  console.log('Existing OAuth has upload access without channel read access; channel target was verified in Studio.');
}
save('out/youtube-channel.json',{id:channel.id,title:channel.snippet.title,channelReadAvailable:canRead,identityEvidence:canRead?'channels.list':'YouTube Studio (see docs/channel-profile.jpg)'});
if(mode==='channel-info') process.exit(0);
if(!canRead && mode!=='upload-private') throw Error('This OAuth connection uploads only. Edit channel details or publish the existing video ID in YouTube Studio.');
if(mode==='update-description') {
  const before=channel.brandingSettings??{};
  save('out/youtube-branding-before.json',before);
  // The API explicitly forbids changing the channel title; use Studio for the name.
  const branding={...before,channel:{...before.channel,description:settings.description,keywords:'司法書士 司法書士試験 暗記 会社法 民法 不動産登記法'}};
  delete branding.channel.title;
  await yt.channels.update({part:['brandingSettings'],requestBody:{id:channel.id,brandingSettings:branding}});
  const readback=await yt.channels.list({id:[channel.id],part:['brandingSettings']});
  if(readback.data.items?.[0]?.brandingSettings?.channel?.description!==settings.description) throw Error('Description readback mismatch');
  save('out/youtube-branding-after.json',{id:channel.id,description:settings.description});
} else if(mode==='upload-private') {
  if(!lesson||!/^[a-z0-9-]+$/.test(lesson)) throw Error('Invalid lesson id');
  const dir=`out/${lesson}`, meta=json(`${dir}/metadata.json`);
  const note=json('sources/video-notes.json')[lesson];
  if(!note || note.publicationStatus!=='published' || !/^https:\/\/shihoshoshi\.antonbase\.com\/notes\/[a-z0-9-]+$/.test(note.url)) throw Error('Matching published review note required');
  const linkedDescription=withNoteLink(meta.description,note.url);
  const current=json(`lessons/${lesson}.json`);
  const hash=crypto.createHash('sha256').update(JSON.stringify(current)).digest('hex');
  if(!meta.voiced||meta.lessonId!==lesson||hash!==meta.lessonHash) throw Error('Render must have voice and match current lesson');
  const marker=`[judicial-memory:${lesson}:${hash.slice(0,16)}]`;
  let receipts=fs.existsSync('state/youtube.json')?json('state/youtube.json'):{};
  if(receipts[marker]) throw Error(`Already uploaded: ${receipts[marker].videoId}`);
  // Read the account's actual uploads, not search-indexed/public-only videos.
  const uploads=canRead?await yt.playlistItems.list({part:['snippet'],playlistId:channel.contentDetails.relatedPlaylists.uploads,maxResults:50}):null;
  const duplicate=uploads?.data.items?.find(v=>v.snippet?.description?.includes(marker));
  if(duplicate) {
    receipts[marker]={videoId:duplicate.snippet.resourceId.videoId,channelId:channel.id,recovered:true};
    save('state/youtube.json',receipts);
    throw Error(`Upload already exists: ${duplicate.snippet.resourceId.videoId}`);
  }
  const uploaded=await yt.videos.insert({part:['snippet','status'],requestBody:{snippet:{title:meta.title,description:`${linkedDescription}\n\n${marker}`,tags:meta.tags,categoryId:'27',defaultLanguage:'ja'},status:{privacyStatus:'private',selfDeclaredMadeForKids:false}},media:{body:fs.createReadStream(`${dir}/video.mp4`)}});
  if(!uploaded.data.id) throw Error('No upload ID: inspect Studio before any retry');
  receipts[marker]={videoId:uploaded.data.id,channelId:uploaded.data.snippet?.channelId,privacyStatus:uploaded.data.status?.privacyStatus,noteUrl:note.url,readbackMode:canRead?'videos.list':'insert-response (verify in Studio)',uploadedAt:new Date().toISOString()};
  save('state/youtube.json',receipts);
  save('out/youtube-upload.json',receipts[marker]);
  if(uploaded.data.status?.privacyStatus!=='private'||uploaded.data.snippet?.channelId!==settings.channelId) throw Error('Upload response does not match the expected private channel; inspect Studio before retrying');
  if(canRead) {
    const rb=await yt.videos.list({id:[uploaded.data.id],part:['snippet','status']});
    if(rb.data.items?.[0]?.status?.privacyStatus!=='private'||rb.data.items[0].snippet.channelId!==channel.id) throw Error('Private upload readback failed');
  }
  console.log(`Private pilot: https://youtu.be/${uploaded.data.id}`);
} else if(mode==='upload-short') {
  // Legal English Shorts: no review-note pairing; render must be voiced and match the current dictionary-checked script.
  const id=process.env.SHORT;
  if(!id||!/^[a-z0-9-]+$/.test(id)) throw Error('Invalid short id');
  const dir=`out/shorts/${id}`, meta=json(`${dir}/metadata.json`);
  const scriptPath=['shorts/queue','shorts/published'].map(d=>`${d}/${id}.json`).find(p=>fs.existsSync(p));
  if(!scriptPath) throw Error(`Script for ${id} not found`);
  const hash=crypto.createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(scriptPath,'utf8')))).digest('hex');
  // The scheduled publisher posts public; manual pilot uploads stay private.
  const privacy=process.env.PRIVACY==='public'?'public':'private';
  if(!meta.voiced||meta.shortId!==id||hash!==meta.shortHash) throw Error('Render must have voice and match the current dictionary-checked script');
  if(!fs.existsSync(`${dir}/video.mp4`)) throw Error('Rendered video missing');
  const marker=`[legal-short:${id}:${hash.slice(0,16)}]`;
  let receipts=fs.existsSync('state/youtube.json')?json('state/youtube.json'):{};
  if(receipts[marker]) throw Error(`Already uploaded: ${receipts[marker].videoId}`);
  const uploaded=await yt.videos.insert({part:['snippet','status'],requestBody:{snippet:{title:meta.title,description:`${meta.description}\n\n${marker}`,tags:meta.tags,categoryId:'27',defaultLanguage:'ja'},status:{privacyStatus:privacy,selfDeclaredMadeForKids:false}},media:{body:fs.createReadStream(`${dir}/video.mp4`)}});
  if(!uploaded.data.id) throw Error('No upload ID: inspect Studio before any retry');
  receipts[marker]={videoId:uploaded.data.id,channelId:uploaded.data.snippet?.channelId,privacyStatus:uploaded.data.status?.privacyStatus,kind:'legal-short',shortId:id,readbackMode:canRead?'videos.list':'insert-response (verify in Studio)',uploadedAt:new Date().toISOString()};
  save('state/youtube.json',receipts);
  save('out/youtube-upload.json',receipts[marker]);
  if(uploaded.data.status?.privacyStatus!==privacy||uploaded.data.snippet?.channelId!==settings.channelId) throw Error('Upload response does not match the expected channel/privacy; inspect Studio before retrying');
  console.log(`${privacy} short: https://youtu.be/${uploaded.data.id}`);
} else if(mode==='publish') {
  if(!videoId||!/^[\w-]{11}$/.test(videoId)) throw Error('Valid existing video ID required');
  const rb=await yt.videos.list({id:[videoId],part:['snippet','status']});
  const video=rb.data.items?.[0];
  if(!video||video.snippet.channelId!==channel.id||!/\[(judicial-memory|legal-short):/.test(video.snippet.description??'')) throw Error('Not a judicial lesson on this channel');
  await yt.videos.update({part:['status'],requestBody:{id:videoId,status:{privacyStatus:'public',selfDeclaredMadeForKids:false}}});
  const after=await yt.videos.list({id:[videoId],part:['status']});
  if(after.data.items?.[0]?.status?.privacyStatus!=='public') throw Error('Publish readback failed');
  save('out/youtube-publish.json',{videoId,channelId:channel.id,privacyStatus:'public'});
} else throw Error('Unknown mode');

} catch (error) {
  // Do not print Gaxios request config: refresh requests contain credentials.
  const apiError=error.response?.data?.error;
  const detail=error.config
    ? (typeof apiError==='string'?apiError:apiError?.message)||'API request failed'
    : error.message;
  console.error(`YouTube operation failed (${error.response?.status??error.code??'unknown'}): ${detail}`);
  process.exitCode=1;
}
