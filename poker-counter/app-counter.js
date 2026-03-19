/* ============================
   TIMEZONE — Chile (America/Santiago)
   ============================ */
const CL_TZ = 'America/Santiago';

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    timeZone: CL_TZ, hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function fmtDate(ts) {
  const d   = new Date(ts);
  const wd  = d.toLocaleDateString('en-US', { timeZone: CL_TZ, weekday: 'short' });
  const day = d.toLocaleDateString('en-US', { timeZone: CL_TZ, day: 'numeric' });
  const mo  = d.toLocaleDateString('en-US', { timeZone: CL_TZ, month: 'short' });
  const yr  = d.toLocaleDateString('en-US', { timeZone: CL_TZ, year: 'numeric' });
  return `${cap(wd)} ${day} ${cap(mo)} ${yr}`;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '');
}

function fmtDuration(ms) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/* ============================
   STATE
   ============================ */
let hands        = parseInt(localStorage.getItem('pn_hands') || '0');
let elapsed      = parseInt(localStorage.getItem('pn_elapsed') || '0');
let startedAt    = null;
let sessionStart = null;
let pauseCount   = parseInt(localStorage.getItem('pn_pauseCount') || '0');
let timerRunning = false;
let tickInterval = null;
let wakeLock     = null;
let deleteTarget = null;

const savedStartedAt    = localStorage.getItem('pn_startedAt');
const savedSessionStart = localStorage.getItem('pn_sessionStart');
if (savedStartedAt) {
  startedAt    = parseInt(savedStartedAt);
  sessionStart = savedSessionStart ? parseInt(savedSessionStart) : startedAt;
  timerRunning = true;
}

let history = JSON.parse(localStorage.getItem('pn_history') || '[]');

/* ============================
   INIT
   ============================ */
function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw-counter.js').catch(() => {});
  }

  renderHands();
  renderTimer();
  buildRankings();
  renderHistory();

  if (timerRunning) { startTimerUI(); acquireWakeLock(); }

  // Single touchstart — no ghost click
  document.getElementById('tap-zone').addEventListener('touchstart', onTap, { passive: false });
}

/* ============================
   HAND COUNTER
   ============================ */
function onTap(e) {
  if (e.target.closest('.ctrl-btn')) return;
  e.preventDefault();
  hands++;
  localStorage.setItem('pn_hands', hands);
  renderHands();
  feedbackTap(e);
}

function renderHands() {
  document.getElementById('hand-number').textContent = hands;
  renderHPH();
}

function renderHPH() {
  const el    = document.getElementById('hph-display');
  const ms    = timerRunning ? elapsed + (Date.now() - startedAt) : elapsed;
  const hours = ms / 3600000;
  if (hours < 0.02 || hands === 0) { el.textContent = '—'; return; }
  el.textContent = Math.round(hands / hours);
}

function feedbackTap(e) {
  if (navigator.vibrate) navigator.vibrate(8);

  // Number bump
  const num = document.getElementById('hand-number');
  num.classList.remove('bump');
  void num.offsetWidth;
  num.classList.add('bump');
  setTimeout(() => num.classList.remove('bump'), 120);

  // Full-area flash
  const flash = document.getElementById('tap-flash');
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 150);

  // Ripple from touch point
  const zone = document.getElementById('tap-zone');
  const rect  = zone.getBoundingClientRect();
  const cx    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy    = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  const size  = Math.max(rect.width, rect.height) * 2.4;
  const rip   = document.createElement('div');
  rip.className = 'tap-ripple';
  rip.style.cssText = `width:${size}px;height:${size}px;left:${cx - size/2}px;top:${cy - size/2}px;`;
  zone.appendChild(rip);
  setTimeout(() => rip.remove(), 620);
}

/* ============================
   TIMER
   ============================ */
function timerStart() {
  if (timerRunning) { timerPause(); return; }
  const now = Date.now();
  startedAt = now;
  if (!sessionStart) {
    sessionStart = now;
    localStorage.setItem('pn_sessionStart', sessionStart);
  }
  localStorage.setItem('pn_startedAt', startedAt);
  timerRunning = true;
  startTimerUI();
  acquireWakeLock();
}

function timerPause() {
  elapsed += Date.now() - startedAt;
  startedAt    = null;
  timerRunning = false;
  pauseCount++;
  localStorage.setItem('pn_elapsed', elapsed);
  localStorage.setItem('pn_pauseCount', pauseCount);
  localStorage.removeItem('pn_startedAt');
  stopTimerUI();
  releaseWakeLock();
}

function startTimerUI() {
  const btn = document.getElementById('btn-start');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>Pause`;
  btn.classList.remove('ctrl-start');
  btn.classList.add('ctrl-pause');
  document.getElementById('timer-sub').textContent = 'Running';
  document.getElementById('live-pill').classList.add('visible');
  tickInterval = setInterval(() => { renderTimer(); renderHPH(); }, 1000);
  renderTimer();
}

function stopTimerUI() {
  clearInterval(tickInterval);
  const btn = document.getElementById('btn-start');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>Resume`;
  btn.classList.remove('ctrl-pause');
  btn.classList.add('ctrl-start');
  document.getElementById('timer-sub').textContent = 'Paused';
  document.getElementById('live-pill').classList.remove('visible');
  renderTimer();
}

