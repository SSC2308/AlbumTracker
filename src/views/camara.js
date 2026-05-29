import { get } from '../state.js'
import { set as setState } from '../state.js'
import { ALL_CODES } from '../data/stickers.js'
import { addSticker, addDupe } from '../firebase/db.js'
import { toast } from '../utils/toast.js'

let stream  = null
let pending = []
const claudeKey = import.meta.env.VITE_CLAUDE_KEY || ''

export function mount(el) {
  el.innerHTML = `
    <div class="card">
      <div class="section-hdr">
        <span class="section-title">Escanear figuritas</span>
      </div>


      <div class="cam-viewport">
        <video id="cam-vid" autoplay playsinline muted></video>

        <div class="cam-corners">
          <div class="cc tl"></div>
          <div class="cc tr"></div>
          <div class="cc bl"></div>
          <div class="cc br"></div>
        </div>

        <div class="cam-off" id="cam-off">
          <span class="cam-off-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </span>
          <p>Camara apagada</p>
        </div>
      </div>

      <div class="cam-bar">
        <button class="cam-side-btn" id="cam-gallery" title="Galeria">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <button class="cam-capture" id="cam-cap" disabled>
          <span class="cam-cap-dot"></span>
        </button>
        <button class="cam-side-btn" id="cam-toggle-btn" title="Activar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
      </div>

      <p class="cam-status" id="cam-msg">Toca el boton central para activar la camara</p>
    </div>

    <input type="file" id="cam-file-inp" accept="image/*" style="display:none">

    <div class="card ocr-card" id="ocr-card" style="display:none">
      <div class="section-hdr">
        <span class="section-title">Codigos detectados</span>
      </div>
      <div id="ocr-results" style="margin-bottom:12px"></div>
      <div class="ocr-actions">
        <button class="btn btn-ok"  id="ocr-confirm-all">Agregar seleccionadas</button>
        <button class="btn btn-s"   id="ocr-cancel">Descartar</button>
      </div>
    </div>

    <div class="card" id="debug-card" style="display:none">
      <div class="section-hdr" style="cursor:pointer" id="debug-toggle">
        <span class="section-title">Debug</span>
        <span style="font-size:20px;color:var(--text-3)">&#9660;</span>
      </div>
      <div id="debug-body">
        <div id="debug-info" style="font-size:12px;color:var(--text-2);margin-bottom:10px;font-family:monospace;white-space:pre-wrap"></div>
        <div id="debug-images" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>
    </div>
  `

  el.querySelector('#cam-toggle-btn').addEventListener('click', () => toggleCamera(el))
  el.querySelector('#cam-cap').addEventListener('click',       () => captureFromCamera(el))
  el.querySelector('#ocr-confirm-all').addEventListener('click', () => confirmAll(el))
  el.querySelector('#ocr-cancel').addEventListener('click',     () => {
    el.querySelector('#ocr-card').style.display = 'none'
    pending = []
  })
  el.querySelector('#cam-gallery').addEventListener('click', () => {
    document.getElementById('cam-file-inp').click()
  })
  document.getElementById('cam-file-inp').addEventListener('change', e => {
    const file = e.target.files[0]
    if (!file) return
    processImage(el, file)
    e.target.value = ''
  })

  let debugOpen = true
  document.getElementById('debug-toggle').addEventListener('click', () => {
    debugOpen = !debugOpen
    document.getElementById('debug-body').style.display = debugOpen ? 'block' : 'none'
    document.querySelector('#debug-toggle span:last-child').textContent = debugOpen ? '\u25BC' : '\u25B6'
  })
}

export function onLeave() { stopCamera() }

/* ═══════════ Camera ═══════════ */
async function toggleCamera(el) {
  if (stream) { stopCamera(); return }
  const toggle = el.querySelector('#cam-toggle-btn')
  const off    = el.querySelector('#cam-off')
  const msg    = el.querySelector('#cam-msg')
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    })
    el.querySelector('#cam-vid').srcObject = stream
    toggle.classList.add('active')
    el.querySelector('#cam-cap').disabled = false
    off.style.display = 'none'
    msg.textContent = 'Apunta y presiona el boton central para capturar'
  } catch (e) {
    const errors = {
      NotAllowedError: 'Permiso denegado. Concede acceso a la camara.',
      NotFoundError: 'No se encontro camara.',
      NotReadableError: 'La camara esta en uso por otra app.',
    }
    msg.textContent = errors[e.name] || 'No se pudo acceder a la camara'
  }
}

