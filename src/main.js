import './styles/main.css'
import { subscribe }                from './firebase/db.js'
import { set as setState, setDupes } from './state.js'
import { mount as mountInicio }     from './views/inicio.js'
import { mount as mountIngresar }   from './views/ingresar.js'
import { mount as mountAlbum, onActive as albumActive, jumpToGroup, jumpToTeam } from './views/album.js'
import { mount as mountCamara, onLeave as camaraLeave } from './views/camara.js'
import { mount as mountRepetidas }  from './views/repetidas.js'
import { mountLogin }               from './views/loginView.js'
import { mountAlbumSelector, getSelectedAlbum, clearSelectedAlbum } from './views/albumSelector.js'
import { getSession, logout }       from './firebase/auth.js'

function bootApp() {
  // ── Mount all views ──────────────────────────────────────────
  mountInicio(document.getElementById('view-inicio'), {
    onGroupClick: (groupId) => { nav('album'); setTimeout(() => jumpToGroup(groupId), 50) },
    onTeamClick:  (teamId)  => { nav('album'); setTimeout(() => jumpToTeam(teamId),   50) },
  })
  mountIngresar(document.getElementById('view-ingresar'))
  mountAlbum(document.getElementById('view-album'))
  mountCamara(document.getElementById('view-camara'))
  mountRepetidas(document.getElementById('view-repetidas'))

  // ── Firebase real-time sync ──────────────────────────────────
  const syncDot = document.getElementById('sync-dot')
  const demoMode = new URLSearchParams(location.search).has('demo')

  if (demoMode) {
    // Modo demo: estado vacio, sin conectar a Firebase
    setState(new Set())
    setDupes({})
    if (syncDot) { syncDot.className = 'sync-dot'; syncDot.title = 'Modo demo' }
  } else {
    subscribe((collected, dupes) => {
      setState(collected)
      setDupes(dupes)
      if (syncDot) { syncDot.className = 'sync-dot ok'; syncDot.title = `Sincronizado — ${collected.size} figuritas` }
    })
    if (syncDot) { syncDot.className = 'sync-dot busy'; syncDot.title = 'Conectando...' }
  }

  // ── Logout button ─────────────────────────────────────────────
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) logoutBtn.addEventListener('click', logout)

  // ── Volver a mis albums ───────────────────────────────────────
  const backBtn = document.getElementById('nav-back-albums')
  if (backBtn) backBtn.addEventListener('click', () => {
    clearSelectedAlbum()
    location.reload()
  })

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
const session = getSession()
const album   = getSelectedAlbum()

if (session && album) {
  bootApp()
} else if (session) {
  mountAlbumSelector(() => bootApp())
} else {
  mountLogin(() => mountAlbumSelector(() => bootApp()))
}
