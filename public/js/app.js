// SA28XZelkova Dashboard Frontend Application
// Theme: Dark Fantasy Grimoire
let socket = null;
let currentGuildId = null;
let activeMusicState = null;

document.addEventListener('DOMContentLoaded', () => {
  initEmberCanvas();
  initSocket();
  checkAuth();
  loadBotStats();
  handleHashRouting();

  window.addEventListener('hashchange', handleHashRouting);

  const quickInput = document.getElementById('quick-play-input');
  if (quickInput) {
    quickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        quickPlaySong();
      }
    });
  }
});

/* Ethereal Floating Ember Particle Engine */
function initEmberCanvas() {
  const canvas = document.getElementById('ember-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = 45;
  const particles = [];
  const colors = [
    'rgba(168, 85, 247, ', // Radiant Violet / Purple
    'rgba(236, 72, 153, ', // Electric Pink
    'rgba(244, 114, 182, ', // Soft Rose Pink
    'rgba(255, 255, 255, '  // Pure Crisp White
  ];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.7 + 0.2,
      speedY: Math.random() * 0.7 + 0.2,
      speedX: (Math.random() - 0.5) * 0.35,
      flicker: Math.random() * 0.02 + 0.005
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.speedY;
      p.x += p.speedX;
      p.alpha += Math.sin(Date.now() * p.flicker) * 0.01;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const safeAlpha = Math.max(0.1, Math.min(0.85, p.alpha));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + safeAlpha + ')';
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color + '0.7)';
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  render();
}

function initSocket() {
  try {
    socket = io();

    socket.on('connect', () => {
      console.log('⚡ Terhubung ke Portal WebSocket SA28XZelkova.');
      if (currentGuildId) {
        socket.emit('join:guild', currentGuildId);
      }
    });

    socket.on('music:state', (state) => {
      if (state.guildId === currentGuildId) {
        renderMusicState(state);
      }
    });
  } catch (e) {
    console.warn('Socket.io client initialization error:', e);
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/auth/user');
    const data = await res.json();
    const userArea = document.getElementById('nav-user-area');

    if (data.loggedIn && data.user) {
      const avatarUrl = data.user.avatar 
        ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

      userArea.innerHTML = `
        <div class="user-pill">
          <img src="${avatarUrl}" class="user-pill-avatar" alt="User">
          <span class="user-pill-name">${data.user.username}</span>
          <a href="/auth/logout" class="btn-ctrl" style="width:28px; height:28px; font-size:0.75rem; margin-left:4px;" title="Keluar"><i class="fa-solid fa-right-from-bracket"></i></a>
        </div>
      `;
    } else {
      userArea.innerHTML = `
        <button class="btn btn-discord" onclick="loginWithDiscord()">
          <i class="fa-brands fa-discord"></i>
          <span>Login Discord</span>
        </button>
      `;
    }
  } catch (err) {
    console.error('Failed to check user auth:', err);
  }
}

function loginWithDiscord() {
  window.location.href = '/auth/login';
}

async function loadBotStats() {
  try {
    const res = await fetch('/api/bot/info');
    const info = await res.json();

    if (info.avatar) {
      document.getElementById('bot-avatar').src = info.avatar;
    }
    document.getElementById('bot-status-dot').className = `status-indicator ${info.online ? 'online' : 'offline'}`;
    document.getElementById('metric-ping').textContent = `${info.ping || 0} ms`;
    document.getElementById('metric-guilds').textContent = `${info.guildsCount || 0} Realm`;
    document.getElementById('stats-ping').textContent = `${info.ping || 0} ms`;
    document.getElementById('stats-uptime').textContent = info.uptime ? formatDuration(info.uptime) : 'Online';

    if (info.inviteUrl) {
      document.getElementById('hero-invite-btn').href = info.inviteUrl;
    }
  } catch (err) {
    console.error('Failed to load bot stats:', err);
  }
}

function navigateTo(viewId, param = null) {
  if (viewId === 'dashboard' && param) {
    window.location.hash = `server/${param}`;
  } else if (viewId === 'servers') {
    window.location.hash = 'servers';
  } else {
    window.location.hash = '';
  }
}

function handleHashRouting() {
  const hash = window.location.hash.slice(1);
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(s => s.classList.remove('active'));

  if (!hash) {
    document.getElementById('view-landing').classList.add('active');
    if (socket && currentGuildId) {
      socket.emit('leave:guild', currentGuildId);
    }
    currentGuildId = null;
  } else if (hash === 'servers') {
    document.getElementById('view-servers').classList.add('active');
    loadUserGuilds();
    if (socket && currentGuildId) {
      socket.emit('leave:guild', currentGuildId);
    }
    currentGuildId = null;
  } else if (hash.startsWith('server/')) {
    const guildId = hash.split('/')[1];
    if (guildId) {
      document.getElementById('view-dashboard').classList.add('active');
      openGuildDashboard(guildId);
    }
  }
}

async function loadUserGuilds() {
  const container = document.getElementById('servers-list');
  container.innerHTML = `
    <div class="loading-state">
      <i class="fa-solid fa-spinner fa-spin fa-2x text-gold"></i>
      <p style="margin-top:12px;">Menghubungkan ke portal server Discord Anda...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/guilds');
    const guilds = await res.json();

    if (!Array.isArray(guilds) || guilds.length === 0) {
      container.innerHTML = `
        <div class="card glassmorphism-fantasy" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <i class="fa-solid fa-dungeon fa-3x text-gold" style="margin-bottom: 16px;"></i>
          <h3>Tidak Ada Server Ditemukan</h3>
          <p class="text-muted" style="margin-bottom: 24px;">Anda harus menjadi Administrator atau Owner di server Discord untuk mengelolanya.</p>
          <a href="#" id="empty-invite-btn" target="_blank" class="btn btn-primary">Undang Bot ke Server Baru</a>
        </div>
      `;
      loadBotStats().then(() => {
        const inv = document.getElementById('hero-invite-btn').href;
        if (inv) document.getElementById('empty-invite-btn').href = inv;
      });
      return;
    }

    container.innerHTML = guilds.map(g => `
      <div class="server-card" onclick="navigateTo('dashboard', '${g.id}')">
        <img src="${g.icon || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="server-icon-large" alt="${g.name}">
        <div class="server-name">${g.name}</div>
        <div class="server-badge" style="margin-bottom: 16px;">
          <span class="badge ${g.hasBot ? 'badge-gold' : ''}">
            ${g.hasBot ? '🟢 Terpasang di Server' : '➕ Klik untuk Undang'}
          </span>
        </div>
        <button class="btn ${g.hasBot ? 'btn-primary' : 'btn-glass'} btn-block">
          ${g.hasBot ? '<i class="fa-solid fa-sliders"></i> Buka Altar Realm' : '<i class="fa-solid fa-plus"></i> Tambahkan Bot'}
        </button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="card" style="grid-column:1/-1;">Gagal memuat server: ${err.message}</div>`;
  }
}

async function openGuildDashboard(guildId) {
  currentGuildId = guildId;

  if (socket) {
    socket.emit('join:guild', guildId);
  }

  try {
    const res = await fetch(`/api/guild/${guildId}`);
    const data = await res.json();

    document.getElementById('guild-title').textContent = data.name || `Server ${guildId}`;
    if (data.icon) {
      document.getElementById('guild-icon').src = data.icon;
    }

    const voiceStatus = document.getElementById('guild-voice-status');
    if (data.voiceChannel) {
      voiceStatus.textContent = `🔊 Terhubung: #${data.voiceChannel.name}`;
      voiceStatus.style.color = '#34d399';
    } else {
      voiceStatus.textContent = '⚠️ Belum terhubung ke Voice Channel';
      voiceStatus.style.color = '#f59e0b';
    }

    populateVoiceChannels(data.voiceChannels || []);
    const settings = data.settings || data.config?.settings || {};
    const textChannels = data.textChannels || data.channels || [];
    populateTextChannels(textChannels, settings.welcomeChannel);

    const defaultVolEl = document.getElementById('setting-default-vol');
    if (defaultVolEl) {
      defaultVolEl.value = settings.defaultVolume || 70;
      const volValEl = document.getElementById('vol-setting-val');
      if (volValEl) volValEl.textContent = `${settings.defaultVolume || 70}%`;
    }

    const welcomeMsgEl = document.getElementById('setting-welcome-msg');
    if (welcomeMsgEl) {
      welcomeMsgEl.value = settings.welcomeMessage || '';
    }

    loadGuildModules(guildId);
    loadGuildMusic(guildId);
  } catch (err) {
    console.error('Failed to open guild dashboard:', err);
    showToast('Gagal memuat data server Discord.', 'error');
  }
}

