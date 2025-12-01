const tabs = document.querySelectorAll('.tabs button');
const sections = document.querySelectorAll('.tab');
let convSelectedFile = null;
let convOutputDir = null;

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabs.forEach((b) => b.classList.remove('active'));
    sections.forEach((s) => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (tab === 'settings') {
      loadHistory();
    }
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electronAPI.getSettings();
  document.getElementById('cfg-startup').checked = settings.startOnBoot;
  document.getElementById('cfg-tray').checked = settings.keepInTray;
  document.getElementById('cfg-version').textContent = settings.version;

  const home = require('os').homedir ? require('os').homedir() : '';
  document.getElementById('video-output').value = 'Vídeos padrão do sistema';
  document.getElementById('audio-output').value = 'Músicas padrão do sistema';

  window.addEventListener('DOMContentLoaded', async () => {
    const settings = await window.electronAPI.getSettings();
    document.getElementById('cfg-startup').checked = settings.startOnBoot;
    document.getElementById('cfg-tray').checked = settings.keepInTray;
    document.getElementById('cfg-version').textContent = settings.version;

    // Verificar plugins
    const plugins = await window.electronAPI.checkPlugins();
    const warning = document.getElementById('plugin-warning');
    if (!plugins.yt || !plugins.ff) {
      warning.classList.remove('hidden');
    }

    document.getElementById('btn-open-plugins').addEventListener('click', () => {
      window.electronAPI.openPluginsFolder();
    });

    document.getElementById('btn-get-plugins').addEventListener('click', () => {
      window.electronAPI.openExternal('https://github.com/yt-dlp/yt-dlp/releases');
    });
  });
});

// VÍDEO
const videoUrl = document.getElementById('video-url');
const videoPlatform = document.getElementById('video-platform');
const videoQuality = document.getElementById('video-quality');
const videoCodec = document.getElementById('video-codec');
const videoOutput = document.getElementById('video-output');
const videoChoose = document.getElementById('video-choose');
const videoDownload = document.getElementById('video-download');
const videoStatus = document.getElementById('video-status');
const videoFileName = document.getElementById('video-filename').value.trim();

videoUrl.addEventListener('blur', async () => {
  if (videoUrl.value.trim().length > 0) {
    const p = await window.electronAPI.detectPlatform(videoUrl.value.trim());
    if (p && p !== 'desconhecido') {
      videoPlatform.value = p;
    }
  }
});

videoChoose.addEventListener('click', async () => {
  const folder = await window.electronAPI.chooseFolder();
  if (folder) {
    videoOutput.value = folder;
  }
});

videoDownload.addEventListener('click', async () => {
  videoStatus.innerHTML = `<p class="statusNeutro"><i class="ri-loader-2-fill spin"></i> Iniciando download...</p>`;
  const payload = {
    type: 'video',
    url: videoUrl.value.trim(),
    platform: videoPlatform.value,
    quality: videoQuality.value,
    codec: videoCodec.value,
    fileType: document.getElementById('video-filetype').value,
    fileName: document.getElementById('video-filename').value.trim(),
    outputDir: videoOutput.value.includes('padrão') ? '' : videoOutput.value
  };

  const res = await window.electronAPI.startDownload(payload);
  if (res.ok) {
    videoStatus.innerHTML = `<p class="statusConcluido"><i class="ri-checkbox-circle-fill"></i> Download concluído.</p>`;
    await window.electronAPI.addDownloadLog({
      name: payload.fileName || (res.file ? res.file.split('\\').pop() : 'Vídeo'),
      path: res.file || '',
      platform: payload.platform || 'auto',
      type: 'video',
      quality: payload.quality || 'best',
      status: 'ok'
    });
    loadHistory && loadHistory();
  } else {
    videoStatus.innerHTML = `<p class="statusErro"><i class="ri-alert-fill"></i> Erro ao continuar.</p>`;
    showErrorModal('Erro ao baixar vídeo', res.error, res.error.includes('ffmpeg.exe'));
    await window.electronAPI.addDownloadLog({
      name: payload.fileName || 'Vídeo (falhou)',
      path: '',
      platform: payload.platform || 'auto',
      type: 'video',
      quality: payload.quality || 'best',
      status: 'erro',
      error: res.error
    });
    loadHistory && loadHistory();
  }
});

// ÁUDIO
const audioUrl = document.getElementById('audio-url');
const audioPlatform = document.getElementById('audio-platform');
const audioQuality = document.getElementById('audio-quality');
const audioOutput = document.getElementById('audio-output');
const audioChoose = document.getElementById('audio-choose');
const audioDownload = document.getElementById('audio-download');
const audioStatus = document.getElementById('audio-status');
const audioFileName = document.getElementById('audio-filename').value.trim();

