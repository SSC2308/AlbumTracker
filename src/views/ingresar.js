import { get, getDupes, on } from '../state.js'
import { ALL_CODES, TOTAL } from '../data/stickers.js'
import { addSticker, removeSticker, addDupe, removeDupe } from '../firebase/db.js'
import { set as setState } from '../state.js'
import { toast } from '../utils/toast.js'

const recent = []

export function mount(el) {
  el.innerHTML = `
    <div class="ing-hero">
      <div class="ing-counter-badge">
        <span id="ing-counter">0 / ${TOTAL}</span>
        <span style="color:var(--text-3);font-size:11px">figuritas</span>
      </div>

      <div class="ing-input-group">
        <input id="ing-inp" class="ing-input" type="text" placeholder="BRA1"
          maxlength="6" autocomplete="off" autocorrect="off"
          autocapitalize="characters" spellcheck="false">
        <button class="btn btn-p btn-lg" id="ing-add" style="min-width:120px">Agregar</button>
      </div>
      <div id="ing-fbk" class="ing-feedback"></div>
    </div>

    <div class="card">
      <div class="ing-bulk-toggle" id="ing-bulk-toggle">
        <span class="ing-bulk-label">Agregar varias a la vez</span>
        <span class="ing-bulk-arrow" id="ing-bulk-arrow">&#9660;</span>
      </div>
      <div id="ing-bulk-body" style="display:none">
        <textarea id="ing-bulk" class="bulk-inp"
          placeholder="BRA1 MEX3 ARG5"></textarea>
        <button class="btn btn-p btn-full" id="ing-bulk-btn" style="margin-top:12px">Agregar todas</button>
      </div>
    </div>

    <div class="card" id="ing-bulk-dups" style="display:none">
      <div class="section-hdr" style="margin-bottom:8px">
        <span class="section-title">Repetidas del ultimo ingreso</span>
      </div>
      <div id="ing-bulk-dup-chips" class="chips-row"></div>
    </div>

    <div class="card" id="ing-recent" style="display:none">
      <div class="section-hdr" style="margin-bottom:4px">
        <span class="section-title">Recien agregadas</span>
        <span class="section-badge" style="cursor:pointer" id="ing-clear-recent">Limpiar</span>
      </div>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:12px">Toca para deshacer</p>
      <div id="ing-chips" class="chips-row"></div>
    </div>
  `

  const inp     = el.querySelector('#ing-inp')
  const fbk     = el.querySelector('#ing-fbk')
  const addBtn  = el.querySelector('#ing-add')
  const bulkTxt = el.querySelector('#ing-bulk')
  const bulkBtn = el.querySelector('#ing-bulk-btn')

  // Collapsible bulk
  const bulkToggle = el.querySelector('#ing-bulk-toggle')
  const bulkBody   = el.querySelector('#ing-bulk-body')
  const bulkArrow  = el.querySelector('#ing-bulk-arrow')
  let bulkOpen = false
  bulkToggle.addEventListener('click', () => {
    bulkOpen = !bulkOpen
    bulkBody.style.display = bulkOpen ? 'block' : 'none'
    bulkArrow.classList.toggle('open', bulkOpen)
  })

  inp.addEventListener('input', () => {
    const v = inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    fbk.className = 'ing-feedback'; fbk.textContent = ''
    inp.className = 'ing-input'
    if (!v) return
    if (ALL_CODES.has(v)) {
      if (get().has(v)) {
        const count = getDupes()[v] || 0
        inp.className = 'ing-input dup'
        fbk.className = 'ing-feedback dup'
        fbk.innerHTML = `Ya la tengo${count > 0 ? ` — ${count} repetida${count > 1 ? 's' : ''}` : ''}`
      } else {
        inp.className = 'ing-input ok'
        fbk.className = 'ing-feedback ok'
        fbk.innerHTML = '<span>&#10003;</span> Listo para agregar al album'
      }
    } else {
      inp.className = 'ing-input bad'
      fbk.className = 'ing-feedback bad'
      fbk.textContent = 'Codigo no encontrado en el album'
    }
  })

  inp.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd() })
  addBtn.addEventListener('click', doAdd)
  bulkBtn.addEventListener('click', doBulk)

  function doAdd() {
    const code = inp.value.trim()
    if (!code) return
    const result = addOne(code)
    if (result === 'ok') {
      toast(`${code} agregada`, 'ok')
      inp.value = ''
      inp.className = 'ing-input'
      fbk.textContent = ''
      fbk.className = 'ing-feedback'
      renderRecent(el)
      updateCounter(el)
      inp.focus()
    } else if (result === 'dup-saved') {
      toast(`${code} guardada como repetida`, 'dup')
      inp.value = ''
      inp.className = 'ing-input'
      fbk.textContent = ''
      fbk.className = 'ing-feedback'
      inp.focus()
    } else {
      toast('Codigo invalido', 'err')
    }
  }

  function doBulk() {
    const raw = bulkTxt.value
    const codes = raw.toUpperCase().split(/[\s,;\n]+/).filter(Boolean)
    let ok = 0, inv = 0
    const dupCodes = []
    codes.forEach(c => {
      const r = addOne(c.trim())
      if (r === 'ok') ok++
      else if (r === 'dup-saved') dupCodes.push(c.trim())
      else inv++
    })
    bulkTxt.value = ''
    toast(`${ok} agregadas · ${dupCodes.length} repetidas guardadas · ${inv} invalidas`, ok > 0 ? 'ok' : 'dup')
    renderBulkDups(el, dupCodes)
    renderRecent(el)
    updateCounter(el)
  }

  el.querySelector('#ing-clear-recent')?.addEventListener('click', () => {
    recent.length = 0
    renderRecent(el)
  })

  updateCounter(el)
  on(() => updateCounter(el))
}