function populateVoiceChannels(channels) {
  // Can be used if custom voice selector is needed
}

function populateTextChannels(channels, selectedId) {
  const select = document.getElementById('setting-welcome-channel');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Channel Sambutan --</option>' +
    channels.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}># ${c.name}</option>`).join('');
}

async function loadGuildModules(guildId) {
  const container = document.getElementById('modules-container');
  try {
    const res = await fetch(`/api/guild/${guildId}/modules`);
    const modules = await res.json();

    container.innerHTML = modules.map(m => `
      <div class="module-item">
        <div class="module-info">
          <div class="module-icon"><i class="fa-solid ${m.icon || 'fa-scroll'}"></i></div>
          <div>
            <div class="module-title">${m.name}</div>
            <div class="module-desc">${m.description}</div>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" ${m.enabled ? 'checked' : ''} onchange="toggleModule('${m.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div>Gagal memuat modul: ${err.message}</div>`;
  }
}

async function toggleModule(moduleName, isChecked) {
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/modules/${moduleName}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: isChecked })
    });
    const data = await res.json();
    showToast(`Segel ${moduleName} berhasil ${data.enabled ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
  } catch (err) {
    showToast('Gagal memperbarui status segel modul.', 'error');
  }
}

async function saveGuildSettings(e) {
  e.preventDefault();
  const defaultVolume = document.getElementById('setting-default-vol').value;
  const welcomeChannel = document.getElementById('setting-welcome-channel').value;
  const welcomeMessage = document.getElementById('setting-welcome-msg').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultVolume, welcomeChannel, welcomeMessage })
    });
    await res.json();
    showToast('Konfigurasi Realm berhasil disimpan ke Grimoire!', 'success');
  } catch (err) {
    showToast('Gagal menyimpan konfigurasi server.', 'error');
  }
}

async function loadGuildMusic(guildId) {
  try {
    const res = await fetch(`/api/guild/${guildId}/music`);
    const state = await res.json();
    renderMusicState(state);
  } catch (err) {
    console.error('Error fetching music state:', err);
  }
}

function renderMusicState(state) {
  activeMusicState = state;
  const song = state.currentSong;

  // Autoplay Badge & Button
  const autoplayBadge = document.getElementById('autoplay-mode-badge');
  const btnAutoplay = document.getElementById('btn-autoplay');
  if (autoplayBadge) {
    if (state.autoplay) {
      autoplayBadge.className = 'autoplay-indicator active';
      autoplayBadge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Autoplay: ON';
    } else {
      autoplayBadge.className = 'autoplay-indicator';
      autoplayBadge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Autoplay: OFF';
    }
  }
  if (btnAutoplay) {
    btnAutoplay.classList.toggle('active', Boolean(state.autoplay));
  }

  if (song) {
    document.getElementById('player-title').textContent = song.name;
    document.getElementById('player-uploader').textContent = song.uploader || 'Audio Stream';
    document.getElementById('player-thumb').src = song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';
    document.getElementById('player-requester').textContent = song.user?.username || 'Dashboard';
    document.getElementById('player-duration').textContent = song.formattedDuration || '00:00';
    document.getElementById('player-total-time').textContent = song.formattedDuration || '00:00';
    document.getElementById('player-current-time').textContent = state.formattedCurrentTime || '00:00';

    const loopBadge = document.getElementById('loop-mode-badge');
    const btnLoop = document.getElementById('btn-loop');
    const modes = ['Loop: Off', 'Loop: Song', 'Loop: Queue'];
    if (loopBadge) {
      loopBadge.innerHTML = `<i class="fa-solid fa-repeat"></i> ${modes[state.repeatMode || 0]}`;
      loopBadge.classList.toggle('active', Boolean(state.repeatMode));
    }
    if (btnLoop) {
      btnLoop.classList.toggle('active', Boolean(state.repeatMode));
    }

    const iconPlayPause = document.getElementById('icon-play-pause');
    if (state.isPlaying && !state.isPaused) {
      iconPlayPause.className = 'fa-solid fa-pause';
    } else {
      iconPlayPause.className = 'fa-solid fa-play';
    }

    const currentSeconds = state.currentTime || 0;
    const totalSeconds = song.duration || 1;
    const pct = Math.min(100, Math.max(0, (currentSeconds / totalSeconds) * 100));
    document.getElementById('player-progress-fill').style.width = `${pct}%`;
  } else {
    document.getElementById('player-title').textContent = 'Tidak ada melodi yang diputar';
    document.getElementById('player-uploader').textContent = 'Ketik lagu di bawah atau gunakan /play di Discord';
    document.getElementById('player-thumb').src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';
    document.getElementById('player-requester').textContent = '-';
    document.getElementById('player-duration').textContent = '00:00';
    document.getElementById('player-current-time').textContent = '00:00';
    document.getElementById('player-total-time').textContent = '00:00';
    document.getElementById('player-progress-fill').style.width = '0%';
    document.getElementById('icon-play-pause').className = 'fa-solid fa-play';
    const loopBadge = document.getElementById('loop-mode-badge');
    if (loopBadge) {
      loopBadge.innerHTML = '<i class="fa-solid fa-repeat"></i> Loop: Off';
      loopBadge.classList.remove('active');
    }
  }

  if (state.volume !== undefined) {
    document.getElementById('volume-slider').value = state.volume;
    document.getElementById('vol-display').textContent = `${state.volume}%`;
  }

  renderQueue(state.queue || []);
  updateChibiWidget(state);
}

function renderQueue(queue) {
  const container = document.getElementById('queue-items-container');
  const countBadge = document.getElementById('queue-count');
  countBadge.textContent = `${queue.length} Lagu`;

  if (!queue || queue.length === 0) {
    container.innerHTML = `
      <div class="empty-queue">
        <i class="fa-solid fa-compact-disc fa-2x text-muted"></i>
        <p style="margin-top:10px;">Antrean masih sepi. Masukkan lagu atau playlist sekarang!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = queue.map(item => `
    <div class="queue-item">
      <div class="queue-item-info">
        <span class="badge badge-gold" style="font-size:0.75rem;">#${item.index}</span>
        <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=100&q=80'}" class="queue-item-thumb" alt="Thumb">
        <div style="overflow: hidden;">
          <div class="queue-item-title" title="${item.name}">${item.name}</div>
          <div class="queue-item-meta">⏱️ ${item.duration} • 👤 ${item.user}</div>
        </div>
      </div>
      <button class="btn-remove-track" onclick="removeQueueTrack(${item.index})" title="Hapus dari Antrean">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

async function togglePlayPause() {
  if (!activeMusicState || !activeMusicState.currentSong) {
    return showToast('Tidak ada melodi aktif untuk di-pause/play.', 'error');
  }

  const endpoint = activeMusicState.isPaused ? 'resume' : 'pause';
  await sendMusicControl(endpoint);
}

async function sendMusicControl(action) {
  if (!currentGuildId) return;
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/music/${action}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      if (action === 'autoplay') {
        showToast(`Autoplay ${data.autoplay ? 'DIAKTIFKAN (Lagu Sinkron)' : 'DINONAKTIFKAN'}!`, 'success');
      } else {
        showToast(`Mantra '${action}' berhasil dieksekusi!`, 'success');
      }
      loadGuildMusic(currentGuildId);
    }
  } catch (err) {
    showToast(`Gagal mengeksekusi '${action}': ${err.message}`, 'error');
  }
}

async function changeVolume(vol) {
  document.getElementById('vol-display').textContent = `${vol}%`;
  if (!currentGuildId) return;
  try {
    await fetch(`/api/guild/${currentGuildId}/music/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume: vol })
    });
  } catch (err) {
    console.error('Error changing volume:', err);
  }
}