audioUrl.addEventListener('blur', async () => {
  if (audioUrl.value.trim().length > 0) {
    const p = await window.electronAPI.detectPlatform(audioUrl.value.trim());
    if (p && p !== 'desconhecido') {
      audioPlatform.value = p;
    }
  }
});

audioChoose.addEventListener('click', async () => {
  const folder = await window.electronAPI.chooseFolder();
  if (folder) {
    audioOutput.value = folder;
  }
});

audioDownload.addEventListener('click', async () => {
  audioStatus.innerHTML = `<p class="statusNeutro"><i class="ri-loader-2-fill spin"></i> Iniciando download...</p>`;
  const payload = {
    type: 'audio',
    url: audioUrl.value.trim(),
    platform: audioPlatform.value,
    quality: audioQuality.value,
    codec: '',
    fileType: document.getElementById('audio-filetype').value,
    fileName: document.getElementById('audio-filename').value.trim(),
    outputDir: audioOutput.value.includes('padrão') ? '' : audioOutput.value
  };

  const res = await window.electronAPI.startDownload(payload);
  if (res.ok) {
    audioStatus.innerHTML = `<p class="statusConcluido"><i class="ri-checkbox-circle-fill"></i> Download concluído.</p>`;
    await window.electronAPI.addDownloadLog({
      name: payload.fileName || (res.file ? res.file.split('\\').pop() : 'Áudio'),
      path: res.file || '',
      platform: payload.platform || 'auto',
      type: 'audio',
      quality: payload.quality || 'best',
      status: 'ok'
    });
    loadHistory && loadHistory();
  } else {
    audioStatus.innerHTML = `<p class="statusErro"><i class="ri-alert-fill"></i> Erro ao continuar.</p>`;
    showErrorModal('Erro ao baixar áudio', res.error, res.error.includes('ffmpeg.exe'));
    await window.electronAPI.addDownloadLog({
      name: payload.fileName || 'Áudio (falhou)',
      path: '',
      platform: payload.platform || 'auto',
      type: 'audio',
      quality: payload.quality || 'best',
      status: 'erro',
      error: res.error
    });
    loadHistory && loadHistory();
  }
});

window.electronAPI.onDownloadProgress((data) => {
  const { url, percent, engine } = data;
  // vídeo
  if (document.getElementById('video-url').value.trim() === url) {
    document.getElementById('video-status').innerHTML =
      `<p class="statusBaixando"><i class="ri-loader-2-fill spin"></i> Baixando... ${percent.toFixed(1)}% (${engine})</p>`;
  }
  // áudio
  if (document.getElementById('audio-url').value.trim() === url) {
    document.getElementById('audio-status').innerHTML =
      `<p class="statusBaixando"><i class="ri-loader-2-fill spin"></i> Baixando... ${percent.toFixed(1)}% (${engine})</p>`;
  }
});

// CONFIGURAÇÕES
document.getElementById('cfg-startup').addEventListener('change', async (e) => {
  await window.electronAPI.setSettings({ startOnBoot: e.target.checked });
});
document.getElementById('cfg-tray').addEventListener('change', async (e) => {
  await window.electronAPI.setSettings({ keepInTray: e.target.checked });
});
document.getElementById('open-plugins').addEventListener('click', async () => {
  const res = await window.electronAPI.openPluginsFolder();
  if (!res.ok) {
    alert('Não foi possível abrir a pasta de plugins: ' + (res.error || 'desconhecido'));
  }
});

const updateModal   = document.getElementById('update-modal');
const updateTitle   = document.getElementById('update-title');
const updateText    = document.getElementById('update-text');
const updateBar     = document.getElementById('update-progress');
const updateFill    = document.getElementById('update-progress-fill');
const btnUpdateInst = document.getElementById('update-install');
const btnUpdateClose= document.getElementById('update-close');

if (btnUpdateClose) {
  btnUpdateClose.addEventListener('click', () => {
    updateModal.classList.add('hidden');
  });
}

if (btnUpdateInst) {
  btnUpdateInst.addEventListener('click', () => {
    window.electronAPI.installUpdateNow(); // aquele IPC que chama quitAndInstall
  });
}

