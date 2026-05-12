import { getDupes, onDupes } from '../state.js'
import { GROUPS } from '../data/stickers.js'
import { parseList, formatExportList } from '../utils/parseList.js'
import { removeDupe } from '../firebase/db.js'
import { toast } from '../utils/toast.js'

const GROUP_COLORS = {
  esp:'#d4a44c', A:'#d4725a', B:'#e08a4c', C:'#d4b844', D:'#4ea878',
  E:'#4aa8c0',  F:'#5e74d8', G:'#8a6ad8', H:'#d86a90',
  I:'#4aa898',  J:'#a484d8', K:'#86b840', L:'#d87a4c',
}

let container = null

export function mount(el) {
  container = el
  el.innerHTML = `
    <div class="rep-summary card" id="rep-summary">
      <div class="rep-summary-nums">
        <div>
          <div class="rep-big-num" id="rep-total-codes">0</div>
          <div class="rep-big-lbl">codigos distintos</div>
        </div>
        <div class="rep-divider"></div>
        <div>
          <div class="rep-big-num" id="rep-total-count">0</div>
          <div class="rep-big-lbl">repetidas en total</div>
        </div>
      </div>
      <button class="btn btn-s rep-export-btn" id="rep-export" style="margin-top:14px;width:100%">
        Copiar lista al portapapeles
      </button>
    </div>
    <div id="rep-list"></div>
    <div id="rep-empty" style="display:none" class="rep-empty">
      <p>No tengo repetidas</p>
    </div>

    <div class="card" id="rep-compare-card">
      <div class="ing-bulk-toggle" id="rep-compare-toggle">
        <span class="ing-bulk-label">Comparar con lista de otro</span>
        <span class="ing-bulk-arrow" id="rep-compare-arrow">&#9660;</span>
      </div>
      <div id="rep-compare-body" style="display:none">
        <textarea id="rep-compare-txt" class="bulk-inp" placeholder="MEX 🇲🇽: 5, 13, 17&#10;KOR 🇰🇷: 7, 16"></textarea>
        <button class="btn btn-p btn-full" id="rep-compare-btn" style="margin-top:12px">Ver cuales tengo</button>
        <div id="rep-compare-result" style="margin-top:16px"></div>
      </div>
    </div>
  `

  el.querySelector('#rep-export').addEventListener('click', exportToClipboard)

  // Collapsible compare
  let compareOpen = false
  el.querySelector('#rep-compare-toggle').addEventListener('click', () => {
    compareOpen = !compareOpen
    el.querySelector('#rep-compare-body').style.display = compareOpen ? 'block' : 'none'
    el.querySelector('#rep-compare-arrow').classList.toggle('open', compareOpen)
  })
  el.querySelector('#rep-compare-btn').addEventListener('click', () => {
    const text = el.querySelector('#rep-compare-txt').value
    const matches = compareList(text)
    renderCompareResult(el, matches)
  })

  onDupes(() => render())
  render()
}

function exportToClipboard() {
  const active = Object.fromEntries(
    Object.entries(getDupes()).filter(([, n]) => n > 0)
  )
  if (!Object.keys(active).length) { toast('No hay repetidas', 'dup'); return }

  const codes = []
  GROUPS.forEach(g => g.teams.forEach(t => {
    t.stickers.forEach(s => { if (active[s]) codes.push(s) })
  }))

  navigator.clipboard.writeText(formatExportList(codes))
    .then(() => toast('Lista copiada al portapapeles', 'ok'))
    .catch(() => toast('No se pudo copiar', 'err'))
}

function compareList(text) {
  const dupes = getDupes()
  return parseList(text).filter(code => (dupes[code] ?? 0) > 0)
}