function stopCamera() {
  if (!stream) return
  stream.getTracks().forEach(t => t.stop()); stream = null
  const vid    = document.getElementById('cam-vid')
  const cap    = document.getElementById('cam-cap')
  const toggle = document.getElementById('cam-toggle-btn')
  const off    = document.getElementById('cam-off')
  const msg    = document.getElementById('cam-msg')
  if (vid)    vid.srcObject = null
  if (cap)    cap.disabled = true
  if (toggle) toggle.classList.remove('active')
  if (off)    off.style.display = 'flex'
  if (msg)    msg.textContent = 'Toca el boton central para activar la camara'
  document.getElementById('ocr-card').style.display = 'none'
}

async function processImage(el, file) {
  const msg = el.querySelector('#cam-msg')
  el.querySelector('#ocr-card').style.display = 'none'
  msg.textContent = 'Procesando...'
  try {
    const img = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
    await processCapture(el, canvas)
  } catch (e) {
    msg.textContent = 'Error al procesar la imagen'
  }
}

async function captureFromCamera(el) {
  const vid = el.querySelector('#cam-vid')
  if (!stream || !vid.videoWidth) return
  const cap = el.querySelector('#cam-cap')
  cap.disabled = true; cap.classList.add('scanning')

  // Crop to the scan area (10% inset, matching .cam-corners CSS)
  const INSET = 0.10
  const vw = vid.videoWidth, vh = vid.videoHeight
  const ew = vid.clientWidth,  eh = vid.clientHeight

  // object-fit: cover scale + offset
  const scale   = Math.max(ew / vw, eh / vh)
  const offX    = (ew - vw * scale) / 2
  const offY    = (eh - vh * scale) / 2

  // Crop box in CSS pixels
  const cssX = ew * INSET, cssY = eh * INSET
  const cssW = ew * (1 - INSET * 2), cssH = eh * (1 - INSET * 2)

  // Convert to video pixel coordinates
  const srcX = (cssX - offX) / scale
  const srcY = (cssY - offY) / scale
  const srcW = cssW / scale
  const srcH = cssH / scale

  const cropped = document.createElement('canvas')
  cropped.width = Math.round(srcW); cropped.height = Math.round(srcH)
  cropped.getContext('2d').drawImage(vid, srcX, srcY, srcW, srcH, 0, 0, cropped.width, cropped.height)

  await processCapture(el, cropped)
  cap.disabled = false; cap.classList.remove('scanning')
}

/* ═══════════════════════════════════════════════════════════════
   PILL DETECTION LOGIC — detects dark pill regions in the image.
   Feel free to improve or replace this with a better approach.
   ═══════════════════════════════════════════════════════════════ */
function toGray(canvas) {
  const dst = document.createElement('canvas')
  dst.width = canvas.width; dst.height = canvas.height
  const ctx = dst.getContext('2d')
  ctx.drawImage(canvas, 0, 0)
  const img = ctx.getImageData(0, 0, dst.width, dst.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2])
    d[i] = d[i+1] = d[i+2] = g
  }
  ctx.putImageData(img, 0, 0)
  return dst
}