function addOne(code) {
  if (!ALL_CODES.has(code)) return 'invalid'
  const c = get()
  if (c.has(code)) {
    // Ya la tiene — guardar como repetida
    addDupe(code)
    return 'dup-saved'
  }
  const next = new Set(c); next.add(code)
  setState(next)
  addSticker(code)
  recent.unshift(code)
  if (recent.length > 30) recent.pop()
  return 'ok'
}

function undoAdd(code) {
  const c = get()
  if (!c.has(code)) return
  const next = new Set(c); next.delete(code)
  setState(next)
  removeSticker(code)
  const i = recent.indexOf(code)
  if (i !== -1) recent.splice(i, 1)
}

function renderBulkDups(el, dupCodes) {
  const card  = el.querySelector('#ing-bulk-dups')
  const chips = el.querySelector('#ing-bulk-dup-chips')
  if (!dupCodes.length) { card.style.display = 'none'; return }
  card.style.display = 'block'
  chips.innerHTML = dupCodes.map(c =>
    `<span class="chip-tag chip-dup" data-dup="${c}">${c} <span class="undo-x">&times;</span></span>`
  ).join('')
  chips.querySelectorAll('.chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      removeDupe(chip.dataset.dup)
      toast(`${chip.dataset.dup} repetida eliminada`, 'dup')
      chip.remove()
      if (!chips.querySelector('.chip-tag')) card.style.display = 'none'
    })
  })
}

function renderRecent(el) {
  const card  = el.querySelector('#ing-recent')
  const chips = el.querySelector('#ing-chips')
  if (!recent.length) { card.style.display = 'none'; return }
  card.style.display = 'block'
  chips.innerHTML = recent.map(c =>
    `<span class="chip-tag" data-undo="${c}">${c} <span class="undo-x">&times;</span></span>`
  ).join('')
  chips.querySelectorAll('.chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      undoAdd(chip.dataset.undo)
      toast(`${chip.dataset.undo} eliminada`, 'dup')
      renderRecent(el)
      updateCounter(el)
    })
  })
}

function updateCounter(el) {
  const counter = el.querySelector('#ing-counter')
  if (counter) counter.textContent = get().size + ' / ' + TOTAL
}
