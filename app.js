// ============================
// DATA STORE
// ============================
const DB_KEY = 'poker_tracker_v2';

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { players: [], sessions: [] };
}

function migrateDB(data) {
  // Ensure top-level arrays exist
  if (!data.players) data.players = [];
  if (!data.sessions) data.sessions = [];

  // Patch every session with missing fields
  data.sessions = data.sessions.map(s => ({
    durationMinutes: 0,
    hands: 0,
    notes: '',
    results: [],
    ...s,
    // Ensure every result has buyin/cashout as numbers
    results: (s.results || []).map(r => ({
      ...r,
      buyin: Number(r.buyin) || 0,
      cashout: Number(r.cashout) || 0,
    })),
  }));

  // Patch every player with missing fields
  data.players = data.players.map(p => ({
    nickname: '',
    notes: '',
    color: 'avatar-blue',
    ...p,
  }));

  return data;
}

function saveDB() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let db = migrateDB(loadDB());

// ============================
// SVG ICONS
// ============================
const ICONS = {
  // ♠  Spade — logo header
  spade: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><path d="M12 2C12 2 3 8.5 3 14a5 5 0 0 0 7.5 4.33c-.3 1.2-.9 2.27-1.5 2.67h6c-.6-.4-1.2-1.47-1.5-2.67A5 5 0 0 0 21 14C21 8.5 12 2 12 2Z"/></svg>`,

  // 🃏  Joker card — empty states, session meta, save button
  cards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><rect x="2" y="5" width="13" height="16" rx="2"/><path d="M6 2h13a2 2 0 0 1 2 2v13"/><path d="M6 10h5M6 14h3"/></svg>`,

  // 🎴  Flower playing card — sessions empty state
  deck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><rect x="3" y="4" width="13" height="16" rx="2"/><path d="M7 1h13a2 2 0 0 1 2 2v14"/><path d="M7 9h5M7 13h7M7 17h4"/></svg>`,

  // 🏆  Trophy — winner badge, leaderboard empty state
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><path d="M8 21h8M12 17v4"/><path d="M7 4H4a1 1 0 0 0-1 1v2a4 4 0 0 0 4 4"/><path d="M17 4h3a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4"/><path d="M7 4a5 5 0 0 0 5 9 5 5 0 0 0 5-9H7Z"/></svg>`,

  // 👥  Group — players empty state
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,

  // 🥇  Gold medal — rank #1
  medal1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="14" r="7"/><path d="M12 11v6M10 12l2-1"/><path d="M7.5 5.5 5 3l4 1 3-3 3 3 4-1-2.5 2.5"/></svg>`,

  // 🥈  Silver medal — rank #2
  medal2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="14" r="7"/><path d="M10 12.5a2 2 0 1 1 4 0c0 1-1 1.5-2 2.5h2"/><path d="M7.5 5.5 5 3l4 1 3-3 3 3 4-1-2.5 2.5"/></svg>`,

  // 🥉  Bronze medal — rank #3
  medal3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="14" r="7"/><path d="M10 12a2 2 0 1 1 2 2 2 2 0 1 1-2 2"/><path d="M7.5 5.5 5 3l4 1 3-3 3 3 4-1-2.5 2.5"/></svg>`,

  // ✏️  Edit pencil — edit session button
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>`,

  // 🗑  Trash — delete session button
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,

  // ✓  Check — balanced validation, player selector
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg>`,

  // ⚠  Warning — imbalance alert
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  // 🕐  Clock — session duration
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>`,
};

