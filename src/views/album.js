import { get, on } from '../state.js'
import { GROUPS } from '../data/stickers.js'
import { parseList, formatExportList } from '../utils/parseList.js'
import { addSticker, removeSticker } from '../firebase/db.js'
import { set as setState } from '../state.js'
import { toast } from '../utils/toast.js'

const GROUP_COLORS = {
  esp:'#d4a44c', A:'#d4725a', B:'#e08a4c', C:'#d4b844', D:'#4ea878',
  E:'#4aa8c0',  F:'#5e74d8', G:'#8a6ad8', H:'#d86a90',
  I:'#4aa898',  J:'#a484d8', K:'#86b840', L:'#d87a4c',
}

const CHEV_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`
const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

const openTeams = new Set()
let container = null
let currentFilter = 'all'
let prevCollected = new Set()

export function mount(el) {
  container = el
  el.innerHTML = `
    <div class="alb-sticky">
      <div class="alb-search-wrap">
        <svg class="alb-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="alb-search" class="alb-search-inp" placeholder="Buscar equipo o codigo" autocomplete="off">
        <button id="alb-clear" class="alb-clear" style="display:none">&times;</button>
      </div>
      <div class="filter-row" id="alb-filters">
        <button class="filter-chip act" data-filter="all">Todos</button>
        <button class="filter-chip" data-filter="done">Completos</button>
        <button class="filter-chip" data-filter="pend">Pendientes</button>
      </div>
      <div class="alb-jumps" id="alb-jumps">
        ${GROUPS.map(g => `<button class="alb-jump-btn" data-jump="${g.id}">${g.id === 'esp' ? '★' : g.id}</button>`).join('')}
      </div>
      <button class="btn btn-s" id="alb-export-pend" style="display:none;width:100%;margin-top:8px">Copiar pendientes al portapapeles</button>
    </div>
    <div id="alb-list"></div>

    <div class="card" id="alb-compare-card" style="display:none">
      <div class="ing-bulk-toggle" id="alb-compare-toggle">
        <span class="ing-bulk-label">Comparar con lista de otro</span>
        <span class="ing-bulk-arrow" id="alb-compare-arrow">&#9660;</span>
      </div>
      <div id="alb-compare-body" style="display:none">
        <textarea id="alb-compare-txt" class="bulk-inp" placeholder="MEX 🇲🇽: 5, 13, 17&#10;KOR 🇰🇷: 7, 16"></textarea>
        <button class="btn btn-p btn-full" id="alb-compare-btn" style="margin-top:12px">Ver cuales me sirven</button>
        <div id="alb-compare-result" style="margin-top:16px"></div>
      </div>
    </div>
  `

  const searchEl = el.querySelector('#alb-search')
  const clearEl  = el.querySelector('#alb-clear')

  searchEl.addEventListener('input', e => {
    clearEl.style.display = e.target.value ? 'flex' : 'none'
    render()
  })
  clearEl.addEventListener('click', () => {
    searchEl.value = ''
    clearEl.style.display = 'none'
    render()
    searchEl.focus()
  })

  el.querySelector('#alb-filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]')
    if (!chip) return
    currentFilter = chip.dataset.filter
    el.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('act'))
    chip.classList.add('act')
    const isPend = currentFilter === 'pend'
    el.querySelector('#alb-export-pend').style.display  = isPend ? 'block' : 'none'
    el.querySelector('#alb-compare-card').style.display = isPend ? 'block' : 'none'
    if (!isPend) el.querySelector('#alb-compare-result').innerHTML = ''
    render()
  })

  el.querySelector('#alb-export-pend').addEventListener('click', exportPending)

  // Collapsible compare
  let compareOpen = false
  el.querySelector('#alb-compare-toggle').addEventListener('click', () => {
    compareOpen = !compareOpen
    el.querySelector('#alb-compare-body').style.display = compareOpen ? 'block' : 'none'
    el.querySelector('#alb-compare-arrow').classList.toggle('open', compareOpen)
  })
  el.querySelector('#alb-compare-btn').addEventListener('click', () => {
    const text = el.querySelector('#alb-compare-txt').value
    renderCompareResult(el, parseAndCompare(text))
  })

  el.querySelector('#alb-jumps').addEventListener('click', e => {
    const btn = e.target.closest('[data-jump]')
    if (!btn) return
    const target = document.getElementById('alb-group-' + btn.dataset.jump)
    if (!target) return
    const sticky = el.querySelector('.alb-sticky')
    const offset = sticky ? sticky.offsetHeight + 28 : 0
    const top = target.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  })

  el.querySelector('#alb-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-code]')
    if (btn) { toggleSticker(btn.dataset.code); return }
    const hdr = e.target.closest('[data-team-hdr]')
    if (hdr) toggleTeam(hdr.dataset.teamHdr)
  })

  on(newCollected => {
    const added   = [...newCollected].filter(c => !prevCollected.has(c))
    const removed = [...prevCollected].filter(c => !newCollected.has(c))
    ;[...added, ...removed].forEach(code => patchButton(code, newCollected.has(code)))
    if (added.length || removed.length) patchAllTeamStats()
    prevCollected = new Set(newCollected)
  })

  render()
  prevCollected = new Set(get())
}

export function onActive() {
  render()
  prevCollected = new Set(get())
}

export function jumpToGroup(groupId) {
  const target = document.getElementById('alb-group-' + groupId)
  if (!target) return
  const sticky = container?.querySelector('.alb-sticky')
  const offset = sticky ? sticky.offsetHeight + 28 : 0
  const top = target.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}

export function jumpToTeam(teamId) {
  // Abrir el equipo si no está abierto
  if (!openTeams.has(teamId)) toggleTeam(teamId)

  const target = document.getElementById('tc-' + teamId)
  if (!target) return
  const sticky = container?.querySelector('.alb-sticky')
  const offset = sticky ? sticky.offsetHeight + 28 : 0
  const top = target.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}

function render() {
  const filterVal = container?.querySelector('#alb-search')?.value ?? ''
  const fl = filterVal.toLowerCase()
  const collected = get()

  document.getElementById('alb-list').innerHTML = GROUPS.map(g => {
    const color = GROUP_COLORS[g.id] ?? '#d4a44c'

    let teamsHtml = g.teams.map(t => {
      if (fl && !t.name.toLowerCase().includes(fl) && !t.id.toLowerCase().includes(fl)) return null

      const got   = t.stickers.filter(s => collected.has(s)).length
      const total = t.stickers.length
      const pct   = total ? Math.round(got / total * 100) : 0
      const done  = got === total && total > 0
      const isOpen = openTeams.has(t.id)

      if (currentFilter === 'done' && !done) return null
      if (currentFilter === 'pend' && done)  return null

      const flagHtml = t.id !== 'FIFA'
        ? `<img class="team-flag" src="https://play.fifa.com/media/image/bracket_predictor/flags/world_cup_2026/${t.id}.svg" alt="" loading="lazy">`
        : ''

      const btns = t.stickers.map(s => {
        const lbl = t.id === 'FIFA' ? s : s.replace(t.id, '')
        return `<button class="sticker-btn${collected.has(s) ? ' got' : ''}" style="${collected.has(s) ? 'background:' + color : ''}" data-code="${s}">${lbl}</button>`
      }).join('')

      return `
        <div class="team-tile${isOpen ? ' open' : ''}" id="tc-${t.id}">
          <div class="team-tile-hdr" data-team-hdr="${t.id}">
            ${flagHtml}
            <span class="team-tile-code" style="color:${color};background:${color}18;border:1px solid ${color}40">${t.id}</span>
            <span class="team-tile-name">${t.name}</span>
            <span class="team-tile-stat" id="cnt-${t.id}">${got}/${total}</span>
            ${done ? `<span class="team-tile-check">${CHECK_SVG}</span>` : ''}
            <span class="chev">${CHEV_SVG}</span>
          </div>
          <div class="team-tile-bar">
            <div class="team-tile-fill${done ? ' full' : ''}" id="mf-${t.id}" style="width:${pct}%;${done ? '' : 'background:' + color}"></div>
          </div>
          <div class="sticker-grid${isOpen ? ' open' : ''}" id="sg-${t.id}">${btns}</div>
        </div>`
    }).filter(Boolean).join('')

    if (!teamsHtml) return ''

    return `
      <div class="sec-divider" id="alb-group-${g.id}">
        <span class="sec-divider-text" style="color:${color}">${g.label}</span>
        <span class="sec-divider-line"></span>
      </div>${teamsHtml}`
  }).join('')

  if (!document.getElementById('alb-list').innerHTML.trim()) {
    document.getElementById('alb-list').innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <p>Sin resultados</p>
        <span>Proba con otro termino o filtro</span>
      </div>`
  }
}

