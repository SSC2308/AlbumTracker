import { get, getDupes, onDupes, getTrades, onTrades, set as setState } from '../state.js'
import { GROUPS, ALL_CODES } from '../data/stickers.js'
import { parseList, formatExportList } from '../utils/parseList.js'
import { addSticker, addDupe, removeDupe, savePendingTrade, completeTrade, cancelTrade } from '../firebase/db.js'
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

    <div id="rep-pending-trades"></div>

    <div class="card" id="rep-trade-card">
      <div class="ing-bulk-toggle" id="rep-trade-toggle">
        <span class="ing-bulk-label">Nuevo intercambio</span>
        <span class="ing-bulk-arrow" id="rep-trade-arrow">&#9660;</span>
      </div>
      <div id="rep-trade-body" style="display:none;padding-top:12px">

        <input id="rep-trade-name" class="ing-input" type="text"
          placeholder="Nombre (ej: Juan)"
          autocomplete="off" autocorrect="off" autocapitalize="words"
          style="margin-bottom:18px;width:100%;box-sizing:border-box">

        <p class="trade-section-lbl">Lo que doy — mis repetidas que me pide</p>
        <textarea id="rep-trade-give-txt" class="bulk-inp"
          placeholder="MEX 🇲🇽: 5, 13&#10;KOR 🇰🇷: 7, 16"></textarea>
        <button class="btn btn-s btn-full" id="rep-trade-give-btn" style="margin-top:8px">
          Ver cuales tengo
        </button>
        <div id="rep-trade-give-result" style="margin-top:12px"></div>

        <p class="trade-section-lbl" style="margin-top:20px">Lo que recibo</p>
        <textarea id="rep-trade-recv-txt" class="bulk-inp"
          placeholder="ARG 🇦🇷: 2, 8&#10;BRA 🇧🇷: 11"></textarea>
        <button class="btn btn-s btn-full" id="rep-trade-recv-btn" style="margin-top:8px">
          Ver preview
        </button>
        <div id="rep-trade-recv-result" style="margin-top:12px"></div>

        <button class="btn btn-p btn-full" id="rep-trade-confirm" style="margin-top:20px">
          Crear intercambio
        </button>
      </div>
    </div>
  `

  el.querySelector('#rep-export').addEventListener('click', exportToClipboard)

  // Collapsible trade
  let tradeOpen = false
  el.querySelector('#rep-trade-toggle').addEventListener('click', () => {
    tradeOpen = !tradeOpen
    el.querySelector('#rep-trade-body').style.display = tradeOpen ? 'block' : 'none'
    el.querySelector('#rep-trade-arrow').classList.toggle('open', tradeOpen)
  })
  el.querySelector('#rep-trade-give-btn').addEventListener('click', () => {
    const text = el.querySelector('#rep-trade-give-txt').value
    const matches = compareList(text)
    renderTradeGive(el, matches)
  })
  el.querySelector('#rep-trade-recv-btn').addEventListener('click', () => {
    const text = el.querySelector('#rep-trade-recv-txt').value
    renderTradeRecv(el, parseList(text))
  })
  el.querySelector('#rep-trade-confirm').addEventListener('click', () => createTrade(el))

  onDupes(() => render())
  onTrades(() => renderPendingTrades(el))
  render()
  renderPendingTrades(el)
}

function exportToClipboard() {
  const collected = get()
  const active = Object.fromEntries(
    Object.entries(getDupes()).filter(([code, n]) => n > 0 && collected.has(code))
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
  const dupes     = getDupes()
  const collected = get()
  return parseList(text).filter(code => (dupes[code] ?? 0) > 0 && collected.has(code))
}


/* ── Trade: lo que doy ── */
function renderTradeGive(el, matches) {
  const resultEl = el.querySelector('#rep-trade-give-result')
  if (!matches.length) {
    resultEl.innerHTML = `<p style="color:var(--text-3);font-size:13px">No tengo ninguna repetida de esa lista.</p>`
    return
  }
  let html = `<p style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
    Puedo darle — ${matches.length}
  </p>`
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px">`
  html += matches.map(c => `
    <label class="rep-give-label">
      <input type="checkbox" class="trade-give-chk" value="${c}" checked style="accent-color:var(--accent)">
      <span>${c}</span>
    </label>`).join('')
  html += `</div>`
  resultEl.innerHTML = html
}

/* ── Trade: lo que recibo ── */
function renderTradeRecv(el, codes) {
  const resultEl = el.querySelector('#rep-trade-recv-result')
  if (!codes.length) { resultEl.innerHTML = ''; return }

  const collected = get()
  const valid     = codes.filter(c => ALL_CODES.has(c))
  const newOnes   = valid.filter(c => !collected.has(c))
  const already   = valid.filter(c =>  collected.has(c))
  const invalid   = codes.filter(c => !ALL_CODES.has(c))

  let html = ''
  if (newOnes.length) {
    html += `<p style="font-size:11px;font-weight:700;color:var(--ok);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">
      Nuevas para el album — ${newOnes.length}
    </p>`
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">`
    html += newOnes.map(c => `<span class="chip-tag" style="background:var(--ok-lo);color:var(--ok)">${c}</span>`).join('')
    html += `</div>`
  }
  if (already.length) {
    html += `<p style="font-size:11px;font-weight:700;color:var(--warn);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">
      Ya las tengo (van como repetida) — ${already.length}
    </p>`
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">`
    html += already.map(c => `<span class="chip-tag chip-dup">${c}</span>`).join('')
    html += `</div>`
  }
  if (invalid.length) {
    html += `<p style="font-size:11px;color:var(--text-3);margin-bottom:4px">No reconocidas: ${invalid.join(', ')}</p>`
  }
  resultEl.innerHTML = html
}

