import { exists } from '@std/fs';

export async function ensureYtDlp() {
  if (await exists('./yt-dlp', { isFile: true })) return;
  console.info('Downloading yt-dlp...');
  const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${Deno.build.os === 'windows' ? '.exe' : '_linux'}`);
  if (!res.ok) throw Error(`Failed to download yt-dlp: ${res.status} ${res.statusText}`);
  const data = await res.arrayBuffer();
  await Deno.writeFile('./yt-dlp', new Uint8Array(data));
  Deno.build.os === 'linux' && await Deno.chmod('./yt-dlp', 0o777);
}

export async function downloadVideo({ videoId, path, cookiesFileName }: { videoId: string; path?: string; cookiesFileName?: string }) {
  const args = ['--live-from-start', videoId, '-f', 'bv+ba/b'];
  path && args.push('--paths', path);
  cookiesFileName && args.push('--cookies', cookiesFileName);
  const command = new Deno.Command('./yt-dlp', {
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
