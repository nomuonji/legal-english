import fs from 'node:fs';
import crypto from 'node:crypto';
import {google} from 'googleapis';
const {YOUTUBE_CLIENT_ID:clientId,YOUTUBE_CLIENT_SECRET:clientSecret,YOUTUBE_REFRESH_TOKEN:refreshToken,MODE:mode,LESSON:lesson,VIDEO_ID:videoId}=process.env;
if(!clientId||!clientSecret||!refreshToken) throw Error('Missing existing Legal English YouTube credentials');
const auth=new google.auth.OAuth2(clientId,clientSecret);
auth.setCredentials({refresh_token:refreshToken});
const yt=google.youtube({version:'v3',auth});
const json=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,d)=>{fs.mkdirSync(p.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
const result=await yt.channels.list({part:['snippet','brandingSettings','contentDetails'],mine:true});
if(result.data.items?.length!==1) throw Error('Expected one authenticated channel');
const channel=result.data.items[0];
save('out/youtube-channel.json',{id:channel.id,title:channel.snippet.title,description:channel.snippet.description});
console.log(`Authenticated channel: ${channel.snippet.title} (${channel.id})`);
if(mode==='channel-info') process.exit(0);
if(mode==='update-description') {
  const before=channel.brandingSettings??{};
  save('out/youtube-branding-before.json',before);
  const settings=json('channel.json');
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
  const current=json(`lessons/${lesson}.json`);
  const hash=crypto.createHash('sha256').update(JSON.stringify(current)).digest('hex');
  if(!meta.voiced||meta.lessonId!==lesson||hash!==meta.lessonHash) throw Error('Render must have voice and match current lesson');
  const marker=`[judicial-memory:${lesson}:${hash.slice(0,16)}]`;
  let receipts=fs.existsSync('state/youtube.json')?json('state/youtube.json'):{};
  if(receipts[marker]) throw Error(`Already uploaded: ${receipts[marker].videoId}`);
  // Read the account's actual uploads, not search-indexed/public-only videos.
  const uploads=await yt.playlistItems.list({part:['snippet'],playlistId:channel.contentDetails.relatedPlaylists.uploads,maxResults:50});
  const duplicate=uploads.data.items?.find(v=>v.snippet?.description?.includes(marker));
  if(duplicate) {
    receipts[marker]={videoId:duplicate.snippet.resourceId.videoId,channelId:channel.id,recovered:true};
    save('state/youtube.json',receipts);
    throw Error(`Upload already exists: ${duplicate.snippet.resourceId.videoId}`);
  }
  const uploaded=await yt.videos.insert({part:['snippet','status'],requestBody:{snippet:{title:meta.title,description:`${meta.description}\n\n${marker}`,tags:meta.tags,categoryId:'27',defaultLanguage:'ja'},status:{privacyStatus:'private',selfDeclaredMadeForKids:false}},media:{body:fs.createReadStream(`${dir}/video.mp4`)}});
  if(!uploaded.data.id) throw Error('No upload ID: inspect Studio before any retry');
  receipts[marker]={videoId:uploaded.data.id,channelId:channel.id,privacyStatus:'private',uploadedAt:new Date().toISOString()};
  save('state/youtube.json',receipts);
  save('out/youtube-upload.json',receipts[marker]);
  const rb=await yt.videos.list({id:[uploaded.data.id],part:['snippet','status']});
  if(rb.data.items?.[0]?.status?.privacyStatus!=='private'||rb.data.items[0].snippet.channelId!==channel.id) throw Error('Private upload readback failed');
  console.log(`Private pilot: https://youtu.be/${uploaded.data.id}`);
} else if(mode==='publish') {
  if(!videoId||!/^[\w-]{11}$/.test(videoId)) throw Error('Valid existing video ID required');
  const rb=await yt.videos.list({id:[videoId],part:['snippet','status']});
  const video=rb.data.items?.[0];
  if(!video||video.snippet.channelId!==channel.id||!video.snippet.description?.includes('[judicial-memory:')) throw Error('Not a judicial lesson on this channel');
  await yt.videos.update({part:['status'],requestBody:{id:videoId,status:{privacyStatus:'public',selfDeclaredMadeForKids:false}}});
  const after=await yt.videos.list({id:[videoId],part:['status']});
  if(after.data.items?.[0]?.status?.privacyStatus!=='public') throw Error('Publish readback failed');
  save('out/youtube-publish.json',{videoId,channelId:channel.id,privacyStatus:'public'});
} else throw Error('Unknown mode');