/* ── Trade: crear (guarda pendiente, no mueve figuritas) ── */
function createTrade(el) {
  const name = el.querySelector('#rep-trade-name').value.trim()
  if (!name) { toast('Ponele un nombre al intercambio', 'err'); return }

  const give = [...el.querySelectorAll('.trade-give-chk:checked')].map(c => c.value)
  const recv = parseList(el.querySelector('#rep-trade-recv-txt').value)

  if (!give.length && !recv.length) { toast('Nada para guardar', 'dup'); return }

  savePendingTrade({ partner: name, gave: give, received: recv })
    .then(() => toast(`Intercambio con ${name} guardado`, 'ok'))
    .catch(() => toast('Error al guardar', 'err'))

  // Resetear formulario
  el.querySelector('#rep-trade-name').value            = ''
  el.querySelector('#rep-trade-give-txt').value        = ''
  el.querySelector('#rep-trade-recv-txt').value        = ''
  el.querySelector('#rep-trade-give-result').innerHTML = ''
  el.querySelector('#rep-trade-recv-result').innerHTML = ''
}

/* ── Trade: ejecutar cuando el intercambio físico se hace ── */
function executeTrade(id, trade) {
  // Dar: bajar repetidas
  trade.gave.forEach(code => {
    if ((getDupes()[code] ?? 0) > 0) removeDupe(code)
  })

  // Recibir: agregar al album o como repetida
  const collected = get()
  const next = new Set(collected)
  trade.received.forEach(code => {
    if (!ALL_CODES.has(code)) return
    if (collected.has(code)) { addDupe(code) }
    else { next.add(code); addSticker(code) }
  })
  if (next.size > collected.size) setState(next)

  completeTrade(id)

  const parts = []
  if (trade.gave.length)     parts.push(`${trade.gave.length} dada${trade.gave.length > 1 ? 's' : ''}`)
  if (trade.received.length) parts.push(`${trade.received.length} recibida${trade.received.length > 1 ? 's' : ''}`)
  toast(`Intercambio con ${trade.partner} confirmado — ${parts.join(', ')}`, 'ok')
}

/* ── Pending trades list ── */
function renderPendingTrades(el) {
  const pending = el.querySelector('#rep-pending-trades')
  if (!pending) return

  const trades = getTrades()
  const list = Object.entries(trades)
    .filter(([, t]) => t.status === 'pending')
    .sort(([a], [b]) => Number(a) - Number(b))

  if (!list.length) { pending.innerHTML = ''; return }

  const fmt = (iso) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })

  let html = `<p style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin:4px 0 8px">
    Intercambios pendientes
  </p>`

  list.forEach(([id, t]) => {
    html += `
      <div class="card trade-pending-card" data-id="${id}">
        <div class="trade-pending-header">
          <span class="trade-pending-name">${t.partner}</span>
          <span class="trade-pending-date">${fmt(t.ts)}</span>
        </div>
        ${t.gave.length ? `
          <div class="trade-pending-row">
            <span class="trade-pending-lbl">Doy</span>
            <span class="trade-pending-codes">${t.gave.join(', ')}</span>
          </div>` : ''}
        ${t.received.length ? `
          <div class="trade-pending-row">
            <span class="trade-pending-lbl">Recibo</span>
            <span class="trade-pending-codes">${t.received.join(', ')}</span>
          </div>` : ''}
        <div class="trade-pending-actions">
          <button class="btn btn-p trade-confirm-btn" data-id="${id}">✓ Confirmar</button>
          <button class="btn btn-s trade-cancel-btn" data-id="${id}">Cancelar</button>
        </div>
      </div>`
  })

  pending.innerHTML = html

  pending.querySelectorAll('.trade-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      executeTrade(id, trades[id])
    })
  })

  pending.querySelectorAll('.trade-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cancelTrade(btn.dataset.id)
      toast('Intercambio cancelado', 'dup')
    })
  })
}

function render() {
  if (!container) return
  const dupes     = getDupes()
  const collected = get()   // import { get } already at top

  // Solo contar repetidas de figuritas que también estén en el álbum.
  // Si hay un code en dupes pero no en collected es un dato fantasma.
  const active = Object.fromEntries(
    Object.entries(dupes).filter(([code, n]) => n > 0 && collected.has(code))
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
      // Guard: never go below 0 (double-tap protection)
      if ((getDupes()[code] ?? 0) <= 0) return
      removeDupe(code)
      toast(`${code} — 1 repetida menos`, 'dup')
    })
  })
}