function renderCompareResult(el, matches) {
  const resultEl = el.querySelector('#rep-compare-result')
  if (!matches.length) {
    resultEl.innerHTML = `<p style="color:var(--text-3);font-size:13px">No tengo ninguna repetida de su lista.</p>`
    return
  }

  let html = `<p style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
    Tengo para darle — ${matches.length}
  </p>`
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">`
  html += matches.map(c => `
    <label class="rep-give-label">
      <input type="checkbox" class="rep-give-chk" value="${c}" checked style="accent-color:var(--accent)">
      <span>${c}</span>
    </label>`).join('')
  html += `</div>`
  html += `<div style="display:flex;gap:8px">`
  html += `<button class="btn btn-s" id="rep-compare-copy" style="flex:1">Copiar seleccionadas</button>`
  html += `<button class="btn btn-p" id="rep-compare-give" style="flex:1">Dar seleccionadas</button>`
  html += `</div>`

  resultEl.innerHTML = html

  resultEl.querySelector('#rep-compare-copy').addEventListener('click', () => {
    const selected = [...resultEl.querySelectorAll('.rep-give-chk:checked')].map(c => c.value)
    if (!selected.length) { toast('Nada seleccionado', 'dup'); return }
    navigator.clipboard.writeText(formatExportList(selected))
      .then(() => toast('Lista copiada al portapapeles', 'ok'))
      .catch(() => toast('No se pudo copiar', 'err'))
  })

  resultEl.querySelector('#rep-compare-give').addEventListener('click', () => {
    const selected = [...resultEl.querySelectorAll('.rep-give-chk:checked')].map(c => c.value)
    if (!selected.length) { toast('Nada seleccionado', 'dup'); return }
    selected.forEach(code => removeDupe(code))
    toast(`${selected.length} repetida${selected.length > 1 ? 's' : ''} eliminada${selected.length > 1 ? 's' : ''}`, 'ok')
    resultEl.innerHTML = ''
    el.querySelector('#rep-compare-txt').value = ''
  })
}

function render() {
  if (!container) return
  const dupes = getDupes()

  // Filtrar solo los que tienen count > 0
  const active = Object.fromEntries(
    Object.entries(dupes).filter(([, n]) => n > 0)
  )

  const totalCodes = Object.keys(active).length
  const totalCount = Object.values(active).reduce((a, b) => a + b, 0)

  container.querySelector('#rep-total-codes').textContent = totalCodes
  container.querySelector('#rep-total-count').textContent = totalCount

  const listEl  = container.querySelector('#rep-list')
  const emptyEl = container.querySelector('#rep-empty')

  if (totalCodes === 0) {
    listEl.innerHTML  = ''
    emptyEl.style.display = 'block'
    return
  }
  emptyEl.style.display = 'none'

  // Agrupar por equipo
  let html = ''
  GROUPS.forEach(g => {
    const color = GROUP_COLORS[g.id] ?? '#d4920f'
    const teamRows = g.teams.map(t => {
      const teamDupes = t.stickers
        .filter(s => active[s])
        .map(s => ({ code: s, count: active[s] }))
      if (!teamDupes.length) return ''

      const chips = teamDupes.map(({ code, count }) => {
        const label = t.id === 'FIFA' ? code : code.replace(t.id, '')
        return `
          <div class="rep-chip" data-code="${code}">
            <span class="rep-chip-code">${label}</span>
            <span class="rep-chip-count">×${count}</span>
            <button class="rep-chip-minus" data-code="${code}" title="Dar de baja una repetida">−</button>
          </div>`
      }).join('')

      return `
        <div class="rep-team-row">
          <span class="rep-team-badge" style="color:${color};background:${color}18;border-color:${color}40">${t.id}</span>
          <span class="rep-team-name">${t.name}</span>
          <div class="rep-chips">${chips}</div>
        </div>`
    }).join('')

    if (!teamRows.trim()) return
    html += `
      <div class="rep-group-hdr">
        <span style="color:${color}">${g.label}</span>
        <span class="rep-group-line"></span>
      </div>
      <div class="card" style="padding:12px 16px">${teamRows}</div>`
  })

  listEl.innerHTML = html

  // Eventos: dar de baja repetida
  listEl.querySelectorAll('.rep-chip-minus').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const code = btn.dataset.code
      removeDupe(code)
      toast(`${code} — 1 repetida menos`, 'dup')
    })
  })
}