function findPills(grayCanvas) {
  const ctx = grayCanvas.getContext('2d')
  const img = ctx.getImageData(0, 0, grayCanvas.width, grayCanvas.height)
  const d = img.data
  const w = grayCanvas.width
  const h = grayCanvas.height

  const mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      mask[y * w + x] = d[i] < 140 ? 1 : 0
    }
  }

  const regions = []
  const visited = new Uint8Array(w * h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 0 || visited[y * w + x]) continue

      let minX = x, maxX = x, minY = y, maxY = y
      const stack = [[x, y]]
      visited[y * w + x] = 1

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy

        for (const [nx, ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]) {
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny*w+nx] && !visited[ny*w+nx]) {
            visited[ny*w+nx] = 1
            stack.push([nx, ny])
          }
        }
      }

      const rw = maxX - minX + 1
      const rh = maxY - minY + 1

      if (rw >= 25 && rh >= 8 && rw / rh >= 1.5 && rw / rh <= 10 && rw * rh >= 200) {
        regions.push({ x: minX, y: minY, w: rw, h: rh })
      }
    }
  }

  // Merge nearby regions
  const merged = []
  const used = new Set()
  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue
    let r = { ...regions[i] }
    for (let j = i + 1; j < regions.length; j++) {
      if (used.has(j)) continue
      const rj = regions[j]
      if (Math.abs(r.x - rj.x) < 30 && Math.abs(r.y - rj.y) < 20) {
        r.x = Math.min(r.x, rj.x)
        r.y = Math.min(r.y, rj.y)
        r.w = Math.max(r.x + r.w, rj.x + rj.w) - r.x
        r.h = Math.max(r.y + r.h, rj.y + rj.h) - r.y
        used.add(j)
      }
    }
    merged.push(r)
    used.add(i)
  }

  merged.sort((a, b) => a.y - b.y || a.x - b.x)
  return merged
}
/* ═══════════════════════════════════════════════════════════════
   END PILL DETECTION LOGIC
   ═══════════════════════════════════════════════════════════════ */

async function processCapture(el, srcCanvas) {
  const msg = el.querySelector('#cam-msg')
  document.getElementById('debug-card').style.display = 'block'

  const gray = toGray(srcCanvas)
  const pills = findPills(gray)
  const debugInfo = document.getElementById('debug-info')
  debugInfo.textContent = `${pills.length} pills detectadas\n`

  // Draw pills on debug image
  const debugCanvas = document.createElement('canvas')
  debugCanvas.width = srcCanvas.width; debugCanvas.height = srcCanvas.height
  const dbgCtx = debugCanvas.getContext('2d')
  dbgCtx.drawImage(srcCanvas, 0, 0)
  dbgCtx.strokeStyle = '#00ff00'; dbgCtx.lineWidth = 2
  for (const p of pills) {
    dbgCtx.strokeRect(p.x, p.y, p.w, p.h)
  }

  let debugHtml = `<div><span style="font-size:10px;color:var(--text-3)">Pills detectadas</span><img src="${debugCanvas.toDataURL()}" style="width:100%;border-radius:6px;border:1px solid var(--border);margin-bottom:12px"></div>`
  document.getElementById('debug-images').innerHTML = debugHtml

  if (!claudeKey) {
    msg.textContent = 'Falta VITE_CLAUDE_KEY en el archivo .env'
    return
  }

  msg.textContent = 'Procesando...'
  const result = await callClaude(srcCanvas)
  const codes = result.codes

  debugInfo.textContent += `\nClaude: ${JSON.stringify(codes)}`

  if (codes.length > 0) {
    pending = codes
    renderResults(el, codes)
    el.querySelector('#ocr-card').style.display = 'block'
    const newCount = codes.filter(c => ALL_CODES.has(c) && !get().has(c)).length
    msg.textContent = `${codes.length} detectado(s) — ${newCount} nuevo(s)`
  } else {
    msg.textContent = 'Claude no encontro codigos.'
  }
}

/* ── Image helpers ── */
function resizeForApi(canvas, maxSide = 1024, quality = 0.85) {
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height))
  const w = Math.round(canvas.width  * scale)
  const h = Math.round(canvas.height * scale)
  const dst = document.createElement('canvas')
  dst.width = w; dst.height = h
  dst.getContext('2d').drawImage(canvas, 0, 0, w, h)
  return dst.toDataURL('image/jpeg', quality).split(',')[1]
}

