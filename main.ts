import '@std/dotenv/load';
import { assertExists } from '@std/assert';
// import { extname } from '@std/path';
// import { typeByExtension } from '@std/media-types';
import { delay } from '@std/async';
import { Hono } from 'hono';
import { serveStatic } from 'hono/deno';
import { cleanDirectory, getDirectoryStructureString, getFilesInDirectory } from './utils.ts';
import { downloadVideo, ensureYtDlp } from './yt-dlp.ts';
import { getLiveStream } from './youtube.ts';
import * as hub from '@huggingface/hub';

const YOUTUBE_CHANNEL_ID = Deno.env.get('YOUTUBE_CHANNEL_ID')!;
assertExists(YOUTUBE_CHANNEL_ID);
const HUGGINGFACE_ACCESS_TOKEN = Deno.env.get('HUGGINGFACE_ACCESS_TOKEN')!;
assertExists(HUGGINGFACE_ACCESS_TOKEN);
const REPO_ID = Deno.env.get('REPO_ID')!;
assertExists(REPO_ID);
const COOKIES = Deno.env.get('COOKIES');
COOKIES && Deno.writeTextFileSync('./cookies.txt', COOKIES, { create: true });

const app = new Hono();

// app.use(
//   '/*',
//   serveStatic({
//     root: './',
//     onFound: (path, c) => {
//       const type = typeByExtension(extname(path));
//       type && c.header('content-type', type);
//     },
//   }),
// );

app.use('/tmp', serveStatic({ path: './tmp' }));
app.use('/output.txt', serveStatic({ path: './output.txt' }));
app.use('/error.txt', serveStatic({ path: './error.txt' }));

app.get('/', async (c) => {
  return c.text(await getDirectoryStructureString('.', '', Infinity));
});

app.get('/test', (c) => {
  const key = c.req.query('key');
  if (key !== HUGGINGFACE_ACCESS_TOKEN) return c.text('\u{1F480}');
  const id = c.req.query('id');
  if (!id) return c.text('id required');
  console.info('testing...');
  main(id);
  return c.text('testing...');
});

Deno.serve({ port: 7860 }, app.fetch);

async function main(testVideoId?: string) {
  await ensureYtDlp();
  await cleanDirectory('./tmp');

  const videoId = testVideoId || await getLiveStream(YOUTUBE_CHANNEL_ID);
  if (!videoId) {
    console.log('No live stream found.');
    return;
  }
  console.log(`videoId: ${videoId}`);
  if (!await downloadVideo({ videoId, path: './tmp', cookiesFileName: COOKIES && './cookies.txt' })) return;

  const repo: hub.RepoDesignation = { type: 'dataset', name: REPO_ID };
  const files = await getFilesInDirectory('./tmp');
  const name = files[0];
  console.log(`file: ${name}`);
  const path = `./tmp/${name}`;

  console.info(`Uploading ${name}...`);
  const result = await hub.uploadFiles({
    repo,
    accessToken: HUGGINGFACE_ACCESS_TOKEN,
    files: [
      {
        path: name,
        content: new Blob([Deno.readFileSync(path)]),
      },
    ],
  });
  console.info(result);
}

while (true) {
  try {
    await main();
  } catch (e) {
    console.error(e);
  }
  await delay(5 * 1000 * 60);
}
