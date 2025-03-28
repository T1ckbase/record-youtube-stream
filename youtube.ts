export async function getLiveStream(channelId: string): Promise<string | null> {
  const response = await fetch(`https://www.youtube.com/${channelId}/videos`);
  const html = await response.text();
  const match = html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/);
  if (!match) throw Error('Failed to parse ytInitialData');
  const data = JSON.parse(match[1]);
  try {
    const videoId: string = data.header.pageHeaderRenderer.content.pageHeaderViewModel.image.decoratedAvatarViewModel.rendererContext.commandContext.onTap.innertubeCommand.watchEndpoint.videoId;
    return videoId;
  } catch (_) {
    return null;
  }
}
