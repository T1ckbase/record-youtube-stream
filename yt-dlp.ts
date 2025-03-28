import { exists } from '@std/fs';

export async function ensureYtDlp() {
  if (await exists('yt-dlp', { isFile: true })) return;
  console.info('Downloading yt-dlp...');
  const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${Deno.build.os === 'windows' ? '.exe' : ''}`);
  if (!res.ok) throw Error(`Failed to download yt-dlp: ${res.status} ${res.statusText}`);
  const data = await res.arrayBuffer();
  await Deno.writeFile('yt-dlp', new Uint8Array(data));
}

export async function downloadVideo(videoId: string, path?: string) {
  const args = ['--live-from-start', videoId, '-f', 'bv+ba/b'];
  path && args.push('--paths', path);
  const command = new Deno.Command('yt-dlp', {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });
  const child = command.spawn();
  console.info(`Downloading ${videoId}...`);

  child.stdout.pipeTo(Deno.openSync('output.txt', { write: true, create: true }).writable);
  child.stderr.pipeTo(Deno.openSync('error.txt', { write: true, create: true }).writable);

  const status = await child.status;
  status.success && console.log(`Downloaded ${videoId}`);
  !status.success && console.error(`Failed to download ${videoId} (${status.code})`);
  return status.success;
}