function parseAndCompare(text) {
  const collected = get()
  return parseList(text).filter(code => !collected.has(code))
}

function renderCompareResult(el, matches) {
  const resultEl = el.querySelector('#alb-compare-result')
  if (!matches.length) {
    resultEl.innerHTML = `<p style="color:var(--text-3);font-size:13px">Ninguna de esas me sirve.</p>`
    return
  }
  let html = `<p style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Me sirven — ${matches.length}</p>`
  html += `<div class="chips-row" style="margin-bottom:16px">`
  html += matches.map(c => `<span class="chip-tag" style="cursor:default">${c}</span>`).join('')
  html += `</div>`
  html += `<button class="btn btn-s" id="alb-compare-copy" style="width:100%">Copiar lista al portapapeles</button>`
  resultEl.innerHTML = html
  resultEl.querySelector('#alb-compare-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(formatExportList(matches))
      .then(() => toast('Lista copiada al portapapeles', 'ok'))
      .catch(() => toast('No se pudo copiar', 'err'))
  })
}

function exportPending() {
  const collected = get()
  const missing = []
  GROUPS.forEach(g => g.teams.forEach(t => {
    t.stickers.forEach(s => { if (!collected.has(s)) missing.push(s) })
  }))
  if (!missing.length) { toast('No hay pendientes', 'ok'); return }
  navigator.clipboard.writeText(formatExportList(missing))
    .then(() => toast('Pendientes copiadas al portapapeles', 'ok'))
    .catch(() => toast('No se pudo copiar', 'err'))
}