async function quickPlaySong() {
  const input = document.getElementById('quick-play-input');
  const query = input.value.trim();
  if (!query) {
    return showToast('Masukkan judul lagu atau link musik/playlist terlebih dahulu.', 'error');
  }

  showToast(`Mencari dan memproses: ${query}...`, 'success');
  input.value = '';

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/music/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Lagu/Playlist berhasil ditambahkan ke altar pemutar!', 'success');
      loadGuildMusic(currentGuildId);
    } else {
      showToast(data.error || 'Gagal memutar lagu.', 'error');
    }
  } catch (err) {
    showToast('Gagal memutar lagu: ' + err.message, 'error');
  }
}

async function removeQueueTrack(index) {
  if (!currentGuildId) return;
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/music/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Track berhasil dihapus dari antrean.', 'success');
      loadGuildMusic(currentGuildId);
    }
  } catch (err) {
    showToast('Gagal menghapus lagu.', 'error');
  }
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}j ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald' : 'fa-circle-exclamation text-crimson'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ==========================================================================
   Chibi Floating Mascot Controller (Reze-chan)
   ========================================================================== */

let chibiQuoteIndex = 0;
const chibiQuotes = [
  "Hehehe! Mau dengar lagu apa hari ini? Aku siap nemenin kamu dengerin musik! 💜",
  "Tips: Sekarang gunakan prefix z!p <judul lagu> di Discord ya! ⚡",
  "Warna ungu, pink, dan putih ini aesthetic banget kan~? Cocok banget sama aku! ✨🌸",
  "Kalo YouTube lagi error atau limit, gunakan z!sc <judul> untuk putar via SoundCloud tanpa lag! 🟠",
  "Aktifkan Autoplay biar lagunya muter terus tanpa henti! 📻💖",
  "Semangat harimu! Jangan lupa putar lagu favoritmu di z!p ya~ 🎶"
];

