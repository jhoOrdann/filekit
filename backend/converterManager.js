const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let pluginsDir = null;

function setPluginsDir(dir) {
  pluginsDir = dir;
}

function getFfmpegPath() {
  if (pluginsDir) {
    const candidate = path.join(pluginsDir, 'ffmpeg.exe');
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'ffmpeg';
}

function timeToSeconds(t) {
  const m = t.match(/(\d+):(\d+):(\d+\.?\d*)/);
  if (!m) return 0;
  const h = parseFloat(m[1]);
  const min = parseFloat(m[2]);
  const s = parseFloat(m[3]);
  return h * 3600 + min * 60 + s;
}

async function convertFile(event, { type, input, outputDir, format }) {
  if (!input || !fs.existsSync(input)) {
    throw new Error('Arquivo de origem não encontrado.');
  }

  const ext = path.extname(input).toLowerCase().replace('.', '');
  const baseName = path.basename(input, path.extname(input));

  const outDir = outputDir && outputDir.trim()
    ? outputDir
    : path.dirname(input);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targetExt = (format || '').replace('.', '').toLowerCase();
  const output = path.join(outDir, `${baseName}_conv.${targetExt || ext}`);

  if (type === 'doc') {
    return convertDocument(event, input, outDir, targetExt);
  } else {
    return convertWithFfmpeg(event, type, input, output);
  }
}

function convertWithFfmpeg(event, type, input, output) {
  const ffmpeg = getFfmpegPath();
  if (!ffmpeg) {
    throw new Error('ffmpeg não encontrado. Coloque ffmpeg.exe na pasta de plugins.');
  }

  const args = ['-y', '-i', input];

  args.push(output);

  return new Promise((resolve, reject) => {
    let totalDuration = 0;
    const win = event.sender;

    const child = spawn(ffmpeg, args);

    child.stderr.on('data', chunk => {
      const line = chunk.toString();

      win.send('convert-log', { input, text: line });

      const durMatch = line.match(/Duration:\s(\d+:\d+:\d+\.\d+)/);
      if (durMatch) {
        totalDuration = timeToSeconds(durMatch[1]);
      }

      const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
      if (timeMatch && totalDuration > 0) {
        const current = timeToSeconds(timeMatch[1]);
        const percent = Math.min(100, (current / totalDuration) * 100);
        win.send('convert-progress', {
          input,
          percent
        });
      }
    });

    child.on('error', err => reject(err));
    child.on('close', code => {
      if (code === 0) {
        win.send('convert-progress', { input, percent: 100 });
        resolve({ output });
      } else {
        reject(new Error(`FFmpeg saiu com código ${code}`));
      }
    });
  });
}

// PRECISA DO LIBREOFFICE
function convertDocument(event, input, outDir, targetExt) {
  const outExt = targetExt || 'pdf';
  const soffice = 'soffice';

  const args = [
    '--headless',
    '--convert-to', outExt,
    '--outdir', outDir,
    input
  ];

  const win = event.sender;

  return new Promise((resolve, reject) => {
    const child = spawn(soffice, args);

    child.stderr.on('data', chunk => {
      win.send('convert-log', {
        input,
        text: chunk.toString()
      });
    });

    child.on('error', (err) => {
      reject(new Error('Erro ao chamar LibreOffice (soffice). Verifique se ele está instalado.'));
    });

    child.on('close', code => {
      if (code === 0) {
        const base = path.basename(input, path.extname(input));
        const output = path.join(outDir, `${base}.${outExt}`);
        resolve({ output });
      } else {
        reject(new Error(`Conversor de documentos saiu com código ${code}`));
      }
    });
  });
}

module.exports = {
  convertFile,
  setPluginsDir
};