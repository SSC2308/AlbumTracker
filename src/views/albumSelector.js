import { firebaseApp } from '../firebase/app.js'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { ALL_CODES, TOTAL } from '../data/stickers.js'

const db      = getFirestore(firebaseApp)
const ALBUM_KEY = 'album_selected'

export function getSelectedAlbum()  { return localStorage.getItem(ALBUM_KEY) }
export function clearSelectedAlbum() { localStorage.removeItem(ALBUM_KEY) }

export function mountAlbumSelector(uid, onSelect) {
  const overlay = document.createElement('div')
  overlay.id = 'album-selector-overlay'
  overlay.innerHTML = `
    <div class="als-wrap">
      <div class="als-header">
        <img src="/logo-wc26.png" class="als-logo" alt="FIFA World Cup 2026">
        <h1 class="als-title">Mis Albums</h1>
      </div>
      <div class="als-grid">

        <button class="als-card" id="als-wc2026">
          <img src="/album.png" class="als-card-img" alt="FIFA World Cup 2026">
          <span class="als-card-name">FIFA World Cup 2026</span>
          <span class="als-card-sub">Panini · ${TOTAL} figuritas</span>
          <div class="als-progress-wrap">
            <div class="als-progress-bar">
              <div class="als-progress-fill" id="als-fill-wc2026" style="width:0%"></div>
            </div>
            <span class="als-progress-txt" id="als-txt-wc2026">—</span>
          </div>
        </button>

        <button class="als-card als-card-add" disabled>
          <span class="als-add-icon">+</span>
          <span class="als-card-name">Agregar album</span>
          <span class="als-card-sub">Proximamente</span>
        </button>

      </div>
    </div>
  `
  document.body.appendChild(overlay)

  // Cargar progreso de cada album
  if (uid) {
    getDoc(doc(db, 'users', uid, 'albums', 'wc2026')).then(snap => {
      const collected = (snap.data()?.collected ?? []).filter(c => ALL_CODES.has(c)).length
      const pct = Math.min(100, Math.round((collected / TOTAL) * 100))
      const fill = overlay.querySelector('#als-fill-wc2026')
      const txt  = overlay.querySelector('#als-txt-wc2026')
      if (fill) fill.style.width = pct + '%'
      if (txt)  txt.textContent  = `${collected} / ${TOTAL} · ${pct}%`
    }).catch(() => {})
  }

  overlay.querySelector('#als-wc2026').addEventListener('click', () => {
    localStorage.setItem(ALBUM_KEY, 'wc2026')
    overlay.classList.add('als-fade-out')
    overlay.addEventListener('transitionend', () => {
      overlay.remove()
      onSelect('wc2026')
    }, { once: true })
  })
}