window.electronAPI?.onUpdateStatus?.((_e, payload) => {
  const { state, progress, error } = payload || {};
  updateModal.classList.remove('hidden');
  btnUpdateClose.classList.add('hidden');
  btnUpdateInst.classList.add('hidden');
  updateBar.classList.add('hidden');

  if (state === 'checking') {
    updateTitle.textContent = 'Verificando atualizações…';
    updateText.textContent  = 'Aguarde só um instante.';
  }
  else if (state === 'available') {
    updateTitle.textContent = 'Nova versão disponível!';
    updateText.textContent  = 'Baixando atualização…';
    updateBar.classList.remove('hidden');
  }
  else if (state === 'downloading') {
    updateTitle.textContent = 'Baixando atualização…';
    updateBar.classList.remove('hidden');
    if (progress && typeof progress.percent === 'number') {
      updateFill.style.width = progress.percent.toFixed(0) + '%';
      updateText.textContent = `Progresso: ${progress.percent.toFixed(0)}%`;
    }
  }
  else if (state === 'downloaded') {
    updateTitle.textContent = 'Atualização pronta para instalar';
    updateText.textContent  = 'Clique em "Instalar agora" para reiniciar o Filekit.';
    btnUpdateInst.classList.remove('hidden');
    btnUpdateClose.classList.remove('hidden');
  }
  else if (state === 'no-update') {
    updateTitle.textContent = 'Nenhuma atualização encontrada';
    updateText.textContent  = 'Você já está usando a versão mais recente.';
    btnUpdateClose.classList.remove('hidden');
  }
  else if (state === 'error') {
    updateTitle.textContent = 'Erro ao atualizar';
    updateText.textContent  = error || 'Não foi possível verificar ou baixar a atualização.';
    updateBar.classList.add('hidden');
    btnUpdateInst.classList.add('hidden');
    btnUpdateClose.classList.remove('hidden');
  }
});

// Serviços externos (PLUGLINS BUILT-IN)
const btnSpotify = document.getElementById('btn-audio-spotify');
const btnDeezer = document.getElementById('btn-audio-deezer');
const btnKickVodDownload = document.getElementById('btn-kick-voddownload');
const btnDonate = document.getElementById('btn-donate');
const btnTiktokDownloader = document.getElementById('btn-ssstik');

if (btnSpotify) {
  btnSpotify.addEventListener('click', () => {
    window.electronAPI.openWebPopup('https://spotidownloader.com/pt6');
  });
}
if (btnDeezer) {
  btnDeezer.addEventListener('click', () => {
    window.electronAPI.openWebPopup('https://deezmate.com/en');
  });
}
if (btnKickVodDownload) {
  btnKickVodDownload.addEventListener('click', () => {
    window.electronAPI.openWebPopup('https://kick-video.download');
  });
}
if (btnTiktokDownloader) {
  btnTiktokDownloader.addEventListener('click', () => {
    window.electronAPI.openWebPopup('https://ssstik.io/pt');
  });
}

if (btnDonate) {
  btnDonate.addEventListener('click', () => {
    window.electronAPI.openWebPopup('https://livepix.gg/jhordan');
  });
}

// ERRO (MODAL)
function showErrorModal(title, message, showPluginsButton = false) {
  const modal = document.getElementById('error-modal');
  const titleEl = document.getElementById('error-title');
  const msgEl = document.getElementById('error-message');
  const btnPlugins = document.getElementById('btn-open-plugins-err');

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (showPluginsButton) btnPlugins.classList.remove('hidden');
  else btnPlugins.classList.add('hidden');

  modal.classList.remove('hidden');
}

document.getElementById('btn-close-error').addEventListener('click', () => {
  document.getElementById('error-modal').classList.add('hidden');
});

document.getElementById('btn-open-plugins-err').addEventListener('click', () => {
  window.electronAPI.openPluginsFolder();
  document.getElementById('error-modal').classList.add('hidden');
});