function updateChibiWidget(state) {
  const bubble = document.getElementById('chibi-speech-text');
  const badge = document.getElementById('chibi-music-badge');
  const miniTitle = document.getElementById('chibi-mini-title');
  if (!bubble || !badge) return;

  if (state && state.currentSong) {
    const songName = state.currentSong.name;
    const shortName = songName.length > 28 ? songName.slice(0, 25) + '...' : songName;
    if (miniTitle) miniTitle.textContent = shortName;

    if (state.isPlaying && !state.isPaused) {
      badge.textContent = 'PLAYING 🎵';
      badge.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
      bubble.innerHTML = `Lagi memutar: <strong>${shortName}</strong> ✨ Enak banget lagunya!`;
    } else if (state.isPaused) {
      badge.textContent = 'PAUSED ☕';
      badge.style.background = 'linear-gradient(135deg, #f59e0b, #ec4899)';
      bubble.textContent = 'Musik lagi dijeda... Klik tombol play untuk lanjut ya! ☕';
    }
  } else {
    badge.textContent = 'IDLE 💜';
    badge.style.background = 'linear-gradient(135deg, #7c3aed, #ec4899)';
    if (miniTitle) miniTitle.textContent = 'Belum ada lagu yang diputar';
    bubble.textContent = 'Hai! Mau dengar lagu apa? Ketik judulnya atau gunakan z!p ya~ 🌸';
  }
}

function toggleChibiCard(forceState) {
  const card = document.getElementById('chibi-card-popup');
  if (!card) return;
  if (typeof forceState === 'boolean') {
    card.classList.toggle('active', forceState);
  } else {
    card.classList.toggle('active');
  }
}

function onChibiClick() {
  const card = document.getElementById('chibi-card-popup');
  const quoteArea = document.getElementById('chibi-quote-area');
  const bubble = document.getElementById('chibi-speech-text');

  chibiQuoteIndex = (chibiQuoteIndex + 1) % chibiQuotes.length;
  const quote = chibiQuotes[chibiQuoteIndex];

  if (quoteArea) quoteArea.textContent = `"${quote}"`;
  if (bubble) bubble.textContent = quote;

  if (card) {
    card.classList.toggle('active');
  }
}
