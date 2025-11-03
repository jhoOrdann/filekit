const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

let mainWindow = null;
let pluginsDir = null;

function setMainWindow(win) {
  mainWindow = win;
}

function setPluginsDir(dir) {
  pluginsDir = dir;
}

function detectPlatformFromUrl(url = '') {
  const u = (url || '').toLowerCase();

  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('kick.com')) return 'kick';
  if (u.includes('facebook.com')) return 'facebook';
  if (u.includes('x.com') || u.includes('twitter.com')) return 'twitter';

  return 'desconhecido';
}

function getDefaultDir(type) {
  return type === 'audio'
    ? path.join(os.homedir(), 'Music')
    : path.join(os.homedir(), 'Videos');
}

function getYtDlpPath() {
  if (pluginsDir) {
    const pluginYt = path.join(pluginsDir, 'yt-dlp.exe');
    if (fs.existsSync(pluginYt)) return pluginYt;
  }
  const localProj = path.join(__dirname, '..', 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localProj)) return localProj;
  return 'yt-dlp';
}

function getFfmpegPath() {
  if (pluginsDir) {
    const pluginFfmpeg = path.join(pluginsDir, 'ffmpeg.exe');
    if (fs.existsSync(pluginFfmpeg)) return pluginFfmpeg;
  }
  const localProj = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(localProj)) return localProj;
  return null;
}

function buildVideoFormat({ quality, fileType, codec, hasFfmpeg }) {
  const q = quality || 'best';

  let heightFilter = '';
  if (q === '1080p') heightFilter = '[height<=1080]';
  else if (q === '720p') heightFilter = '[height<=720]';
  else if (q === '480p') heightFilter = '[height<=480]';

  if (fileType === 'mp4') {
    const videoPart =
      codec === 'h264' || !codec
        ? `bestvideo[ext=mp4][vcodec^=avc1]${heightFilter}`
        : `bestvideo[ext=mp4]${heightFilter}`;

    const audioPart = `bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio`;

    return `${videoPart}+${audioPart}/best[ext=mp4]${heightFilter}/best`;
  }

  if (fileType === 'webm' || codec === 'vp9') {
    const videoPart = `bestvideo[ext=webm]${heightFilter}`;
    const audioPart = `bestaudio[ext=webm]/bestaudio[acodec=opus]/bestaudio`;
    return `${videoPart}+${audioPart}/best[ext=webm]${heightFilter}/best`;
  }

  if (hasFfmpeg) {
    return heightFilter
      ? `bestvideo${heightFilter}+bestaudio/best`
      : 'bestvideo+bestaudio/best';
  } else {
    return heightFilter ? `best${heightFilter}` : 'best';
  }
}

async function handleDownloadRequest({
  type,
  url,
  platform,
  quality,
  codec,
  fileType,
  fileName,
  outputDir
}) {
  if (!url) throw new Error('URL vazia');

  const finalPlatform =
    platform && platform !== 'auto' ? platform : detectPlatformFromUrl(url);

  const outDir =
    outputDir && outputDir.trim().length ? outputDir : getDefaultDir(type);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const ytDlp = getYtDlpPath();
  const ffmpegPath = getFfmpegPath();
  const hasFfmpeg = !!ffmpegPath;

  // escolher formato base
  let format = 'best';
  if (type === 'video') {
    format = buildVideoFormat({ quality, fileType, codec, hasFfmpeg });
  } else {
    format = 'bestaudio/best';
  }

  let safeName = '';
  if (fileName && fileName.trim()) {
    safeName = fileName.trim().replace(/[\\\/:*?"<>|]/g, '_');
  }

  let outputTemplate;
  if (!safeName) {
    outputTemplate = path.join(outDir, '%(title)s.%(ext)s');
  } else {
    if (type === 'audio') {
      if (fileType && fileType !== 'auto') {
        outputTemplate = path.join(outDir, `${safeName}.${fileType}`);
      } else {
        outputTemplate = path.join(outDir, `${safeName}.%(ext)s`);
      }
    } else {
      if (fileType && fileType !== 'auto' && hasFfmpeg) {
        outputTemplate = path.join(outDir, `${safeName}.${fileType}`);
      } else {
        outputTemplate = path.join(outDir, `${safeName}.%(ext)s`);
      }
    }
  }

  const args = ['--newline', '-o', outputTemplate, '-f', format];

  if (hasFfmpeg) {
    args.push('--ffmpeg-location', ffmpegPath);
  }

  // ⚠️ checagens antes de baixar
  if (
    type === 'video' &&
    !hasFfmpeg &&
    fileType &&
    ['mp4', 'mkv', 'webm'].includes(fileType)
  ) {
    throw new Error(
      `Para salvar vídeos em ${fileType.toUpperCase()}, coloque o ffmpeg.exe na pasta de plugins.`
    );
  }

  if (type === 'audio' && !hasFfmpeg && fileType && fileType !== 'mp3') {
    throw new Error(
      `Para converter áudios para ${fileType.toUpperCase()}, coloque o ffmpeg.exe na pasta de plugins.`
    );
  }

  // áudio: extrair e converter
  if (type === 'audio') {
    args.push('--extract-audio');

    if (fileType && fileType !== 'auto') {
      args.push('--audio-format', fileType);
    } else {
      args.push('--audio-format', 'mp3');
    }

    if (quality === '320k') {
      args.push('--audio-quality', '0');
    } else if (quality === '192k') {
      args.push('--audio-quality', '4');
    } else if (quality === '128k') {
      args.push('--audio-quality', '5');
    } else {
      args.push('--audio-quality', '0');
    }
  } else if (type === 'video') {
    // se o user pediu mp4 e temos ffmpeg, força saída em mp4
    if (fileType && fileType !== 'auto' && hasFfmpeg) {
      args.push('--merge-output-format', fileType);
    }
  }

  // TikTok headers
  if (finalPlatform === 'tiktok') {
    args.push('--referer', 'https://www.tiktok.com/');
    args.push(
      '--add-header',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    );
    if (pluginsDir) {
      const tiktokCookies = path.join(pluginsDir, 'tiktok_cookies.txt');
      if (fs.existsSync(tiktokCookies)) {
        args.push('--cookies', tiktokCookies);
      }
    }
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    const child = spawn(ytDlp, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let lastFile = null;

    const handleLine = (line) => {
      if (!line.trim()) return;

      const m = line.match(/^\[download\]\s+([0-9.]+)%/);
      if (m && mainWindow) {
        mainWindow.webContents.send('download-progress', {
          url,
          percent: parseFloat(m[1]),
          engine: 'yt-dlp'
        });
      }

      const dest = line.match(/Destination:\s(.+)$/);
      if (dest) {
        lastFile = dest[1].trim();
      }

      if (mainWindow) {
        mainWindow.webContents.send('download-log', {
          url,
          text: line
        });
      }
    };

    child.stdout.on('data', (chunk) => {
      chunk.toString().split(/\r?\n/).forEach(handleLine);
    });
    child.stderr.on('data', (chunk) => {
      chunk.toString().split(/\r?\n/).forEach(handleLine);
    });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, file: lastFile, engine: 'yt-dlp' });
      } else {
        reject(new Error('yt-dlp saiu com código ' + code));
      }
    });
  });
}

module.exports = {
  detectPlatformFromUrl,
  handleDownloadRequest,
  setMainWindow,
  setPluginsDir
};