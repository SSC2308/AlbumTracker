import './styles/main.css'
import { subscribe }                from './firebase/db.js'
import { set as setState, setDupes } from './state.js'
import { mount as mountInicio }     from './views/inicio.js'
import { mount as mountIngresar }   from './views/ingresar.js'
import { mount as mountAlbum, onActive as albumActive, jumpToGroup } from './views/album.js'
import { mount as mountCamara, onLeave as camaraLeave } from './views/camara.js'
import { mount as mountRepetidas }  from './views/repetidas.js'
import { mountLogin }               from './views/loginView.js'
import { getSession, logout }       from './firebase/auth.js'

function bootApp() {
  // ── Mount all views ──────────────────────────────────────────
  mountInicio(document.getElementById('view-inicio'), {
    onGroupClick: (groupId) => { nav('album'); setTimeout(() => jumpToGroup(groupId), 50) }
  })
  mountIngresar(document.getElementById('view-ingresar'))
  mountAlbum(document.getElementById('view-album'))
  mountCamara(document.getElementById('view-camara'))
  mountRepetidas(document.getElementById('view-repetidas'))

  // ── Firebase real-time sync ──────────────────────────────────
  const syncDot = document.getElementById('sync-dot')

  subscribe((collected, dupes) => {
    setState(collected)
    setDupes(dupes)
    if (syncDot) { syncDot.className = 'sync-dot ok'; syncDot.title = `Sincronizado — ${collected.size} figuritas` }
  })

  // Show connecting state until first snapshot
  if (syncDot) { syncDot.className = 'sync-dot busy'; syncDot.title = 'Conectando...' }

  // ── Logout button ─────────────────────────────────────────────
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) logoutBtn.addEventListener('click', logout)

  // ── Navigation ───────────────────────────────────────────────
  let current = null

  function nav(view) {
    if (view === current) return
    if (current === 'camara') camaraLeave()
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'))
    document.getElementById('view-' + view).classList.add('active')
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.classList.toggle('act', btn.dataset.view === view)
    })
    if (view === 'album') albumActive()
    current = view
  }

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => nav(btn.dataset.view))
  })

  nav('inicio')
}

// ── Auth gate ────────────────────────────────────────────────
if (getSession()) {
  bootApp()
} else {
  mountLogin(bootApp)
}
