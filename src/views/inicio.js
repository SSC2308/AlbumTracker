import { get, on } from '../state.js'
import { GROUPS, TOTAL } from '../data/stickers.js'
import { migrateOldCodes } from '../firebase/db.js'
import { toast } from '../utils/toast.js'

const GRP_COLORS = {
  esp:'#d4a44c', A:'#d4725a', B:'#e08a4c', C:'#d4b844', D:'#4ea878',
  E:'#4aa8c0',  F:'#5e74d8', G:'#8a6ad8', H:'#d86a90',
  I:'#4aa898',  J:'#a484d8', K:'#86b840', L:'#d87a4c',
}

const CIRC = +(2 * Math.PI * 54).toFixed(2)

function checkSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
}

let _onGroupClick = null
let _onTeamClick  = null

export function mount(el, { onGroupClick, onTeamClick } = {}) {
  _onGroupClick = onGroupClick || null
  _onTeamClick  = onTeamClick  || null
  el.innerHTML = `
    <div class="hero">
      <img src="/album.png" alt="Album Panini 2026" class="hero-cover">

      <div class="hero-right">
        <div class="ring-wrap">
          <svg class="ring-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#d4a44c"/>
                <stop offset="100%" stop-color="#e2be6e"/>
              </linearGradient>
            </defs>
            <circle class="ring-track" cx="60" cy="60" r="54"/>
            <circle class="ring-prog" cx="60" cy="60" r="54" id="i-ring"/>
          </svg>
          <div class="ring-center">
            <span class="ring-pct" id="i-pct">0%</span>
            <span class="ring-sub" id="i-count">0 / ${TOTAL}</span>
          </div>
        </div>

        <div class="hero-meta">
          <h1 class="hero-meta-title">Mi Album</h1>
          <p class="hero-meta-sub">FIFA World Cup 2026</p>
        </div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-pill">
        <div class="stat-pill-icon ok">${checkSvg()}</div>
        <div>
          <div class="stat-pill-num" id="i-complete" style="color:var(--ok)">0</div>
          <div class="stat-pill-lbl">Equipos completos</div>
        </div>
      </div>
      <div class="stat-pill">
        <div class="stat-pill-icon warn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div class="stat-pill-num" id="i-missing" style="color:var(--warn)">${TOTAL}</div>
          <div class="stat-pill-lbl">Me faltan</div>
        </div>
      </div>
    </div>

    <div class="section-hdr">
      <span class="section-title">Progreso por grupo</span>
      <span class="section-badge" id="i-teams-badge">0/${GROUPS.reduce((a,g)=>a+g.teams.length,0)}</span>
    </div>
    <div id="i-groups"></div>

    <div id="i-migrate-card" class="card" style="display:none;border:1px solid var(--warn);margin-top:8px">
      <div class="section-hdr" style="margin-bottom:8px">
        <span class="section-title" style="color:var(--warn)">Codigos desactualizados</span>
      </div>
      <p style="font-size:13px;color:var(--text-3);margin-bottom:12px">Se detectaron códigos con nombres viejos (JAP→JPN, FW→FWC). Tocá para corregirlos automáticamente.</p>
      <button class="btn btn-p btn-full" id="i-migrate-btn">Corregir ahora</button>
    </div>
  `

  on(collected => {
    update(collected)
    checkMigration(collected)
  })
  update(get())
  checkMigration(get())

  el.querySelector('#i-migrate-btn').addEventListener('click', async () => {
    const btn = el.querySelector('#i-migrate-btn')
    btn.disabled = true
    btn.textContent = 'Corrigiendo...'
    try {
      const { fixed } = await migrateOldCodes()
      toast(`${fixed} código${fixed !== 1 ? 's' : ''} corregido${fixed !== 1 ? 's' : ''}`, 'ok')
      el.querySelector('#i-migrate-card').style.display = 'none'
    } catch {
      toast('Error al migrar', 'err')
      btn.disabled = false
      btn.textContent = 'Corregir ahora'
    }
  })
}

function checkMigration(collected) {
  const hasOld = [...collected].some(c =>
    c === '00' || c.startsWith('JAP') || /^FW\d+$/.test(c)
  )
  const card = document.getElementById('i-migrate-card')
  if (card) card.style.display = hasOld ? 'block' : 'none'
}

function update(collected) {
  const got = collected.size
  const pct = TOTAL ? Math.round(got / TOTAL * 100) : 0

  const ring = document.getElementById('i-ring')
  if (ring) ring.style.strokeDashoffset = CIRC - (pct / 100) * CIRC

  const pctEl = document.getElementById('i-pct')
  if (pctEl) pctEl.textContent = pct + '%'

  const cntEl = document.getElementById('i-count')
  if (cntEl) cntEl.textContent = `${got} / ${TOTAL}`

  let complete = 0, missing = 0
  GROUPS.forEach(g => g.teams.forEach(t => {
    const c = t.stickers.filter(s => collected.has(s)).length
    if (c === t.stickers.length && t.stickers.length > 0) complete++
    else missing += t.stickers.length - c
  }))

  const compEl = document.getElementById('i-complete')
  const missEl = document.getElementById('i-missing')
  if (compEl) compEl.textContent = complete
  if (missEl) missEl.textContent = missing

  const badge = document.getElementById('i-teams-badge')
  const totalTeams = GROUPS.reduce((a, g) => a + g.teams.length, 0)
  if (badge) badge.textContent = `${complete}/${totalTeams} equipos`

  const grpEl = document.getElementById('i-groups')
  if (!grpEl) return

  grpEl.innerHTML = GROUPS.map(g => {
    const total = g.teams.reduce((a, t) => a + t.stickers.length, 0)
    const c     = g.teams.reduce((a, t) => a + t.stickers.filter(s => collected.has(s)).length, 0)
    const p     = total ? Math.round(c / total * 100) : 0
    const color = GRP_COLORS[g.id] ?? '#d4a44c'

    const teamChips = g.teams.map(t => {
      const g2 = t.stickers.filter(s => collected.has(s)).length
      const done = g2 === t.stickers.length && t.stickers.length > 0
      const flagHtml = t.id !== 'FIFA'
        ? `<img class="chip-flag-img" src="https://play.fifa.com/media/image/bracket_predictor/flags/world_cup_2026/${t.id}.svg" alt="" loading="lazy">`
        : ''
      return `<span class="team-chip ${done ? 'done' : ''}" data-team="${t.id}" style="cursor:pointer">${flagHtml}${t.id} <span style="opacity:.7">${g2}/${t.stickers.length}</span></span>`
    }).join('')

    return `
      <div class="grp-card" data-group="${g.id}" style="cursor:pointer">
        <div class="grp-card-hdr">
          <span class="grp-card-dot" style="background:${color}"></span>
          <span class="grp-card-name">${g.label}</span>
          <span class="grp-card-pct">${p}%</span>
        </div>
        <div class="grp-card-bar">
          <div class="grp-card-fill" style="width:${p}%;background:${color}"></div>
        </div>
        <div class="grp-card-teams">${teamChips}</div>
      </div>`
  }).join('')

  if (_onGroupClick) {
    grpEl.querySelectorAll('[data-group]').forEach(card => {
      card.addEventListener('click', () => _onGroupClick(card.dataset.group))
    })
  }

  if (_onTeamClick) {
    grpEl.querySelectorAll('[data-team]').forEach(chip => {
      chip.addEventListener('click', e => {
        e.stopPropagation() // no disparar el click del grupo
        _onTeamClick(chip.dataset.team)
      })
    })
  }
}