// Helper: icon sized & styled inline
function icon(name, { size = 18, color = 'currentColor', style = '' } = {}) {
  return ICONS[name]
    .replace('style="display:inline-block;vertical-align:middle"',
      `style="display:inline-block;vertical-align:middle;width:${size}px;height:${size}px;flex-shrink:0;${style}" aria-hidden="true"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
    .replace(/fill="currentColor"/g, `fill="${color}"`);
}

// ============================
// UTILS
// ============================
const AVATAR_COLORS = [
  { key: 'avatar-red', hex: '#c0392b' },
  { key: 'avatar-orange', hex: '#e67e22' },
  { key: 'avatar-gold', hex: '#f39c12' },
  { key: 'avatar-green', hex: '#27ae60' },
  { key: 'avatar-teal', hex: '#16a085' },
  { key: 'avatar-blue', hex: '#2980b9' },
  { key: 'avatar-purple', hex: '#8e44ad' },
  { key: 'avatar-gray', hex: '#606060' },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(amount) {
  const abs = Math.abs(amount);
  const str = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2);
  return (amount < 0 ? '-' : '') + '$' + str;
}

function fmtSigned(amount) {
  if (amount === 0) return '$0';
  const sign = amount > 0 ? '+' : '';
  const abs = Math.abs(amount);
  const str = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2);
  return sign + (amount < 0 ? '-' : '') + '$' + str;
}

function fmtDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}


  if (amount > 0) return 'amount-green';
  if (amount < 0) return 'amount-red';
  return 'amount-neutral';
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getPlayer(id) {
  return db.players.find(p => p.id === id);
}

function getAvatarHex(colorKey) {
  const c = AVATAR_COLORS.find(c => c.key === colorKey);
  return c ? c.hex : '#606060';
}

function playerStats(playerId) {
  const sessions = db.sessions.filter(s => s.results && s.results.some(r => r.playerId === playerId));
  const results = sessions.map(s => s.results.find(r => r.playerId === playerId)).filter(Boolean);
  const profits = results.map(r => r.cashout - r.buyin);
  const wins = profits.filter(p => p > 0).length;
  const total = profits.reduce((a, b) => a + b, 0);
  const avg = profits.length ? total / profits.length : 0;
  const best = profits.length ? Math.max(...profits) : 0;
  const worst = profits.length ? Math.min(...profits) : 0;
  const totalHands = sessions.reduce((a, s) => a + (s.hands || 0), 0);
  const totalMinutes = sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const profitPerHour = totalHours > 0 ? total / totalHours : null;
  const profitPerHand = totalHands > 0 ? total / totalHands : null;
  return {
    sessions: sessions.length, total, avg, best, worst,
    winRate: profits.length ? wins / profits.length : 0,
    totalHands, profits, sessionIds: sessions.map(s => s.id),
    totalMinutes, totalHours, profitPerHour, profitPerHand,
  };
}

function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = type;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ============================
// ROUTER
// ============================
let currentPage = 'dashboard';
let pageHistory = [];

function navigate(page, data = {}) {
  pageHistory.push(currentPage);
  currentPage = page;
  renderPage(page, data);
  updateNav(page);
}

function updateNav(page) {
  document.querySelectorAll('.nav-item, .nav-new').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

function renderPage(page, data = {}) {
  const main = document.getElementById('main-content');
  const headerActions = document.getElementById('header-actions');
  headerActions.innerHTML = '';

  const pages = {
    dashboard: renderDashboard,
    players: renderPlayers,
    'new-session': renderNewSession,
    sessions: renderSessions,
    leaderboard: renderLeaderboard,
    'player-detail': renderPlayerDetail,
    'session-detail': renderSessionDetail,
    'edit-session': renderEditSession,
  };

  if (pages[page]) {
    main.innerHTML = '';
    pages[page](main, data, headerActions);
  }
}

// ============================
// DASHBOARD
// ============================
function renderDashboard(main, data, headerActions) {
  const totalSessions = db.sessions.length;
  const totalHands = db.sessions.reduce((a, s) => a + (s.hands || 0), 0);
  const totalPlayers = db.players.length;

  // Top player by profit
  const playerRanks = db.players.map(p => {
    const s = playerStats(p.id);
    return { player: p, total: s.total, sessions: s.sessions };
  }).filter(x => x.sessions > 0).sort((a, b) => b.total - a.total);

  const topPlayer = playerRanks[0];
  const recentSessions = [...db.sessions].reverse().slice(0, 3);

  main.innerHTML = `
    <div class="page">
      <div class="page-title">Dashboard</div>
      <div class="page-sub">Your poker group overview</div>

      <div class="stat-grid three">
        <div class="stat-card">
          <div class="stat-label">Sessions</div>
          <div class="stat-value">${totalSessions}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Hands</div>
          <div class="stat-value">${totalHands > 0 ? (totalHands >= 1000 ? (totalHands/1000).toFixed(1)+'k' : totalHands) : '—'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Players</div>
          <div class="stat-value">${totalPlayers}</div>
        </div>
      </div>

      ${topPlayer ? `
      <div class="section-header">
        <div class="section-title small">Top Player</div>
      </div>
      <div class="card mb-16">
        <div class="player-item" onclick="navigate('player-detail', {id: '${topPlayer.player.id}'})">
          <div class="avatar" style="background:${getAvatarHex(topPlayer.player.color)}; color:#000">
            ${getInitials(topPlayer.player.name)}
          </div>
          <div class="player-info">
            <div class="player-name">${topPlayer.player.name}${topPlayer.player.nickname ? ` <span style="color:var(--text-secondary);font-size:12px;">"${topPlayer.player.nickname}"</span>` : ''}</div>
            <div class="player-sub">${topPlayer.sessions} sessions · ${Math.round(topPlayer.player.winRate !== undefined ? topPlayer.player.winRate * 100 : 0)}% win rate</div>
          </div>
          <div class="player-stat">
            <div class="amount ${colorClass(topPlayer.total)}">${fmtSigned(topPlayer.total)}</div>
            <div class="label" style="font-size:11px;color:var(--text-secondary)">total</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section-header">
        <div class="section-title small">Recent Sessions</div>
        ${totalSessions > 0 ? `<button class="section-link" onclick="navigate('sessions')">See all</button>` : ''}
      </div>

      ${recentSessions.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('cards', { size: 48, color: 'var(--text-muted)' })}</div>
          <div class="empty-title">No sessions yet</div>
          <div class="empty-sub">Start tracking your poker nights</div>
          <button class="btn btn-primary mt-16" style="margin-top:16px;width:auto;padding:12px 24px;" onclick="navigate('new-session')">New Session</button>
        </div>
      ` : recentSessions.map(s => sessionCard(s)).join('')}

      ${playerRanks.length >= 2 ? `
      <div class="section-header mt-16" style="margin-top:20px;">
        <div class="section-title small">Quick Standings</div>
        <button class="section-link" onclick="navigate('leaderboard')">Full rankings</button>
      </div>
      <div class="card">
        ${playerRanks.slice(0, 5).map((pr, i) => `
          <div class="leaderboard-item ${i === 0 ? 'top-1' : ''}">
            <div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i < 3 ? [icon('medal1',{size:16}),icon('medal2',{size:16}),icon('medal3',{size:16})][i] : i+1}</div>
            <div class="avatar" style="width:32px;height:32px;font-size:13px;background:${getAvatarHex(pr.player.color)};color:#000">${getInitials(pr.player.name)}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500">${pr.player.name}</div>
              <div style="font-size:11px;color:var(--text-secondary)">${pr.sessions} sessions</div>
            </div>
            <div class="${colorClass(pr.total)}" style="font-size:15px;font-weight:600">${fmtSigned(pr.total)}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  `;
}

function sessionCard(s) {
  const results = s.results || [];
  const sorted = [...results].sort((a, b) => (b.cashout - b.buyin) - (a.cashout - a.buyin));
  const topResult = sorted[0];
  const topPlayer = topResult ? getPlayer(topResult.playerId) : null;
  const topProfit = topResult ? topResult.cashout - topResult.buyin : 0;

  return `
    <div class="session-item" onclick="navigate('session-detail', {id: '${s.id}'})">
      <div class="session-top">
        <div>
          <div class="session-name">${s.name}</div>
          <div class="session-date">${s.date ? new Date(s.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : ''}</div>
        </div>
        <div class="session-badge">${results.length} players</div>
      </div>
      <div class="session-meta">
        ${s.hands ? `<div class="session-meta-item">${icon('cards',{size:13})} ${s.hands} hands</div>` : ''}
        ${s.durationMinutes ? `<div class="session-meta-item">${icon('clock',{size:13})} ${fmtDuration(s.durationMinutes)}</div>` : ''}
        ${topPlayer ? `<div class="session-meta-item">${icon('trophy',{size:13})} ${topPlayer.name} <span class="amount-green" style="margin-left:4px">${fmtSigned(topProfit)}</span></div>` : ''}
      </div>
    </div>
  `;
}

// ============================
// PLAYERS PAGE
// ============================
function renderPlayers(main, data, headerActions) {
  headerActions.innerHTML = `<button class="header-btn gold" onclick="showAddPlayerModal()">+ Add Player</button>`;

  const sorted = [...db.players].map(p => {
    const s = playerStats(p.id);
    return { ...p, stats: s };
  }).sort((a, b) => b.stats.total - a.stats.total);

  main.innerHTML = `
    <div class="page">
      <div class="page-title">Players</div>
      <div class="page-sub">${db.players.length} players in your group</div>

      ${sorted.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('users', { size: 48, color: 'var(--text-muted)' })}</div>
          <div class="empty-title">No players yet</div>
          <div class="empty-sub">Add the members of your poker group</div>
          <button class="btn btn-primary mt-16" style="margin-top:16px;width:auto;padding:12px 24px;" onclick="showAddPlayerModal()">Add First Player</button>
        </div>
      ` : `
        <div class="card">
          ${sorted.map(p => `
            <div class="player-item" onclick="navigate('player-detail', {id: '${p.id}'})">
              <div class="avatar" style="background:${getAvatarHex(p.color)};color:#000">${getInitials(p.name)}</div>
              <div class="player-info">
                <div class="player-name">${p.name}${p.nickname ? ` <span style="color:var(--text-secondary);font-size:12px">"${p.nickname}"</span>` : ''}</div>
                <div class="player-sub">${p.stats.sessions} sessions · ${Math.round(p.stats.winRate * 100)}% wins</div>
              </div>
              <div class="player-stat">
                <div class="amount ${colorClass(p.stats.total)}">${fmtSigned(p.stats.total)}</div>
                <div class="label" style="font-size:11px;color:var(--text-secondary)">lifetime</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ============================
// PLAYER DETAIL
// ============================
function renderPlayerDetail(main, data, headerActions) {
  const player = getPlayer(data.id);
  if (!player) { navigate('players'); return; }

  const s = playerStats(player.id);
  const recentProfits = s.profits.slice(-10);
  const avgPerHand = s.totalHands > 0 ? (s.total / s.totalHands) : 0;

  headerActions.innerHTML = `
    <button class="header-btn" onclick="showEditPlayerModal('${player.id}')">Edit</button>
  `;

  main.innerHTML = `
    <div class="page">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div class="avatar" style="width:60px;height:60px;font-size:22px;background:${getAvatarHex(player.color)};color:#000">${getInitials(player.name)}</div>
        <div>
          <div class="page-title" style="margin-bottom:2px;">${player.name}</div>
          ${player.nickname ? `<div style="color:var(--gold);font-size:14px">"${player.nickname}"</div>` : ''}
          ${player.notes ? `<div style="color:var(--text-secondary);font-size:13px;margin-top:4px">${player.notes}</div>` : ''}
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card gold-border">
          <div class="stat-label">Total Profit</div>
          <div class="stat-value small ${colorClass(s.total)}">${fmtSigned(s.total)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sessions</div>
          <div class="stat-value">${s.sessions}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg / Session</div>
          <div class="stat-value small ${colorClass(s.avg)}">${fmtSigned(Math.round(s.avg))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Win Rate</div>
          <div class="stat-value">${Math.round(s.winRate * 100)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Best Win</div>
          <div class="stat-value small amount-green">${fmtSigned(s.best)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Worst Loss</div>
          <div class="stat-value small amount-red">${fmtSigned(s.worst)}</div>
        </div>
      </div>

      ${s.totalMinutes > 0 || s.totalHands > 0 ? `
      <div class="section-header" style="margin-top:4px;">
        <div class="section-title small">Rate Stats</div>
      </div>
      <div class="stat-grid ${s.totalMinutes > 0 && s.totalHands > 0 ? '' : 'wide'}">
        ${s.profitPerHour !== null ? `
        <div class="stat-card gold-border">
          <div class="stat-label">Per Hour</div>
          <div class="stat-value small ${colorClass(s.profitPerHour)}">${fmtSigned(Math.round(s.profitPerHour))}</div>
          <div class="stat-sub">${fmtDuration(s.totalMinutes)} played</div>
        </div>` : ''}
        ${s.profitPerHand !== null ? `
        <div class="stat-card">
          <div class="stat-label">Per Hand</div>
          <div class="stat-value small ${colorClass(s.profitPerHand)}">${s.profitPerHand >= 0 ? '+' : ''}$${Math.abs(s.profitPerHand).toFixed(2)}</div>
          <div class="stat-sub">${s.totalHands} hands total</div>
        </div>` : ''}
      </div>
      ` : ''}

      ${recentProfits.length >= 2 ? `
      <div class="chart-wrap">
        <div class="chart-title">Profit Trend (last ${recentProfits.length} sessions)</div>
        ${renderSparkline(recentProfits)}
      </div>
      ` : ''}

      ${s.sessions > 0 ? `
      <div class="chart-wrap">
        <div class="chart-title">Session Results</div>
        <div class="mini-chart">
          ${recentProfits.map(p => {
            const maxAbs = Math.max(...recentProfits.map(Math.abs), 1);
            const h = Math.max(4, Math.abs(p) / maxAbs * 70);
            return `<div class="chart-bar ${p > 0 ? 'positive' : 'negative'}" style="height:${h}px"></div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn btn-danger" onclick="confirmDeletePlayer('${player.id}')">Delete Player</button>
      </div>
    </div>
  `;
}

function renderSparkline(profits) {
  const w = 300, h = 56;
  const n = profits.length;
  if (n < 2) return '';

  const cumulative = [];
  let running = 0;
  for (const p of profits) { running += p; cumulative.push(running); }

  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  const range = max - min || 1;

  const points = cumulative.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const zeroY = h - ((0 - min) / range) * (h - 8) - 4;
  const isProfit = cumulative[n - 1] >= 0;

  return `
    <div class="sparkline-wrap">
      <svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <line x1="0" y1="${zeroY}" x2="${w}" y2="${zeroY}" class="chart-zero-line" />
        <polyline points="${points}" fill="none" stroke="${isProfit ? 'var(--green)' : 'var(--red)'}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${(() => {
          const lastX = w;
          const lastY = h - ((cumulative[n-1] - min) / range) * (h - 8) - 4;
          return `<circle cx="${lastX}" cy="${lastY}" r="3" fill="${isProfit ? 'var(--green)' : 'var(--red)'}"/>`;
        })()}
      </svg>
    </div>
  `;
}

// ============================
// NEW SESSION PAGE
// ============================
let sessionDraft = null;
let sessionStep = 1; // 1=details, 2=players+results

function renderNewSession(main, data, headerActions) {
  if (!sessionDraft || data.reset) {
    sessionDraft = { name: '', hands: '', notes: '', players: [], id: data.editId || null };
  }
  if (data.editId) {
    const existing = db.sessions.find(s => s.id === data.editId);
    if (existing && !data.loaded) {
      sessionDraft = { ...existing, id: existing.id };
      sessionDraft.durationHours = Math.floor((existing.durationMinutes || 0) / 60);
      sessionDraft.durationMinutes = (existing.durationMinutes || 0) % 60;
      sessionDraft.players = (existing.results || []).map(r => ({
        playerId: r.playerId,
        buyin: (Number(r.buyin) || 0).toString(),
        cashout: (Number(r.cashout) || 0).toString(),
      }));
      data.loaded = true;
    }
  }

  sessionStep = data.step || 1;
  renderSessionStep(main, headerActions);
}

function renderSessionStep(main, headerActions) {
  if (sessionStep === 1) {
    renderSessionStep1(main, headerActions);
  } else {
    renderSessionStep2(main, headerActions);
  }
}

function renderSessionStep1(main, headerActions) {
  const isEdit = !!sessionDraft.id;
  headerActions.innerHTML = '';

  main.innerHTML = `
    <div class="page">
      <div class="page-title">${isEdit ? 'Edit Session' : 'New Session'}</div>
      <div class="page-sub">Step 1 of 2 — Session details</div>

      <div class="form-group">
        <label class="form-label">Session Name</label>
        <input class="form-input" id="s-name" type="text" placeholder="e.g. Friday Night, Game #12" value="${sessionDraft.name || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Hands Played <span style="color:var(--text-muted)">(optional)</span></label>
        <input class="form-input" id="s-hands" type="number" inputmode="numeric" placeholder="e.g. 120" value="${sessionDraft.hands || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Duration <span style="color:var(--text-muted)">(optional)</span></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:5px">Hours</div>
            <input class="form-input" id="s-hours" type="number" inputmode="numeric" placeholder="0" min="0" max="24" value="${sessionDraft.durationHours || ''}" />
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:5px">Minutes</div>
            <input class="form-input" id="s-minutes" type="number" inputmode="numeric" placeholder="0" min="0" max="59" value="${sessionDraft.durationMinutes || ''}" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes <span style="color:var(--text-muted)">(optional)</span></label>
        <textarea class="form-input" id="s-notes" placeholder="Any notes about the session...">${sessionDraft.notes || ''}</textarea>
      </div>

      <button class="btn btn-primary" onclick="sessionStep1Next()">
        Continue to Players →
      </button>

      ${isEdit ? `<button class="btn btn-ghost mt-16" style="margin-top:10px;" onclick="navigate('sessions')">Cancel</button>` : ''}
    </div>
  `;
}

function sessionStep1Next() {
  const name = document.getElementById('s-name').value.trim();
  if (!name) { showToast('Please enter a session name', 'error'); return; }
  sessionDraft.name = name;
  sessionDraft.hands = parseInt(document.getElementById('s-hands').value) || 0;
  sessionDraft.durationHours = parseInt(document.getElementById('s-hours').value) || 0;
  sessionDraft.durationMinutes = parseInt(document.getElementById('s-minutes').value) || 0;
  sessionDraft.notes = document.getElementById('s-notes').value.trim();
  sessionStep = 2;
  renderSessionStep2(document.getElementById('main-content'), document.getElementById('header-actions'));
}

function renderSessionStep2(main, headerActions) {
  // If no players yet, auto-add all players from db
  if (sessionDraft.players.length === 0 && db.players.length > 0) {
    // Start with empty — let user select
  }

  const totalBuyin = sessionDraft.players.reduce((a, p) => a + (parseFloat(p.buyin) || 0), 0);
  const totalCashout = sessionDraft.players.reduce((a, p) => a + (parseFloat(p.cashout) || 0), 0);
  const diff = Math.abs(totalBuyin - totalCashout);
  const balanced = diff < 0.01;

  main.innerHTML = `
    <div class="page">
      <div class="page-title">${sessionDraft.id ? 'Edit Session' : 'New Session'}</div>
      <div class="page-sub">Step 2 of 2 — Players & Results</div>

      <div id="session-players-list">
        ${sessionDraft.players.map((p, i) => playerResultRow(p, i)).join('')}
      </div>

      <button class="btn btn-secondary mb-16" onclick="showPlayerSelector()">
        + Add Player
      </button>

      ${sessionDraft.players.length >= 2 ? `
        <div id="validation-box">
          ${balanced ? `
            <div class="validation-ok">${icon('check',{size:15})} Balanced — buy-ins match cash-outs (${fmt(totalBuyin)})</div>
          ` : `
            <div class="validation-warning">${icon('warning',{size:15})} Imbalanced — difference of ${fmt(diff)} (buy-ins: ${fmt(totalBuyin)} / cash-outs: ${fmt(totalCashout)})</div>
          `}
        </div>
        <button class="btn btn-primary ${!balanced ? 'disabled' : ''}" id="save-session-btn" onclick="saveSession()" ${!balanced ? 'disabled' : ''}>
          ${sessionDraft.id ? 'Save Changes' : `${icon('cards',{size:16})} Save Session`}
        </button>
      ` : `
        <div style="color:var(--text-secondary);font-size:13px;text-align:center;padding:12px 0">Add at least 2 players to save</div>
      `}

      <button class="btn btn-ghost" style="margin-top:10px;" onclick="sessionStep=1; renderSessionStep(document.getElementById('main-content'), document.getElementById('header-actions'))">← Back</button>
    </div>
  `;
}

function playerResultRow(p, index) {
  const player = getPlayer(p.playerId);
  if (!player) return '';
  const buyin = parseFloat(p.buyin) || 0;
  const cashout = parseFloat(p.cashout) || 0;
  const profit = cashout - buyin;
  const profitStr = buyin > 0 || cashout > 0 ? fmtSigned(profit) : '';

  return `
    <div class="session-player-row" id="spr-${index}">
      <div class="session-player-header">
        <div class="session-player-name">
          <div class="avatar" style="width:28px;height:28px;font-size:11px;background:${getAvatarHex(player.color)};color:#000">${getInitials(player.name)}</div>
          ${player.name}
        </div>
        <button class="remove-btn" onclick="removeSessionPlayer(${index})">×</button>
      </div>
      <div class="money-row">
        <div>
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:5px">Buy-in</div>
          <div class="money-input-wrap">
            <span class="money-prefix">$</span>
            <input class="form-input money-input" type="number" inputmode="decimal" placeholder="0" value="${p.buyin || ''}" oninput="updatePlayerAmount(${index}, 'buyin', this.value)" />
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:5px">Cash-out</div>
          <div class="money-input-wrap">
            <span class="money-prefix">$</span>
            <input class="form-input money-input" type="number" inputmode="decimal" placeholder="0" value="${p.cashout || ''}" oninput="updatePlayerAmount(${index}, 'cashout', this.value)" />
          </div>
        </div>
      </div>
      ${profitStr ? `<div class="profit-indicator ${colorClass(profit)}">${profitStr}</div>` : ''}
    </div>
  `;
}

function updatePlayerAmount(index, field, value) {
  sessionDraft.players[index][field] = value;
  // Update validation without full re-render
  const totalBuyin = sessionDraft.players.reduce((a, p) => a + (parseFloat(p.buyin) || 0), 0);
  const totalCashout = sessionDraft.players.reduce((a, p) => a + (parseFloat(p.cashout) || 0), 0);
  const diff = Math.abs(totalBuyin - totalCashout);
  const balanced = diff < 0.01;

  // Update profit indicator for this row
  const buyin = parseFloat(sessionDraft.players[index].buyin) || 0;
  const cashout = parseFloat(sessionDraft.players[index].cashout) || 0;
  const profit = cashout - buyin;
  const row = document.getElementById(`spr-${index}`);
  if (row) {
    let pi = row.querySelector('.profit-indicator');
    if (buyin > 0 || cashout > 0) {
      const profitStr = fmtSigned(profit);
      if (!pi) {
        pi = document.createElement('div');
        pi.className = `profit-indicator ${colorClass(profit)}`;
        row.appendChild(pi);
      }
      pi.textContent = profitStr;
      pi.className = `profit-indicator ${colorClass(profit)}`;
    }
  }

  const validBox = document.getElementById('validation-box');
  const saveBtn = document.getElementById('save-session-btn');
  if (validBox) {
    validBox.innerHTML = balanced
      ? `<div class="validation-ok">${icon('check',{size:15})} Balanced — buy-ins match cash-outs (${fmt(totalBuyin)})</div>`
      : `<div class="validation-warning">${icon('warning',{size:15})} Imbalanced — difference of ${fmt(diff)} (buy-ins: ${fmt(totalBuyin)} / cash-outs: ${fmt(totalCashout)})</div>`;
  }
  if (saveBtn) {
    saveBtn.disabled = !balanced;
    saveBtn.classList.toggle('disabled', !balanced);
  }
}

function removeSessionPlayer(index) {
  sessionDraft.players.splice(index, 1);
  renderSessionStep2(document.getElementById('main-content'), document.getElementById('header-actions'));
}

function showPlayerSelector() {
  const existing = sessionDraft.players.map(p => p.playerId);
  const available = db.players.filter(p => !existing.includes(p.id));

  if (available.length === 0) {
    if (db.players.length === 0) {
      showAddPlayerModal(true);
    } else {
      showToast('All players added', '');
    }
    return;
  }

  let html = `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Select Player</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      ${available.map(p => `
        <div class="player-selector-item" onclick="addSessionPlayer('${p.id}')">
          <div class="avatar" style="width:36px;height:36px;font-size:14px;background:${getAvatarHex(p.color)};color:#000">${getInitials(p.name)}</div>
          <div>
            <div style="font-size:15px;font-weight:500">${p.name}</div>
            ${p.nickname ? `<div style="font-size:12px;color:var(--text-secondary)">"${p.nickname}"</div>` : ''}
          </div>
          <span class="check-icon">${icon('check',{size:18})}</span>
        </div>
      `).join('')}
      <button class="btn btn-ghost mt-16" style="margin-top:12px;" onclick="closeModal(); showAddPlayerModal(true)">+ Create New Player</button>
    </div>
  `;
  openModal(html);
}

function addSessionPlayer(playerId) {
  sessionDraft.players.push({ playerId, buyin: '', cashout: '' });
  closeModal();
  renderSessionStep2(document.getElementById('main-content'), document.getElementById('header-actions'));
}

function saveSession() {
  const totalBuyin = sessionDraft.players.reduce((a, p) => a + (parseFloat(p.buyin) || 0), 0);
  const totalCashout = sessionDraft.players.reduce((a, p) => a + (parseFloat(p.cashout) || 0), 0);
  const diff = Math.abs(totalBuyin - totalCashout);
  if (diff >= 0.01) { showToast('Fix balance before saving', 'error'); return; }

  const results = sessionDraft.players.map(p => ({
    playerId: p.playerId,
    buyin: parseFloat(p.buyin) || 0,
    cashout: parseFloat(p.cashout) || 0,
  }));

  if (sessionDraft.id) {
    // Edit existing
    const idx = db.sessions.findIndex(s => s.id === sessionDraft.id);
    if (idx !== -1) {
      db.sessions[idx] = { ...db.sessions[idx], name: sessionDraft.name, hands: sessionDraft.hands, durationMinutes: (sessionDraft.durationHours || 0) * 60 + (sessionDraft.durationMinutes || 0), notes: sessionDraft.notes, results };
      saveDB();
      sessionDraft = null;
      showToast('Session updated', 'success');
      navigate('session-detail', { id: db.sessions[idx].id });
      return;
    }
  }

  // New session
  const session = {
    id: uid(),
    name: sessionDraft.name,
    hands: sessionDraft.hands,
    durationMinutes: (sessionDraft.durationHours || 0) * 60 + (sessionDraft.durationMinutes || 0),
    notes: sessionDraft.notes,
    date: new Date().toISOString(),
    results,
  };

  db.sessions.push(session);
  saveDB();
  sessionDraft = null;
  showToast('Session saved!', 'success');
  navigate('session-detail', { id: session.id });
}

// ============================
// SESSIONS PAGE
// ============================
function renderSessions(main, data, headerActions) {
  const sessions = [...db.sessions].reverse();

  main.innerHTML = `
    <div class="page">
      <div class="page-title">Sessions</div>
      <div class="page-sub">${sessions.length} sessions recorded</div>

      ${sessions.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('deck', { size: 48, color: 'var(--text-muted)' })}</div>
          <div class="empty-title">No sessions yet</div>
          <div class="empty-sub">Record your first poker night</div>
          <button class="btn btn-primary mt-16" style="margin-top:16px;width:auto;padding:12px 24px;" onclick="navigate('new-session', {reset:true})">Start Session</button>
        </div>
      ` : sessions.map(s => sessionCard(s)).join('')}
    </div>
  `;
}

// ============================
// SESSION DETAIL
// ============================
function renderSessionDetail(main, data, headerActions) {
  const session = db.sessions.find(s => s.id === data.id);
  if (!session) { navigate('sessions'); return; }

  headerActions.innerHTML = `
    <button class="header-btn" onclick="navigate('new-session', {editId:'${session.id}'})">Edit</button>
  `;

  const results = [...(session.results || [])].sort((a, b) => (b.cashout - b.buyin) - (a.cashout - a.buyin));
  const topResult = results[0];

  main.innerHTML = `
    <div class="page">
      <div class="page-title">${session.name}</div>
      <div class="page-sub">${session.date ? new Date(session.date).toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric',year:'numeric'}) : ''}</div>

      <div class="stat-grid ${session.durationMinutes ? '' : 'three'}">
        <div class="stat-card">
          <div class="stat-label">Players</div>
          <div class="stat-value">${results.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Hands</div>
          <div class="stat-value">${session.hands || '—'}</div>
        </div>
        ${session.durationMinutes ? `
        <div class="stat-card">
          <div class="stat-label">Duration</div>
          <div class="stat-value small">${fmtDuration(session.durationMinutes)}</div>
        </div>` : ''}
        <div class="stat-card">
          <div class="stat-label">Total Pot</div>
          <div class="stat-value small">${fmt(results.reduce((a, r) => a + r.buyin, 0))}</div>
        </div>
      </div>

      ${session.notes ? `
        <div class="card mb-16" style="margin-bottom:16px;">
          <div class="card-body" style="font-size:14px;color:var(--text-secondary)">${session.notes}</div>
        </div>
      ` : ''}

      <div class="section-header">
        <div class="section-title small">Results</div>
      </div>

      <div class="card mb-16" style="margin-bottom:16px;overflow-x:auto;">
        <table class="results-table">
          <thead>
            <tr>
              <th>Player</th>
              <th style="text-align:right">Buy-in</th>
              <th style="text-align:right">Cash-out</th>
              <th style="text-align:right">P&L</th>
              ${session.durationMinutes ? `<th style="text-align:right">/hr</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${results.map((r, i) => {
              const player = getPlayer(r.playerId);
              const profit = r.cashout - r.buyin;
              const isTop = i === 0 && profit > 0;
              const hours = (session.durationMinutes || 0) / 60;
              const perHour = hours > 0 ? profit / hours : null;
              return `
                <tr class="${isTop ? 'top-winner' : ''}">
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="avatar" style="width:28px;height:28px;font-size:11px;background:${player ? getAvatarHex(player.color) : '#333'};color:#000">${player ? getInitials(player.name) : '?'}</div>
                      <span>${player ? player.name : 'Unknown'}</span>
                      ${isTop ? `<span style="color:var(--gold);display:inline-flex;align-items:center;">${icon('trophy',{size:14,color:'var(--gold)'})}</span>` : ''}
                    </div>
                  </td>
                  <td style="text-align:right;color:var(--text-secondary)">${fmt(r.buyin)}</td>
                  <td style="text-align:right;color:var(--text-secondary)">${fmt(r.cashout)}</td>
                  <td style="text-align:right" class="${colorClass(profit)}">${fmtSigned(profit)}</td>
                  ${session.durationMinutes ? `<td style="text-align:right;font-size:12px;" class="${colorClass(profit)}">${fmtSigned(Math.round(perHour))}</td>` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="navigate('new-session', {editId:'${session.id}'})">${icon('edit',{size:15})} Edit</button>
        <button class="btn btn-danger" onclick="confirmDeleteSession('${session.id}')">${icon('trash',{size:15})} Delete</button>
      </div>
    </div>
  `;
}

// ============================
// LEADERBOARD
// ============================
function renderLeaderboard(main, data, headerActions) {
  const tabs = ['profit', 'avg', 'winrate'];
  const tabLabels = { profit: 'Total Profit', avg: 'Avg / Session', winrate: 'Win Rate' };
  const activeTab = data.tab || 'profit';

  const ranked = db.players.map(p => {
    const s = playerStats(p.id);
    return { player: p, stats: s };
  }).filter(x => x.stats.sessions > 0);

  const sorted = [...ranked].sort((a, b) => {
    if (activeTab === 'profit') return b.stats.total - a.stats.total;
    if (activeTab === 'avg') return b.stats.avg - a.stats.avg;
    return b.stats.winRate - a.stats.winRate;
  });

  main.innerHTML = `
    <div class="page">
      <div class="page-title">Rankings</div>
      <div class="page-sub">All-time leaderboard</div>

      <div class="tab-row">
        <button class="tab-btn ${activeTab === 'profit' ? 'active' : ''}" onclick="navigate('leaderboard', {tab:'profit'})">Profit</button>
        <button class="tab-btn ${activeTab === 'avg' ? 'active' : ''}" onclick="navigate('leaderboard', {tab:'avg'})">Avg</button>
        <button class="tab-btn ${activeTab === 'winrate' ? 'active' : ''}" onclick="navigate('leaderboard', {tab:'winrate'})">Win %</button>
      </div>

      ${sorted.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('trophy', { size: 48, color: 'var(--text-muted)' })}</div>
          <div class="empty-title">No rankings yet</div>
          <div class="empty-sub">Play some sessions to build the leaderboard</div>
        </div>
      ` : `
      <div class="card">
        ${sorted.map((item, i) => {
          const val = activeTab === 'profit' ? fmtSigned(item.stats.total)
            : activeTab === 'avg' ? fmtSigned(Math.round(item.stats.avg))
            : Math.round(item.stats.winRate * 100) + '%';
          const valColor = activeTab === 'winrate' ? '' : colorClass(
            activeTab === 'profit' ? item.stats.total : item.stats.avg
          );
          return `
            <div class="leaderboard-item ${i === 0 ? 'top-1' : ''}">
              <div class="rank-badge rank-${i < 3 ? i+1 : 'other'}">${i < 3 ? [icon('medal1',{size:16}),icon('medal2',{size:16}),icon('medal3',{size:16})][i] : i+1}</div>
              <div class="avatar" style="width:38px;height:38px;font-size:15px;background:${getAvatarHex(item.player.color)};color:#000">${getInitials(item.player.name)}</div>
              <div style="flex:1;min-width:0" onclick="navigate('player-detail', {id:'${item.player.id}'})">
                <div style="font-size:15px;font-weight:500">${item.player.name}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${item.stats.sessions} sessions</div>
              </div>
              <div class="${valColor || (item.stats.winRate >= 0.5 ? 'amount-green' : 'amount-red')}" style="font-size:17px;font-weight:700">${val}</div>
            </div>
          `;
        }).join('')}
      </div>

      ${sorted.length >= 2 ? `
      <div class="chart-wrap" style="margin-top:16px;">
        <div class="chart-title">Profit Comparison</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
          ${sorted.slice(0, 6).map(item => {
            const maxAbs = Math.max(...sorted.slice(0,6).map(x => Math.abs(x.stats.total)), 1);
            const pct = Math.abs(item.stats.total) / maxAbs * 100;
            return `
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:80px;font-size:12px;color:var(--text-secondary);text-align:right;flex-shrink:0;">${item.player.name.split(' ')[0]}</div>
                <div style="flex:1;background:var(--bg-elevated);border-radius:3px;height:8px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${item.stats.total >= 0 ? 'var(--green)' : 'var(--red)'};border-radius:3px;transition:width 0.5s ease"></div>
                </div>
                <div class="${colorClass(item.stats.total)}" style="font-size:12px;font-weight:600;width:50px">${fmtSigned(item.stats.total)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}
      `}
    </div>
  `;
}

// ============================
// ADD / EDIT PLAYER MODAL
// ============================
function showAddPlayerModal(fromSession = false) {
  let selectedColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].key;

  const colorSwatches = AVATAR_COLORS.map(c => `
    <div class="color-swatch ${c.key === selectedColor ? 'selected' : ''}"
      style="background:${c.hex}"
      data-color="${c.key}"
      onclick="selectAvatarColor('${c.key}', this)">
    </div>
  `).join('');

  const html = `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Add Player</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" id="p-name" type="text" placeholder="Full name" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label">Nickname <span style="color:var(--text-muted)">(optional)</span></label>
        <input class="form-input" id="p-nick" type="text" placeholder="e.g. The Shark" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes <span style="color:var(--text-muted)">(optional)</span></label>
        <input class="form-input" id="p-notes" type="text" placeholder="e.g. Always bluffs the river" autocomplete="off" />
      </div>
      <div class="form-group">
        <label class="form-label">Avatar Color</label>
        <div class="color-chooser" id="color-chooser">${colorSwatches}</div>
      </div>
      <button class="btn btn-primary" onclick="saveNewPlayer(${fromSession})">Add Player</button>
    </div>
  `;
  openModal(html);
  window._selectedAvatarColor = selectedColor;
  setTimeout(() => document.getElementById('p-name')?.focus(), 300);
}

function selectAvatarColor(colorKey, el) {
  window._selectedAvatarColor = colorKey;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

function saveNewPlayer(fromSession = false) {
  const name = document.getElementById('p-name')?.value.trim();
  if (!name) { showToast('Name required', 'error'); return; }

  const player = {
    id: uid(),
    name,
    nickname: document.getElementById('p-nick')?.value.trim() || '',
    notes: document.getElementById('p-notes')?.value.trim() || '',
    color: window._selectedAvatarColor || 'avatar-blue',
  };

  db.players.push(player);
  saveDB();
  closeModal();
  showToast(`${name} added!`, 'success');

  if (fromSession) {
    // Add to session draft
    addSessionPlayer(player.id);
  } else {
    navigate('players');
  }
}

function showEditPlayerModal(playerId) {
  const player = getPlayer(playerId);
  if (!player) return;
  window._selectedAvatarColor = player.color;

  const colorSwatches = AVATAR_COLORS.map(c => `
    <div class="color-swatch ${c.key === player.color ? 'selected' : ''}"
      style="background:${c.hex}"
      data-color="${c.key}"
      onclick="selectAvatarColor('${c.key}', this)">
    </div>
  `).join('');

  const html = `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Edit Player</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" id="ep-name" type="text" value="${player.name}" />
      </div>
      <div class="form-group">
        <label class="form-label">Nickname</label>
        <input class="form-input" id="ep-nick" type="text" value="${player.nickname || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <input class="form-input" id="ep-notes" type="text" value="${player.notes || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Avatar Color</label>
        <div class="color-chooser">${colorSwatches}</div>
      </div>
      <button class="btn btn-primary" onclick="updatePlayer('${playerId}')">Save Changes</button>
    </div>
  `;
  openModal(html);
}

function updatePlayer(playerId) {
  const player = getPlayer(playerId);
  if (!player) return;
  const name = document.getElementById('ep-name')?.value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  player.name = name;
  player.nickname = document.getElementById('ep-nick')?.value.trim() || '';
  player.notes = document.getElementById('ep-notes')?.value.trim() || '';
  player.color = window._selectedAvatarColor || player.color;
  saveDB();
  closeModal();
  showToast('Player updated', 'success');
  navigate('player-detail', { id: playerId });
}

function confirmDeletePlayer(playerId) {
  const player = getPlayer(playerId);
  if (!player) return;
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Delete Player</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);margin-bottom:20px;">Remove <strong style="color:var(--text-primary)">${player.name}</strong> from your group? Their session history will remain but they won't appear in future sessions.</p>
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="deletePlayer('${playerId}')">Delete</button>
      </div>
    </div>
  `;
  openModal(html);
}

function deletePlayer(playerId) {
  db.players = db.players.filter(p => p.id !== playerId);
  saveDB();
  closeModal();
  showToast('Player removed', '');
  navigate('players');
}

function confirmDeleteSession(sessionId) {
  const session = db.sessions.find(s => s.id === sessionId);
  if (!session) return;
  const html = `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Delete Session</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);margin-bottom:20px;">Permanently delete <strong style="color:var(--text-primary)">${session.name}</strong>? This cannot be undone.</p>
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="deleteSession('${sessionId}')">Delete</button>
      </div>
    </div>
  `;
  openModal(html);
}

function deleteSession(sessionId) {
  db.sessions = db.sessions.filter(s => s.id !== sessionId);
  saveDB();
  closeModal();
  showToast('Session deleted', '');
  navigate('sessions');
}

// ============================
// EDIT SESSION (alias)
// ============================
function renderEditSession(main, data, headerActions) {
  renderNewSession(main, data, headerActions);
}

// ============================
// MODAL
// ============================
function openModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  container.innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  }, { once: true });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
}

// ============================
// NAV INIT
// ============================
document.querySelectorAll('.nav-item, .nav-new').forEach(el => {
  el.addEventListener('click', () => {
    const page = el.dataset.page;
    if (page === 'new-session') {
      sessionDraft = null;
      sessionStep = 1;
      navigate(page, { reset: true });
    } else {
      navigate(page);
    }
  });
});

// ============================
// SERVICE WORKER
// ============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ============================
// INIT
// ============================
renderPage('dashboard');

// Inject spade logo icon
const logoSpade = document.getElementById('logo-spade');
if (logoSpade) logoSpade.innerHTML = icon('spade', { size: 22, color: 'var(--gold)' });