/* ── Claude Vision API ── */
async function callClaude(canvas) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: resizeForApi(canvas) } },
          { type: 'text', text: `You are scanning the back of FIFA World Cup 2026 sticker packets.
Each packet shows sticker codes printed in white text inside dark rounded pill/capsule shapes.
A sticker code is always: 2-3 uppercase letters (country code) followed by 1-2 digits. Examples: MEX1, BRA12, ARG5, FWC3, USA10, JPN8.
Read every code visible in the image, even if partially obscured or at an angle.
Respond ONLY with a valid JSON array of strings, no explanation. Example: ["MEX1","BRA12","ARG5"]
If no codes are found respond with: []` }
        ]
      }]
    })
  })

  const data = await response.json()
  if (data.usage) {
    console.log('Claude tokens:', `in:${data.usage.input_tokens} out:${data.usage.output_tokens}`,
      '~$' + ((data.usage.input_tokens * 1 + data.usage.output_tokens * 5) / 1e6).toFixed(4))
  }
  let codes = []
  try {
    const text = data.content[0].text
    const match = text.match(/\[.*\]/s)
    if (match) codes = JSON.parse(match[0])
    else codes = [...new Set(text.match(/[A-Z]{3}\d{1,2}/g) || [])]
    // Clean codes: uppercase, no spaces
    codes = codes.map(c => String(c).toUpperCase().replace(/\s/g, '')).filter(c => /^[A-Z]{3}\d{1,2}$/.test(c))
  } catch { /* ignore */ }
  return { codes, usage: data.usage }
}

/* ── Results UI ── */
function renderResults(el, codes) {
  const collected = get()
  const newOnes = codes.filter(c => ALL_CODES.has(c) && !collected.has(c))
  const dups    = codes.filter(c => ALL_CODES.has(c) &&  collected.has(c))
  const invalid = codes.filter(c => !ALL_CODES.has(c))

  let html = ''

  if (newOnes.length) {
    html += `<p style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Nuevas — ${newOnes.length}</p>`
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">`
    html += newOnes.map(code => `
      <label style="display:flex;align-items:center;gap:8px;background:var(--ok-lo);padding:8px 14px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;font-family:monospace">
        <input type="checkbox" class="ocr-chk" value="${code}" checked style="accent-color:var(--ok)">
        <span style="color:var(--ok)">${code}</span>
      </label>`).join('')
    html += `</div>`
  }

  if (dups.length) {
    html += `<p style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Ya las tengo — guardar como repetida</p>`
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">`
    html += dups.map(code => `
      <label style="display:flex;align-items:center;gap:8px;background:var(--warn-lo);padding:8px 14px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;font-family:monospace">
        <input type="checkbox" class="ocr-chk ocr-chk-dup" value="${code}" style="accent-color:var(--warn)">
        <span style="color:var(--warn)">${code}</span>
      </label>`).join('')
    html += `</div>`
  }

  if (invalid.length) {
    html += `<p style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:4px">Sin confirmar</p>`
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`
    html += invalid.map(code => `
      <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:var(--bg-raised);cursor:pointer;font-size:13px;font-family:monospace;color:var(--text-2)">
        <input type="checkbox" class="ocr-chk" value="${code}" style="accent-color:var(--text-3)">
        ${code}
      </label>`).join('')
    html += `</div>`
  }

  el.querySelector('#ocr-results').innerHTML = html || '<p style="color:var(--text-3);font-size:13px">Sin resultados</p>'
}

function confirmAll(el) {
  const checked = [...el.querySelectorAll('.ocr-chk:checked')]
  if (!checked.length) { toast('Nada seleccionado', 'dup'); return }

  // Re-evaluate against current state at confirm time (not render time)
  // so a Firebase sync between render and confirm doesn't misclassify codes.
  const current = get()
  const next    = new Set(current)
  let added = 0, duped = 0

  checked.forEach(chk => {
    const code = chk.value
    if (!ALL_CODES.has(code)) return
    if (current.has(code)) {
      // Ya la tiene según el estado actual — guardar como repetida
      addDupe(code)
      duped++
    } else if (!next.has(code)) {
      // Nueva — agregar al álbum
      next.add(code)
      addSticker(code)
      added++
    }
  })

  if (added > 0) setState(next)

  const parts = []
  if (added > 0) parts.push(`${added} agregada${added > 1 ? 's' : ''}`)
  if (duped > 0) parts.push(`${duped} repetida${duped > 1 ? 's' : ''} guardada${duped > 1 ? 's' : ''}`)
  if (parts.length) toast(parts.join(' · '), added > 0 ? 'ok' : 'dup')
  else toast('Nada nuevo', 'dup')

  el.querySelector('#ocr-card').style.display = 'none'
  pending = []
}
