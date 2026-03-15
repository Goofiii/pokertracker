import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { openDB } from 'idb'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// ─── Tailwind base styles injected globally ───────────────────────────────────
const GLOBAL_CSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;-webkit-font-smoothing:antialiased;overscroll-behavior:none;color:#f0f0f5}
.scroll{overflow-y:auto;-webkit-overflow-scrolling:touch}
.page{animation:pageIn .25s cubic-bezier(.32,.72,0,1)}
.modal{animation:modalIn .32s cubic-bezier(.32,.72,0,1)}
.pop{animation:popIn .2s cubic-bezier(.32,.72,0,1)}
@keyframes pageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes modalIn{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes popIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
`

// ─── DB ───────────────────────────────────────────────────────────────────────
async function getDB() {
  return openDB('poker', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('players')) db.createObjectStore('players', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id' })
        s.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('results')) {
        const r = db.createObjectStore('results', { keyPath: 'id' })
        r.createIndex('sessionId', 'sessionId')
        r.createIndex('playerId', 'playerId')
      }
    }
  })
}
const db = {
  async players() { return (await getDB()).getAll('players') },
  async player(id) { return (await getDB()).get('players', id) },
  async savePlayer(p) {
    const rec = { ...p, id: p.id || crypto.randomUUID(), updatedAt: Date.now() }
    await (await getDB()).put('players', rec); return rec
  },
  async deletePlayer(id) {
    const d = await getDB()
    await d.delete('players', id)
    const res = await d.getAllFromIndex('results', 'playerId', id)
    const tx = d.transaction('results', 'readwrite')
    await Promise.all(res.map(r => tx.store.delete(r.id))); await tx.done
  },
  async sessions() { const r = await (await getDB()).getAllFromIndex('sessions', 'date'); return r.reverse() },
  async saveSession(s, results) {
    const d = await getDB()
    const rec = { ...s, id: s.id || crypto.randomUUID(), updatedAt: Date.now() }
    const old = await d.getAllFromIndex('results', 'sessionId', rec.id)
    const tx1 = d.transaction('results', 'readwrite')
    await Promise.all(old.map(r => tx1.store.delete(r.id))); await tx1.done
    await d.put('sessions', rec)
    const recs = results.map(r => ({ ...r, id: r.id || crypto.randomUUID(), sessionId: rec.id }))
    const tx2 = d.transaction('results', 'readwrite')
    await Promise.all(recs.map(r => tx2.store.put(r))); await tx2.done
    return { session: rec, results: recs }
  },
  async deleteSession(id) {
    const d = await getDB()
    await d.delete('sessions', id)
    const res = await d.getAllFromIndex('results', 'sessionId', id)
    const tx = d.transaction('results', 'readwrite')
    await Promise.all(res.map(r => tx.store.delete(r.id))); await tx.done
  },
  async resultsBySession(sessionId) { return (await getDB()).getAllFromIndex('results', 'sessionId', sessionId) },
  async resultsByPlayer(playerId) { return (await getDB()).getAllFromIndex('results', 'playerId', playerId) },
  async allResults() { return (await getDB()).getAll('results') },
  async playerStats(playerId) {
    const results = await db.resultsByPlayer(playerId)
    if (!results.length) return { sessions: 0, totalProfit: 0, avgProfit: 0, winPct: 0, biggestWin: 0, biggestLoss: 0, results: [] }
    const profits = results.map(r => r.profit)
    const wins = profits.filter(p => p > 0).length
    const totalProfit = profits.reduce((a, b) => a + b, 0)
    return {
      sessions: results.length, totalProfit,
      avgProfit: totalProfit / results.length,
      winPct: (wins / results.length) * 100,
      biggestWin: Math.max(...profits),
      biggestLoss: Math.min(...profits),
      results: results.sort((a, b) => a.sessionDate - b.sessionDate)
    }
  },
  async export() {
    const [players, sessions, results] = await Promise.all([db.players(), db.sessions(), db.allResults()])
    return { players, sessions, results, exportedAt: Date.now(), version: 1 }
  },
  async import(data) {
    const d = await getDB()
    const tx = d.transaction(['players','sessions','results'], 'readwrite')
    await tx.objectStore('players').clear()
    await tx.objectStore('sessions').clear()
    await tx.objectStore('results').clear()
    await Promise.all([
      ...data.players.map(p => tx.objectStore('players').put(p)),
      ...data.sessions.map(s => tx.objectStore('sessions').put(s)),
      ...data.results.map(r => tx.objectStore('results').put(r)),
    ]); await tx.done
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = {
  money: (n) => {
    const abs = Math.abs(n), s = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2)
    return n > 0 ? `+$${s}` : n < 0 ? `-$${s}` : `$${s}`
  },
  abs: (n) => `$${Math.abs(n) % 1 === 0 ? Math.abs(n).toFixed(0) : Math.abs(n).toFixed(2)}`,
  date: (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
  shortDate: (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
  profitClass: (n) => n > 0 ? 'text-emerald-400' : n < 0 ? 'text-rose-400' : 'text-zinc-500',
}
const COLORS = [
  { bg: '#0d2b1e', text: '#00d68f' }, { bg: '#2b0d14', text: '#ff4d6d' },
  { bg: '#0d1a2b', text: '#4cc9f0' }, { bg: '#2b1f0d', text: '#ffd166' },
  { bg: '#1a0d2b', text: '#c77dff' }, { bg: '#0d2b2b', text: '#06d6a0' },
  { bg: '#2b220d', text: '#f8961e' }, { bg: '#1a1a2b', text: '#a8dadc' },
]
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
const haptic = () => window.navigator?.vibrate?.([10])

function downloadBlob(content, filename, type) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type })), download: filename
  })
  a.click(); URL.revokeObjectURL(a.href)
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Avatar({ player, size = 40 }) {
  const c = COLORS[(player?.colorIndex ?? 0) % COLORS.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, background: c.bg, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      border: `1.5px solid ${c.text}28`, letterSpacing: '-0.5px'
    }}>{initials(player?.name || '?')}</div>
  )
}

function Card({ children, style, onClick, className = '' }) {
  return (
    <div onClick={onClick} className={`rounded-2xl p-4 ${onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''} ${className}`}
      style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.06)', ...style }}>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, variant = 'primary', className = '' }) {
  const styles = {
    primary: { background: disabled ? '#1a3a2a' : '#00d68f', color: disabled ? '#55556a' : '#0a0a0f' },
    secondary: { background: '#1e1e2a', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.1)' },
    danger: { background: 'rgba(255,77,109,0.1)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.2)' },
    ghost: { background: 'transparent', color: '#8888a0' },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`font-semibold rounded-2xl py-4 px-5 text-base active:scale-95 transition-transform w-full ${className}`}
      style={{ ...styles[variant], opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', inputMode, rows }) {
  const shared = {
    className: 'w-full rounded-xl px-4 py-3 text-base outline-none transition-colors',
    style: { background: '#1a1a24', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#00d68f' },
    value, onChange, placeholder,
    onFocus: e => e.target.style.borderColor = 'rgba(0,214,143,0.4)',
    onBlur: e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  }
  return (
    <div>
      {label && <p className="text-xs font-medium mb-1.5" style={{ color: '#8888a0' }}>{label}</p>}
      {rows
        ? <textarea {...shared} rows={rows} style={{ ...shared.style, resize: 'none' }} />
        : <input {...shared} type={type} inputMode={inputMode} />
      }
    </div>
  )
}

function Sheet({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div className="relative modal rounded-t-3xl overflow-hidden" style={{
        background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
        paddingBottom: 'max(env(safe-area-inset-bottom),24px)'
      }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div className="px-5 pb-2">
          {title && <h2 className="text-xl font-bold mb-5" style={{ color: '#f0f0f5' }}>{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  )
}

function Toast({ message, type }) {
  return (
    <div className="fixed left-4 right-4 z-[100] pop" style={{
      bottom: 'calc(max(env(safe-area-inset-bottom),20px) + 80px)', pointerEvents: 'none'
    }}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{
        background: type === 'error' ? '#1f0a10' : '#0a1f15',
        border: `1px solid ${type === 'error' ? 'rgba(255,77,109,0.3)' : 'rgba(0,214,143,0.3)'}`,
        color: type === 'error' ? '#ff4d6d' : '#00d68f',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <span>{type === 'error' ? '⚠️' : '✅'}</span>
        <span className="font-semibold text-sm">{message}</span>
      </div>
    </div>
  )
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'players',   label: 'Players',   icon: '👥' },
  { id: 'new',       label: 'New Game',  icon: '＋' },
  { id: 'sessions',  label: 'Sessions',  icon: '🗓' },
  { id: 'ranks',     label: 'Ranks',     icon: '🏆' },
]

function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around pt-2 px-1"
      style={{
        background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'max(env(safe-area-inset-bottom),14px)'
      }}>
      {TABS.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl active:scale-90 transition-all"
            style={{ minWidth: 52, minHeight: 52 }}>
            <span className="text-xl leading-tight" style={{
              filter: on ? 'none' : 'grayscale(1) brightness(0.4)',
              transform: on ? 'scale(1.15)' : 'scale(1)', transition: 'all .2s'
            }}>{t.icon}</span>
            <span className="text-[10px] font-medium" style={{ color: on ? '#00d68f' : '#55556a' }}>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

// DASHBOARD
function Dashboard({ players, sessions, onNav }) {
  const [stats, setStats] = useState([])
  const [totals, setTotals] = useState({ money: 0, biggestWin: 0, biggestName: '' })

  useEffect(() => {
    ;(async () => {
      const all = await Promise.all(players.map(async p => ({ player: p, stats: await db.playerStats(p.id) })))
      setStats(all.sort((a, b) => b.stats.totalProfit - a.stats.totalProfit))
      let money = 0, biggestWin = 0, biggestName = ''
      for (const s of sessions) {
        const res = await db.resultsBySession(s.id)
        money += res.reduce((a, r) => a + r.buyIn, 0)
        res.forEach(r => { if (r.profit > biggestWin) { biggestWin = r.profit; biggestName = players.find(p => p.id === r.playerId)?.name || '' } })
      }
      setTotals({ money, biggestWin, biggestName })
    })()
  }, [players, sessions])

  const top3 = stats.slice(0, 3)
  const recent = sessions.slice(0, 3)

  return (
    <PageWrap>
      <div className="px-4 pt-4 pb-5 flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: '#8888a0' }}>Welcome back</p>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Poker Tracker 🃏</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.2)' }}>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold" style={{ color: '#00d68f' }}>{sessions.length} sessions</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Sessions', value: sessions.length },
          { label: 'Total Played', value: fmt.abs(totals.money) },
          { label: 'Biggest Win', value: fmt.abs(totals.biggestWin), accent: true },
          { label: 'Players', value: players.length },
        ].map(({ label, value, accent }) => (
          <Card key={label} style={accent ? { borderColor: 'rgba(0,214,143,0.2)', background: 'rgba(0,214,143,0.03)' } : {}}>
            <p className="text-xs mb-1" style={{ color: '#8888a0' }}>{label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: accent ? '#00d68f' : '#f0f0f5' }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Top players */}
      {top3.length > 0 && (
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: '#f0f0f5' }}>🏆 Top Players</h2>
            <button onClick={() => onNav('ranks')} className="text-sm font-medium" style={{ color: '#00d68f' }}>See all</button>
          </div>
          <div className="space-y-2">
            {top3.map(({ player, stats: s }, i) => (
              <Card key={player.id} className="flex items-center gap-3">
                <span className="text-lg font-bold w-5 text-center" style={{ color: ['#ffd166','#c0c0c0','#cd7f32'][i] }}>{i+1}</span>
                <Avatar player={player} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: '#f0f0f5' }}>{player.name}</p>
                  <p className="text-xs" style={{ color: '#8888a0' }}>{s.sessions} sessions · {s.winPct.toFixed(0)}% wins</p>
                </div>
                <span className={`font-bold tabular-nums ${fmt.profitClass(s.totalProfit)}`}>{fmt.money(s.totalProfit)}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      {recent.length > 0 && (
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: '#f0f0f5' }}>🎯 Recent Sessions</h2>
            <button onClick={() => onNav('sessions')} className="text-sm font-medium" style={{ color: '#00d68f' }}>See all</button>
          </div>
          <div className="space-y-2">
            {recent.map(s => (
              <Card key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: '#f0f0f5' }}>{s.name}</p>
                  <p className="text-xs" style={{ color: '#8888a0' }}>{fmt.date(s.date)} · {s.playerCount || 0} players</p>
                </div>
                {s.biggestWinnerName && (
                  <div className="text-right">
                    <p className="text-xs font-medium" style={{ color: '#00d68f' }}>🥇 {s.biggestWinnerName}</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: '#00d68f' }}>{fmt.money(s.biggestWin||0)}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#f0f0f5' }}>No sessions yet</h3>
          <p className="text-sm mb-6" style={{ color: '#8888a0' }}>Start tracking your poker nights.</p>
          <Btn onClick={() => onNav('new')}>Start First Session</Btn>
        </div>
      )}
    </PageWrap>
  )
}

// PLAYERS
function Players({ players, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(null) // null | {} | player
  const [statsMap, setStatsMap] = useState({})
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    ;(async () => {
      const map = {}
      for (const p of players) map[p.id] = await db.playerStats(p.id)
      setStatsMap(map)
    })()
  }, [players])

  return (
    <PageWrap>
      <div className="px-4 pt-4 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Players</h1>
        <button onClick={() => { haptic(); setForm({}) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}>
          + Add
        </button>
      </div>

      <div className="px-4 space-y-2">
        {players.map(p => {
          const s = statsMap[p.id] || {}
          return (
            <Card key={p.id} className="flex items-center gap-3">
              <Avatar player={p} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: '#f0f0f5' }}>{p.name}</p>
                {p.nickname && <p className="text-xs" style={{ color: '#8888a0' }}>"{p.nickname}"</p>}
                <p className="text-xs mt-0.5" style={{ color: '#55556a' }}>{s.sessions||0} sessions · {(s.winPct||0).toFixed(0)}% wins</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className={`font-bold tabular-nums text-sm ${fmt.profitClass(s.totalProfit||0)}`}>{fmt.money(s.totalProfit||0)}</p>
                  <p className="text-xs" style={{ color: '#55556a' }}>total</p>
                </div>
                <button onClick={() => { haptic(); setForm(p) }} className="p-2 rounded-xl active:scale-90" style={{ color: '#55556a' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/>
                    <path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/>
                  </svg>
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {players.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center px-8">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0f0f5' }}>No players yet</h3>
          <p className="text-sm mb-6" style={{ color: '#8888a0' }}>Add your poker crew to start tracking.</p>
          <Btn onClick={() => setForm({})}>Add First Player</Btn>
        </div>
      )}

      {form !== null && (
        <PlayerForm
          player={form?.id ? form : null}
          onSave={async data => { form?.id ? await onUpdate({...form,...data}) : await onAdd(data); setForm(null) }}
          onDelete={form?.id ? async () => { await onDelete(form.id); setForm(null) } : null}
          onClose={() => setForm(null)}
        />
      )}
    </PageWrap>
  )
}

function PlayerForm({ player, onSave, onDelete, onClose }) {
  const [name, setName] = useState(player?.name || '')
  const [nickname, setNickname] = useState(player?.nickname || '')
  const [notes, setNotes] = useState(player?.notes || '')
  const [colorIndex, setColorIndex] = useState(player?.colorIndex ?? 0)
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Sheet onClose={onClose} title={player ? 'Edit Player' : 'New Player'}>
      <div className="flex gap-2 mb-4 flex-wrap">
        {COLORS.map((c, i) => (
          <button key={i} onClick={() => setColorIndex(i)}
            className="rounded-xl active:scale-90 transition-all"
            style={{ width:36, height:36, background:c.bg, color:c.text, fontSize:14, fontWeight:700,
              border: colorIndex===i ? `2px solid ${c.text}` : '2px solid transparent' }}>
            {name?.[0]?.toUpperCase()||'?'}
          </button>
        ))}
      </div>
      <div className="space-y-3 mb-4">
        <Input label="Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        <Input label="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Optional" />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" rows={2} />
      </div>
      <Btn disabled={!name.trim()} onClick={() => { if(name.trim()){haptic();onSave({name:name.trim(),nickname:nickname.trim(),notes:notes.trim(),colorIndex})} }}>
        {player ? 'Save Changes' : 'Add Player'}
      </Btn>
      {onDelete && (
        <div className="mt-2">
          <Btn variant="danger" onClick={() => confirmDel ? (haptic(), onDelete()) : setConfirmDel(true)}>
            {confirmDel ? '⚠️ Confirm Delete' : 'Delete Player'}
          </Btn>
        </div>
      )}
    </Sheet>
  )
}

// ADD SESSION
function NewSession({ players, onSave, editSession, editResults, onCancel }) {
  const [name, setName] = useState(editSession?.name || `Session ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}`)
  const [notes, setNotes] = useState(editSession?.notes || '')
  const [step, setStep] = useState(1)
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editResults?.length && players.length) {
      const e = editResults.map(r => ({ player: players.find(p => p.id === r.playerId), buyIn: String(r.buyIn), cashOut: String(r.cashOut), id: r.id })).filter(x => x.player)
      setEntries(e); setStep(3)
    }
  }, [editResults, players])

  const toggle = (player) => {
    haptic()
    setEntries(prev => prev.find(e => e.player.id === player.id)
      ? prev.filter(e => e.player.id !== player.id)
      : [...prev, { player, buyIn: '', cashOut: '' }])
  }

  const update = (id, field, val) => setEntries(prev => prev.map(e => e.player.id === id ? {...e, [field]: val} : e))

  const totalIn = entries.reduce((s, e) => s + (parseFloat(e.buyIn)||0), 0)
  const totalOut = entries.reduce((s, e) => s + (parseFloat(e.cashOut)||0), 0)
  const balanced = Math.abs(totalIn - totalOut) < 0.01
  const complete = entries.every(e => e.buyIn && e.cashOut)
  const sorted = [...entries].map(e => ({...e, profit:(parseFloat(e.cashOut)||0)-(parseFloat(e.buyIn)||0)})).sort((a,b)=>b.profit-a.profit)

  const save = async () => {
    if (!balanced || !complete) return
    haptic(); setSaving(true)
    const winner = sorted[0]
    await onSave({
      ...editSession, name: name.trim(), notes: notes.trim(),
      playerCount: entries.length,
      biggestWinnerName: winner?.player?.name,
      biggestWin: winner?.profit || 0,
      biggestWinner: winner?.player?.id,
    }, entries.map(e => ({
      id: e.id, playerId: e.player.id,
      buyIn: parseFloat(e.buyIn)||0, cashOut: parseFloat(e.cashOut)||0,
      profit: (parseFloat(e.cashOut)||0)-(parseFloat(e.buyIn)||0),
      sessionDate: editSession?.date || Date.now()
    })))
    setSaving(false)
  }

  const steps = ['Info', 'Players', 'Results']

  return (
    <PageWrap>
      <div className="px-4 pt-4 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>{editSession ? 'Edit Session' : 'New Session'}</h1>
          <div className="flex gap-1.5 mt-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <div className="rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={{ width:20, height:20, background: step>i+1?'#00d68f': step===i+1?'rgba(0,214,143,0.2)':'rgba(255,255,255,0.06)', color: step>=i+1?'#00d68f':'#55556a', border: step===i+1?'1px solid rgba(0,214,143,0.4)':'none' }}>
                    {step>i+1?'✓':i+1}
                  </div>
                  <span className="text-xs" style={{ color: step===i+1?'#00d68f':'#55556a' }}>{s}</span>
                </div>
                {i < 2 && <span style={{ color: '#55556a', fontSize: 10 }}>›</span>}
              </div>
            ))}
          </div>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-2 active:scale-90" style={{ color: '#55556a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="px-4 space-y-4">
          <Input label="Session Name" value={name} onChange={e => setName(e.target.value)} placeholder="Friday Night Poker" />
          <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={3} />
          <Btn onClick={() => { haptic(); setStep(2) }}>Next: Select Players →</Btn>
        </div>
      )}

      {step === 2 && (
        <div className="px-4">
          <p className="text-sm mb-4" style={{ color: '#8888a0' }}>{entries.length} players selected</p>
          {players.length === 0
            ? <Card className="text-center py-8"><p style={{ color: '#8888a0' }}>Add players first.</p></Card>
            : <div className="space-y-2 mb-4">
                {players.map(p => {
                  const sel = entries.some(e => e.player.id === p.id)
                  return (
                    <Card key={p.id} onClick={() => toggle(p)} style={sel ? { borderColor: 'rgba(0,214,143,0.3)', background: 'rgba(0,214,143,0.03)' } : {}}>
                      <div className="flex items-center gap-3">
                        <Avatar player={p} size={44} />
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: '#f0f0f5' }}>{p.name}</p>
                          {p.nickname && <p className="text-xs" style={{ color: '#8888a0' }}>"{p.nickname}"</p>}
                        </div>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                          style={{ background: sel ? '#00d68f' : 'rgba(255,255,255,0.06)', border: sel ? 'none' : '1.5px solid rgba(255,255,255,0.12)' }}>
                          {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
          }
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setStep(1)} className="flex-none w-auto px-6">← Back</Btn>
            <Btn disabled={entries.length < 2} onClick={() => { haptic(); setStep(3) }}>Enter Results →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="px-4">
          {/* Balance bar */}
          <Card className="mb-4" style={complete ? balanced ? { borderColor:'rgba(0,214,143,0.3)',background:'rgba(0,214,143,0.03)' } : { borderColor:'rgba(255,77,109,0.3)',background:'rgba(255,77,109,0.03)' } : {}}>
            <div className="flex justify-between text-sm"><span style={{color:'#8888a0'}}>Total Buy-in</span><span className="font-semibold tabular-nums" style={{color:'#f0f0f5'}}>${totalIn.toFixed(0)}</span></div>
            <div className="flex justify-between text-sm mt-1"><span style={{color:'#8888a0'}}>Total Cash-out</span><span className="font-semibold tabular-nums" style={{color:'#f0f0f5'}}>${totalOut.toFixed(0)}</span></div>
            {complete && (
              <div className={`flex items-center gap-2 mt-2 pt-2 border-t text-sm font-medium`}
                style={{ borderColor: balanced?'rgba(0,214,143,0.2)':'rgba(255,77,109,0.2)', color: balanced?'#00d68f':'#ff4d6d' }}>
                {balanced ? '✅ Balanced — ready to save' : `⚠️ Difference: $${Math.abs(totalIn-totalOut).toFixed(2)}`}
              </div>
            )}
          </Card>

          <div className="space-y-3 mb-4">
            {sorted.map(e => (
              <Card key={e.player.id}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar player={e.player} size={34} />
                  <span className="font-semibold" style={{ color: '#f0f0f5' }}>{e.player.name}</span>
                  {e.buyIn && e.cashOut && (
                    <span className={`ml-auto font-bold tabular-nums text-sm ${fmt.profitClass(e.profit)}`}>{fmt.money(e.profit)}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Buy-in ($)" value={e.buyIn} onChange={ev => update(e.player.id,'buyIn',ev.target.value)} type="number" inputMode="decimal" placeholder="0" />
                  <Input label="Cash-out ($)" value={e.cashOut} onChange={ev => update(e.player.id,'cashOut',ev.target.value)} type="number" inputMode="decimal" placeholder="0" />
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            {!editSession && <Btn variant="secondary" onClick={() => setStep(2)} className="flex-none w-auto px-6">← Back</Btn>}
            <Btn disabled={!balanced||!complete||saving} onClick={save}>
              {saving ? 'Saving...' : editSession ? 'Save Changes' : '🃏 Save Session'}
            </Btn>
          </div>
        </div>
      )}
    </PageWrap>
  )
}

// SESSIONS
function SessionsPage({ sessions, players, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(null)
  const [resultsCache, setResultsCache] = useState({})
  const [confirmDel, setConfirmDel] = useState(null)

  const expand = async (s) => {
    haptic()
    if (expanded === s.id) { setExpanded(null); return }
    setExpanded(s.id)
    if (!resultsCache[s.id]) {
      const res = await db.resultsBySession(s.id)
      const enriched = res.map(r => ({ ...r, player: players.find(p => p.id === r.playerId) })).sort((a,b) => b.profit-a.profit)
      setResultsCache(c => ({ ...c, [s.id]: enriched }))
    }
  }

  return (
    <PageWrap>
      <div className="px-4 pt-4 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Sessions</h1>
        <p className="text-sm mt-1" style={{ color: '#8888a0' }}>{sessions.length} sessions recorded</p>
      </div>

      {sessions.length === 0
        ? <div className="flex flex-col items-center py-20 text-center px-8">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0f0f5' }}>No sessions yet</h3>
            <p className="text-sm" style={{ color: '#8888a0' }}>Your poker nights will appear here.</p>
          </div>
        : <div className="px-4 space-y-3">
            {sessions.map(s => {
              const open = expanded === s.id
              const res = resultsCache[s.id] || []
              return (
                <Card key={s.id} className="overflow-hidden">
                  <button onClick={() => expand(s)} className="w-full flex items-center gap-3 active:opacity-70 transition-opacity">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(0,214,143,0.1)', color: '#00d68f' }}>🃏</div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold truncate" style={{ color: '#f0f0f5' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: '#8888a0' }}>{fmt.date(s.date)} · {s.playerCount||0} players</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.biggestWinnerName && (
                        <div className="text-right">
                          <p className="text-xs font-medium" style={{ color: '#00d68f' }}>{s.biggestWinnerName}</p>
                          <p className="text-xs tabular-nums" style={{ color: '#00d68f' }}>{fmt.money(s.biggestWin||0)}</p>
                        </div>
                      )}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#55556a" strokeWidth="2"
                        style={{ transform: open?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </button>

                  {open && (
                    <div className="mt-4">
                      {s.notes && <p className="text-sm mb-3 px-1" style={{ color: '#8888a0' }}>📝 {s.notes}</p>}
                      <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="grid grid-cols-4 px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.03)', color: '#55556a' }}>
                          <span>Player</span><span className="text-right">In</span><span className="text-right">Out</span><span className="text-right">P/L</span>
                        </div>
                        {res.map((r, i) => (
                          <div key={r.id||i} className="grid grid-cols-4 px-3 py-2.5 items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i===0?'rgba(0,214,143,0.04)':'transparent' }}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              {r.player && <Avatar player={r.player} size={20} />}
                              <span className="text-xs font-medium truncate" style={{ color: '#f0f0f5' }}>{r.player?.name||'?'}</span>
                            </div>
                            <span className="text-xs text-right tabular-nums" style={{ color: '#8888a0' }}>${r.buyIn}</span>
                            <span className="text-xs text-right tabular-nums" style={{ color: '#8888a0' }}>${r.cashOut}</span>
                            <span className={`text-xs font-bold text-right tabular-nums ${fmt.profitClass(r.profit)}`}>{fmt.money(r.profit)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onEdit(s)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
                          style={{ background: 'rgba(76,201,240,0.1)', color: '#4cc9f0', border: '1px solid rgba(76,201,240,0.15)' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => confirmDel===s.id ? (haptic(),onDelete(s.id),setConfirmDel(null),setExpanded(null)) : setConfirmDel(s.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
                          style={{ background: 'rgba(255,77,109,0.08)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.15)' }}>
                          {confirmDel===s.id ? '⚠️ Confirm' : '🗑 Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
      }
    </PageWrap>
  )
}

// LEADERBOARD / RANKS
function Ranks({ players, sessions }) {
  const [mode, setMode] = useState('profit')
  const [allStats, setAllStats] = useState([])
  const [detail, setDetail] = useState(null)
  const [history, setHistory] = useState([])
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    ;(async () => {
      const s = await Promise.all(players.map(async p => ({ player: p, stats: await db.playerStats(p.id) })))
      setAllStats(s)
    })()
  }, [players, sessions])

  const KEY = { profit: 'totalProfit', winpct: 'winPct', avg: 'avgProfit' }[mode]
  const ranked = [...allStats].sort((a,b) => b.stats[KEY] - a.stats[KEY])

  const openDetail = async (player) => {
    haptic()
    setDetail(player)
    const allSess = await db.sessions()
    const sessMap = Object.fromEntries(allSess.map(s => [s.id, s]))
    const results = await db.resultsByPlayer(player.id)
    let running = 0
    const h = results.sort((a,b)=>a.sessionDate-b.sessionDate).map(r => {
      running += r.profit
      return { date: fmt.shortDate(r.sessionDate || sessMap[r.sessionId]?.date), profit: r.profit, running, session: sessMap[r.sessionId]?.name||'Session' }
    })
    setHistory(h)
  }

  const exportCSV = async () => {
    const rows = [['Session','Date','Player','Buy-in','Cash-out','P/L']]
    for (const s of sessions) {
      const res = await db.resultsBySession(s.id)
      res.forEach(r => {
        const p = players.find(x => x.id === r.playerId)
        rows.push([s.name, fmt.date(s.date), p?.name||'?', r.buyIn, r.cashOut, r.profit])
      })
    }
    downloadBlob(rows.map(r=>r.join(',')).join('\n'), `poker-${Date.now()}.csv`, 'text/csv')
  }

  const exportJSON = async () => downloadBlob(JSON.stringify(await db.export(),null,2), `poker-backup-${Date.now()}.json`, 'application/json')

  const importJSON = () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='.json'
    inp.onchange = async e => { const f=e.target.files[0]; if(!f) return; await db.import(JSON.parse(await f.text())); window.location.reload() }
    inp.click()
  }

  return (
    <PageWrap>
      <div className="px-4 pt-4 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Leaderboard</h1>
          <p className="text-sm mt-1" style={{ color: '#8888a0' }}>{players.length} players</p>
        </div>
        <button onClick={() => setShowExport(true)} className="p-2 rounded-xl active:scale-90" style={{ color:'#55556a',background:'rgba(255,255,255,0.05)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {[['profit','Profit'],['winpct','Win %'],['avg','Average']].map(([id,label]) => (
            <button key={id} onClick={() => { haptic(); setMode(id) }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
              style={mode===id?{background:'#00d68f',color:'#0a0a0f'}:{color:'#8888a0'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2 mb-6">
        {ranked.map(({ player, stats }, i) => {
          const medal = ['🥇','🥈','🥉'][i]
          const val = KEY==='winPct' ? `${stats[KEY].toFixed(1)}%` : fmt.money(stats[KEY]||0)
          return (
            <Card key={player.id} onClick={() => openDetail(player)} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{medal || <span className="text-sm font-bold" style={{color:'#55556a'}}>#{i+1}</span>}</span>
              <Avatar player={player} size={42} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: '#f0f0f5' }}>{player.name}</p>
                <p className="text-xs" style={{ color: '#8888a0' }}>{stats.sessions} sessions · {stats.winPct.toFixed(0)}% wins</p>
              </div>
              <div className="text-right">
                <p className={`font-bold tabular-nums ${KEY==='winPct'?'text-sky-400':fmt.profitClass(stats[KEY]||0)}`}>{val}</p>
                <p className="text-xs" style={{ color: '#55556a' }}>{KEY==='winPct'?'win rate':KEY==='avgProfit'?'avg/session':'total'}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Bar chart */}
      {allStats.length > 1 && (
        <div className="px-4 mb-6">
          <h2 className="font-semibold mb-3" style={{ color: '#f0f0f5' }}>📊 Total Profits</h2>
          <Card>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={allStats.slice(0,6).map(({player,stats})=>({name:player.name.split(' ')[0],v:stats.totalProfit}))}>
                <XAxis dataKey="name" stroke="#55556a" tick={{fontSize:11,fill:'#55556a'}}/>
                <YAxis stroke="#55556a" tick={{fontSize:10,fill:'#55556a'}} tickFormatter={v=>`$${v}`}/>
                <Tooltip contentStyle={{background:'#1e1e2a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12}} formatter={v=>[fmt.money(v),'Profit']}/>
                <Bar dataKey="v" radius={[6,6,0,0]} fill="#00d68f"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Player detail */}
      {detail && (
        <div className="fixed inset-0 z-50 scroll" style={{ background:'#0a0a0f', paddingTop:'max(env(safe-area-inset-top),44px)', paddingBottom:'max(env(safe-area-inset-bottom),24px)' }}>
          <div className="px-4 pt-4 pb-2 flex items-center">
            <button onClick={() => setDetail(null)} className="p-2 rounded-xl active:scale-90" style={{ color: '#55556a' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>
          <div className="flex flex-col items-center mb-6">
            <Avatar player={detail} size={64} />
            <h2 className="text-2xl font-bold mt-3" style={{ color: '#f0f0f5' }}>{detail.name}</h2>
            {detail.nickname && <p style={{ color: '#8888a0' }}>"{detail.nickname}"</p>}
          </div>
          {(() => {
            const s = allStats.find(x => x.player.id === detail.id)?.stats
            if (!s) return null
            return (
              <div className="px-4">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label:'Total Profit', v:fmt.money(s.totalProfit), cls:fmt.profitClass(s.totalProfit) },
                    { label:'Sessions', v:s.sessions, cls:'text-white' },
                    { label:'Win Rate', v:`${s.winPct.toFixed(1)}%`, cls:'text-sky-400' },
                    { label:'Avg/Session', v:fmt.money(s.avgProfit), cls:fmt.profitClass(s.avgProfit) },
                    { label:'Biggest Win', v:fmt.money(s.biggestWin), cls:'text-emerald-400' },
                    { label:'Biggest Loss', v:fmt.money(s.biggestLoss), cls:'text-rose-400' },
                  ].map(({label,v,cls}) => (
                    <Card key={label} style={{ background:'#1e1e2a' }}>
                      <p className="text-xs mb-1" style={{ color:'#8888a0' }}>{label}</p>
                      <p className={`text-xl font-bold tabular-nums ${cls}`}>{v}</p>
                    </Card>
                  ))}
                </div>
                {history.length > 1 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3" style={{ color:'#f0f0f5' }}>📈 Running Total</h3>
                    <Card>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={history}>
                          <XAxis dataKey="date" stroke="#55556a" tick={{fontSize:10,fill:'#55556a'}}/>
                          <YAxis stroke="#55556a" tick={{fontSize:10,fill:'#55556a'}} tickFormatter={v=>`$${v}`}/>
                          <Tooltip contentStyle={{background:'#1e1e2a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12}} formatter={v=>[fmt.money(v),'Total']}/>
                          <Line type="monotone" dataKey="running" stroke="#00d68f" strokeWidth={2.5} dot={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}
                <h3 className="font-semibold mb-3" style={{ color:'#f0f0f5' }}>Session Results</h3>
                <div className="space-y-2 mb-8">
                  {[...history].reverse().map((h,i) => (
                    <Card key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color:'#f0f0f5' }}>{h.session}</p>
                        <p className="text-xs" style={{ color:'#55556a' }}>{h.date}</p>
                      </div>
                      <span className={`font-bold tabular-nums ${fmt.profitClass(h.profit)}`}>{fmt.money(h.profit)}</span>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Export sheet */}
      {showExport && (
        <Sheet onClose={() => setShowExport(false)} title="Data & Export">
          <div className="space-y-2">
            <Btn variant="secondary" onClick={exportCSV}>📊 Export to CSV</Btn>
            <Btn variant="secondary" onClick={exportJSON}>💾 Export JSON Backup</Btn>
            <Btn variant="secondary" onClick={importJSON}>📥 Import Backup</Btn>
          </div>
        </Sheet>
      )}
    </PageWrap>
  )
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
function PageWrap({ children }) {
  return (
    <div className="page scroll" style={{ height:'100%', paddingTop:'max(env(safe-area-inset-top),44px)', paddingBottom:'calc(max(env(safe-area-inset-bottom),20px) + 72px)' }}>
      {children}
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState('dashboard')
  const [players, setPlayers] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [editSession, setEditSession] = useState(null)
  const [editResults, setEditResults] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [p, s] = await Promise.all([db.players(), db.sessions()])
      setPlayers(p); setSessions(s); setLoading(false)
    })()
  }, [])

  const notify = (message, type = 'success') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 2500)
  }

  const reload = async () => {
    const [p, s] = await Promise.all([db.players(), db.sessions()])
    setPlayers(p); setSessions(s)
  }

  const go = (t) => {
    if (t !== 'new') { setEditSession(null); setEditResults(null) }
    setTab(t)
  }

  const onSaveSession = async (sessionData, results) => {
    if (editSession) { await db.saveSession(sessionData, results); notify('Session updated!') }
    else { await db.saveSession(sessionData, results); notify('Session saved! 🃏') }
    await reload(); setEditSession(null); setEditResults(null); go('sessions')
  }

  const onEditSession = async (s) => {
    const res = await db.resultsBySession(s.id)
    setEditSession(s); setEditResults(res); go('new')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background:'#0a0a0f' }}>
      <div className="text-5xl animate-bounce">🃏</div>
    </div>
  )

  return (
    <div style={{ height:'100%', background:'#0a0a0f', display:'flex', flexDirection:'column', position:'relative' }}>
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        {tab === 'dashboard' && <Dashboard players={players} sessions={sessions} onNav={go} />}
        {tab === 'players' && (
          <Players
            players={players}
            onAdd={async d => { await db.savePlayer({...d,createdAt:Date.now()}); await reload(); notify('Player added!') }}
            onUpdate={async d => { await db.savePlayer(d); await reload(); notify('Player updated!') }}
            onDelete={async id => { await db.deletePlayer(id); await reload(); notify('Player removed') }}
          />
        )}
        {tab === 'new' && <NewSession players={players} onSave={onSaveSession} editSession={editSession} editResults={editResults} onCancel={editSession ? () => { setEditSession(null); setEditResults(null); go('sessions') } : null} />}
        {tab === 'sessions' && <SessionsPage sessions={sessions} players={players} onDelete={async id => { await db.deleteSession(id); await reload(); notify('Session deleted') }} onEdit={onEditSession} />}
        {tab === 'ranks' && <Ranks players={players} sessions={sessions} />}
      </div>
      <BottomNav active={tab} onChange={go} />
      {toast && <Toast {...toast} />}
    </div>
  )
}

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