// HISTÓRICO
async function loadHistory() {
  const container = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  if (!container) return;

  const logs = await window.electronAPI.getDownloadLogs();
  container.innerHTML = ''; 

  if (!logs || logs.length === 0) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  logs.slice(0, 15).forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const left = document.createElement('div');
    left.className = 'history-left';

    const icon = document.createElement('div');
    icon.className = 'history-icon';

    const platform = (item.platform || 'auto').toLowerCase();
    if (platform.includes('youtube')) icon.style.background = '#FF0000';
    else if (platform.includes('tiktok')) icon.style.background = '#000000';
    else if (platform.includes('instagram')) icon.style.background = 'linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)';
    else if (platform.includes('twitch')) icon.style.background = '#9146FF';
    else if (platform.includes('kick')) icon.style.background = '#53fc18';
    else if (platform.includes('facebook')) icon.style.background = '#043affff';
    else if (platform.includes('twitter')) icon.style.background = '#000000';
    else icon.style.background = '#444';

    icon.innerHTML = item.type === 'audio'
      ? '<i class="ri-file-music-fill"></i>'
      : '<i class="ri-file-video-fill"></i>';

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = item.name || '(sem nome)';
    title.style.color = `#fff`;

    const sub = document.createElement('div');
    sub.className = 'history-sub';

    const d = item.date ? new Date(item.date) : null;
    const dateStr = d ? d.toLocaleString() : '';
    sub.textContent = `${item.platform || 'auto'} • ${item.type || ''} • ${dateStr}`;

    meta.appendChild(title);
    meta.appendChild(sub);

    left.appendChild(icon);
    left.appendChild(meta);

    const right = document.createElement('div');
    right.className = 'history-right';

    const badge = document.createElement('span');
    if (item.status === 'ok') {
      badge.className = 'badge-ok';
      badge.textContent = 'OK';
    } else {
      badge.className = 'badge-err';
      badge.textContent = 'Erro';
    }

    right.appendChild(badge);

    const btn = document.createElement('button');
    btn.className = 'history-btn';
    btn.innerHTML = '<i class="ri-folder-3-fill"></i> Abrir';
    btn.disabled = !item.path;
    btn.addEventListener('click', () => {
      if (item.path) {
        window.electronAPI.openFileLocation(item.path);
      }
    });

    right.appendChild(btn);

    card.appendChild(left);
    card.appendChild(right);

    container.appendChild(card);
  });
}

// CONVERSOR DE ARQUIVOS (NEW: NOVIDADE NO FILEKIT)
const convFormats = {
  video: ['mp4', 'mkv', 'avi', 'mov', 'webm'],
  audio: ['mp3', 'wav', 'aac', 'ogg', 'flac'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'avif', 'apng'],
  doc: ['pdf', 'docx', 'pptx', 'xlsx', 'xls']
};

function fillConvFormats(type) {
  const sel = document.getElementById('conv-output-format');
  sel.innerHTML = '';
  convFormats[type].forEach(ext => {
    const opt = document.createElement('option');
    opt.value = ext;
    opt.textContent = '.' + ext;
    sel.appendChild(opt);
  });
  updateConvertButtonLabel();
}

function updateConvertButtonLabel() {
  const btn = document.getElementById('conv-start');
  const sel = document.getElementById('conv-output-format');
  if (!btn || !sel) return;
  const ext = sel.value || '...';
  btn.innerHTML = `<i class="ri-refresh-fill"></i> Converter para .${ext}`;
}

const convCat = document.getElementById('conv-category');
fillConvFormats(convCat.value);

convCat.addEventListener('change', () => {
  fillConvFormats(convCat.value);
});
document.getElementById('conv-output-format').addEventListener('change', updateConvertButtonLabel);

const convStatus = document.getElementById('conv-status');
const convFileLabel = document.getElementById('conv-selected-file');
const convOutInput = document.getElementById('conv-output-path');
const convStartBtn = document.getElementById('conv-start');

document.getElementById('conv-select-file').addEventListener('click', async () => {
  const file = await window.electronAPI.pickFile();
  if (!file) return;
  convSelectedFile = file;
  convFileLabel.textContent = file;
  convStartBtn.disabled = false;
});

document.getElementById('conv-choose-output').addEventListener('click', async () => {
  const folder = await window.electronAPI.chooseFolder();
  if (!folder) return;
  convOutputDir = folder;
  convOutInput.value = folder;
});

convStartBtn.addEventListener('click', async () => {
  if (!convSelectedFile) return;

  const type = convCat.value;
  const format = document.getElementById('conv-output-format').value;

  convStatus.innerHTML = `<p class="statusNeutro"><i class="ri-loader-2-fill spin"></i> Iniciando conversão...</p>`;
  convStartBtn.disabled = true;

  const res = await window.electronAPI.convertFile({
    type,
    input: convSelectedFile,
    outputDir: convOutputDir,
    format
  });

  if (res.ok) {
    convStatus.innerHTML = `<p class="statusConcluido"><i class="ri-checkbox-circle-fill"></i> Conversão concluída! (<span class="hint">${res.output})</p>`;
  } else {
    convStatus.innerHTML = `<p class="statusErro"><i class="ri-error-warning-fill"></i> Erro ao converter: ${res.error}</p>`;
  }

  convStartBtn.disabled = false;
});

window.electronAPI.onConvertProgress((_e, { input, percent }) => {
  if (!convSelectedFile || input !== convSelectedFile) return;
  const p = Math.round(percent);
  convStatus.innerHTML = `<p class="statusBaixando"><i class="ri-loop-right-fill spin"></i> Convertendo arquivo... (${p}%)</p>`;
});