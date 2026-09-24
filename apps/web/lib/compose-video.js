import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

function bytesToText(bytes) {
  return new TextDecoder().decode(bytes).trim();
}

// Export one playback-ready MP4. Each source is normalized before joining so
// mixed phone resolutions, frame rates, and clips without audio can be joined.
export async function composeVideo(clips, onStatus = () => {}) {
  if (!clips.length) throw new Error('Add at least one video clip.');
  const ffmpeg = new FFmpeg();
  try {
    onStatus('Loading the video engine…');
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    let targetWidth = 1080;
    let targetHeight = 1920;
    const segments = [];

    for (let index = 0; index < clips.length; index += 1) {
      onStatus(`Preparing clip ${index + 1} of ${clips.length}…`);
      const input = `source-${index}.${clips[index].name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'mp4'}`;
      const segment = `segment-${index}.mp4`;
      await ffmpeg.writeFile(input, await fetchFile(clips[index]));

      if (index === 0) {
        await ffmpeg.ffprobe(['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', input, '-o', 'video-info.txt']);
        const [width, height] = bytesToText(await ffmpeg.readFile('video-info.txt')).split('x').map(Number);
        if (width > height) [targetWidth, targetHeight] = [1920, 1080];
        await ffmpeg.deleteFile('video-info.txt');
      }

      await ffmpeg.ffprobe(['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', input, '-o', 'audio-info.txt']);
      const hasAudio = Boolean(bytesToText(await ffmpeg.readFile('audio-info.txt')));
      await ffmpeg.deleteFile('audio-info.txt');

      const fit = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30`;
      const args = ['-i', input];
      if (!hasAudio) args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
      args.push('-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0', '-vf', fit,
        '-c:v', 'libx264', '-preset', 'superfast', '-crf', '22', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
      if (!hasAudio) args.push('-shortest');
      args.push(segment);
      if (await ffmpeg.exec(args) !== 0) throw new Error(`Could not process clip ${index + 1}. Try a shorter MP4 video.`);
      segments.push(segment);
      await ffmpeg.deleteFile(input);
    }

    onStatus('Joining clips and making the cover…');
    await ffmpeg.writeFile('segments.txt', new TextEncoder().encode(segments.map((segment) => `file '${segment}'`).join('\n')));
    if (await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'segments.txt', '-c', 'copy', '-movflags', '+faststart', 'joined.mp4']) !== 0) {
      throw new Error('Could not join the clips. Try shorter MP4 videos.');
    }
    if (await ffmpeg.exec(['-ss', '0.1', '-i', 'joined.mp4', '-frames:v', '1', '-q:v', '3', 'cover.jpg']) !== 0) {
      throw new Error('Could not create a video cover. Try a clip longer than one second.');
    }

    const [videoData, coverData] = await Promise.all([ffmpeg.readFile('joined.mp4'), ffmpeg.readFile('cover.jpg')]);
    return {
      video: new File([videoData], 'godyrect-post.mp4', { type: 'video/mp4' }),
      cover: new File([coverData], 'godyrect-cover.jpg', { type: 'image/jpeg' }),
    };
  } finally {
    ffmpeg.terminate();
  }
}