function renderTimer() {
  const ms = timerRunning ? elapsed + (Date.now() - startedAt) : elapsed;
  const t  = Math.floor(ms / 1000);
  const h  = Math.floor(t / 3600);
  const m  = Math.floor((t % 3600) / 60);
  const s  = t % 60;
  document.getElementById('timer-display').textContent = h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ============================
   RESET → SAVE SESSION
   ============================ */
function confirmReset() {
  if (hands === 0 && elapsed === 0 && !timerRunning) {
    showToast('Nothing to reset');
    return;
  }
  document.getElementById('modal-reset').classList.add('open');
}

function doReset() {
  const finalElapsed = timerRunning ? elapsed + (Date.now() - startedAt) : elapsed;
  const endTs        = Date.now();
  const startTs      = sessionStart || startedAt || (endTs - finalElapsed);

  if (finalElapsed > 0 || hands > 0) {
    const hours = finalElapsed / 3600000;
    const hph   = (hours >= 0.02 && hands > 0) ? Math.round(hands / hours) : null;
    history.unshift({ id: Date.now(), startTs, endTs, elapsed: finalElapsed, hands, pauseCount, hph });
    localStorage.setItem('pn_history', JSON.stringify(history));
  }

  if (timerRunning) { clearInterval(tickInterval); releaseWakeLock(); }
  timerRunning = false;
  hands = 0; elapsed = 0; startedAt = null; sessionStart = null; pauseCount = 0;
  ['pn_hands', 'pn_elapsed', 'pn_startedAt', 'pn_sessionStart', 'pn_pauseCount']
    .forEach(k => localStorage.removeItem(k));

  const btn = document.getElementById('btn-start');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>Start Timer`;
  btn.classList.remove('ctrl-pause');
  btn.classList.add('ctrl-start');
  document.getElementById('timer-sub').textContent = 'Not started';
  document.getElementById('live-pill').classList.remove('visible');

  renderHands();
  renderTimer();
  renderHistory();
  closeModal('reset');
  showToast('Session saved to history');
}

/* ============================
   HISTORY
   ============================ */
function renderHistory() {
  const list    = document.getElementById('history-list');
  const summary = document.getElementById('history-summary');
  const sub     = document.getElementById('history-sub');
  const badge   = document.getElementById('history-badge');

  badge.textContent   = history.length;
  badge.style.display = history.length > 0 ? 'flex' : 'none';

  if (history.length === 0) {
    summary.style.display = 'none';
    sub.textContent = 'Your past sessions';
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🃏</div>
        <div class="empty-title">No sessions yet</div>
        <div class="empty-sub">Finish a session using the reset button and it will appear here.</div>
      </div>`;
    return;
  }

  const totalHands = history.reduce((a, s) => a + s.hands, 0);
  const totalMs    = history.reduce((a, s) => a + s.elapsed, 0);
  sub.textContent  = `${history.length} session${history.length !== 1 ? 's' : ''} recorded`;

  summary.style.display = 'flex';
  summary.innerHTML = `
    <div class="sum-card">
      <div class="sum-label">Sessions</div>
      <div class="sum-value gold">${history.length}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">Total Hands</div>
      <div class="sum-value">${totalHands}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">Total Time</div>
      <div class="sum-value">${fmtDuration(totalMs)}</div>
    </div>`;

  list.innerHTML = history.map((s, idx) => {
    const num = history.length - idx;
    return `
      <div class="session-card">
        <div class="session-card-header">
          <div class="session-date">${fmtDate(s.startTs)}</div>
          <div class="session-header-right">
            <div class="session-num-badge">Session #${num}</div>
            <div class="session-delete-btn" onclick="promptDeleteOne(${s.id})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="session-time-row">
          <div class="session-time-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <strong>${fmtTime(s.startTs)}</strong>
          </div>
          <span class="session-arrow">→</span>
          <div class="session-time-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            <strong>${fmtTime(s.endTs)}</strong>
          </div>
          <span class="pause-pip">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
            ${s.pauseCount} pause${s.pauseCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div class="session-stats-grid">
          <div class="sess-stat">
            <div class="sess-stat-label">Hands</div>
            <div class="sess-stat-value gold">${s.hands}</div>
          </div>
          <div class="sess-stat">
            <div class="sess-stat-label">Duration</div>
            <div class="sess-stat-value">${fmtDuration(s.elapsed)}</div>
          </div>
          <div class="sess-stat">
            <div class="sess-stat-label">H / Hour</div>
            <div class="sess-stat-value">${s.hph !== null ? s.hph : '—'}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function promptDeleteOne(id) {
  deleteTarget = id;
  document.getElementById('modal-deleteone').classList.add('open');
}

function doDeleteOne() {
  history = history.filter(s => s.id !== deleteTarget);
  localStorage.setItem('pn_history', JSON.stringify(history));
  deleteTarget = null;
  renderHistory();
  closeModal('deleteone');
  showToast('Session deleted');
}

function confirmClearAll() {
  if (history.length === 0) { showToast('No sessions to clear'); return; }
  document.getElementById('modal-clearall').classList.add('open');
}

function doClearAll() {
  history = [];
  localStorage.removeItem('pn_history');
  renderHistory();
  closeModal('clearall');
  showToast('History cleared');
}

/* ============================
   MODALS
   ============================ */
function closeModal(name, e) {
  const overlay = document.getElementById('modal-' + name);
  if (e && e.target !== overlay) return;
  overlay.classList.remove('open');
  if (name === 'deleteone') deleteTarget = null;
}

/* ============================
   WAKE LOCK
   ============================ */
async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch(_) {}
}

function releaseWakeLock() {
  try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch(_) {}
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && timerRunning) acquireWakeLock();
});

/* ============================
   NAVIGATION
   ============================ */
let currentPage = 'counter';

function showPage(name) {
  if (name === currentPage) return;
  document.getElementById('page-' + currentPage).classList.add('hidden');
  document.getElementById('nav-' + currentPage).classList.remove('active');
  document.getElementById('page-' + name).classList.remove('hidden');
  document.getElementById('nav-' + name).classList.add('active');
  currentPage = name;
}

/* ============================
   TOAST
   ============================ */
let toastTimer;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ============================
   HAND RANKINGS
   ============================ */
const HANDS = [
  { name: 'Royal Flush',     desc: 'A K Q J 10 — same suit',          cards: [{r:'A',s:'♠',hi:true},{r:'K',s:'♠',hi:true},{r:'Q',s:'♠',hi:true},{r:'J',s:'♠',hi:true},{r:'10',s:'♠',hi:true}] },
  { name: 'Straight Flush',  desc: 'Five in a row — same suit',        cards: [{r:'9',s:'♥',hi:true},{r:'8',s:'♥',hi:true},{r:'7',s:'♥',hi:true},{r:'6',s:'♥',hi:true},{r:'5',s:'♥',hi:true}] },
  { name: 'Four of a Kind',  desc: 'Four of the same rank',            cards: [{r:'K',s:'♠',hi:true},{r:'K',s:'♥',hi:true},{r:'K',s:'♦',hi:true},{r:'K',s:'♣',hi:true},{r:'2',s:'♦',hi:false}] },
  { name: 'Full House',      desc: 'Three of a kind + a pair',         cards: [{r:'J',s:'♠',hi:true},{r:'J',s:'♥',hi:true},{r:'J',s:'♦',hi:true},{r:'7',s:'♣',hi:false},{r:'7',s:'♦',hi:false}] },
  { name: 'Flush',           desc: 'Any five — same suit',             cards: [{r:'A',s:'♣',hi:true},{r:'10',s:'♣',hi:false},{r:'8',s:'♣',hi:false},{r:'5',s:'♣',hi:false},{r:'3',s:'♣',hi:false}] },
  { name: 'Straight',        desc: 'Five in a row — any suit',         cards: [{r:'9',s:'♦',hi:true},{r:'8',s:'♣',hi:false},{r:'7',s:'♠',hi:false},{r:'6',s:'♥',hi:false},{r:'5',s:'♦',hi:false}] },
  { name: 'Three of a Kind', desc: 'Three of the same rank',           cards: [{r:'Q',s:'♠',hi:true},{r:'Q',s:'♥',hi:true},{r:'Q',s:'♦',hi:true},{r:'9',s:'♣',hi:false},{r:'4',s:'♦',hi:false}] },
  { name: 'Two Pair',        desc: 'Two different pairs',              cards: [{r:'A',s:'♠',hi:true},{r:'A',s:'♦',hi:true},{r:'8',s:'♥',hi:false},{r:'8',s:'♣',hi:false},{r:'K',s:'♠',hi:false}] },
  { name: 'One Pair',        desc: 'Two of the same rank',             cards: [{r:'10',s:'♠',hi:true},{r:'10',s:'♥',hi:true},{r:'A',s:'♦',hi:false},{r:'7',s:'♣',hi:false},{r:'3',s:'♦',hi:false}] },
  { name: 'High Card',       desc: 'Highest single card wins',         cards: [{r:'A',s:'♠',hi:true},{r:'J',s:'♥',hi:false},{r:'9',s:'♦',hi:false},{r:'6',s:'♣',hi:false},{r:'2',s:'♠',hi:false}] }
];

function buildRankings() {
  document.getElementById('rankings-list').innerHTML = HANDS.map((h, i) => `
    <div class="hand-row ${i < 2 ? 'rank-' + (i + 1) : ''}">
      <div class="hand-rank-badge">${i + 1}</div>
      <div class="hand-info">
        <div class="hand-name">${h.name}</div>
        <div class="hand-desc">${h.desc}</div>
      </div>
      <div class="hand-cards">
        ${h.cards.map(c => `
          <div class="mini-card ${c.hi ? 'gold-card' : 'dim-card'}">
            <span class="rank">${c.r}</span>
            <span class="suit">${c.s}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

/* ============================
   BOOT
   ============================ */
init();