function toggleTeam(id) {
  if (openTeams.has(id)) openTeams.delete(id); else openTeams.add(id)
  document.getElementById('tc-' + id)?.classList.toggle('open', openTeams.has(id))
  document.getElementById('sg-' + id)?.classList.toggle('open', openTeams.has(id))
}

function toggleSticker(code) {
  const c = get()
  const next = new Set(c)
  if (c.has(code)) {
    next.delete(code); setState(next); removeSticker(code)
    toast(`${code} eliminada`, 'dup')
  } else {
    next.add(code); setState(next); addSticker(code)
    toast(`${code} agregada`, 'ok')
  }
}

function patchButton(code, isCollected) {
  const el = document.querySelector(`[data-code="${code}"]`)
  if (!el) return
  el.classList.toggle('got', isCollected)
  const color = GROUP_COLORS[Object.keys(GROUP_COLORS).find(k => code.startsWith(k)) || 'esp'] || '#d4a44c'
  el.style.background = isCollected ? color : ''
}

function patchAllTeamStats() {
  const collected = get()
  GROUPS.forEach(g => g.teams.forEach(t => {
    const got  = t.stickers.filter(s => collected.has(s)).length
    const pct  = Math.round(got / t.stickers.length * 100)
    const done = got === t.stickers.length
    const cnt  = document.getElementById('cnt-' + t.id)
    const mf   = document.getElementById('mf-' + t.id)
    const color = GROUP_COLORS[g.id] ?? '#d4a44c'
    if (cnt) cnt.textContent = `${got}/${t.stickers.length}`
    if (mf) {
      mf.style.width = pct + '%'
      if (done) { mf.className = 'team-tile-fill full' }
      else      { mf.className = 'team-tile-fill'; mf.style.background = color }
    }
  }))
}
