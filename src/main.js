import './styles/main.css'
import { subscribe, initDb, migrateFromLegacy } from './firebase/db.js'
import { set as setState, setDupes, setTrades } from './state.js'
import { mount as mountInicio }     from './views/inicio.js'
import { mount as mountIngresar }   from './views/ingresar.js'
import { mount as mountAlbum, onActive as albumActive, jumpToGroup, jumpToTeam } from './views/album.js'
import { mount as mountCamara, onLeave as camaraLeave } from './views/camara.js'
import { mount as mountRepetidas }  from './views/repetidas.js'
import { mountLogin }               from './views/loginView.js'
import { mountAlbumSelector, getSelectedAlbum, clearSelectedAlbum } from './views/albumSelector.js'
import { onAuth, logout }           from './firebase/auth.js'
import { toast }                    from './utils/toast.js'

// ── Mount all views once ─────────────────────────────────────────
mountInicio(document.getElementById('view-inicio'), {
  onGroupClick: (groupId) => { nav('album'); setTimeout(() => jumpToGroup(groupId), 50) },
  onTeamClick:  (teamId)  => { nav('album'); setTimeout(() => jumpToTeam(teamId),   50) },
})
mountIngresar(document.getElementById('view-ingresar'))
mountAlbum(document.getElementById('view-album'))
mountCamara(document.getElementById('view-camara'))
mountRepetidas(document.getElementById('view-repetidas'))

// ── Navigation ───────────────────────────────────────────────────
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

// ── Long press en home → volver a mis albums ─────────────────────
const homeBtn = document.querySelector('.mnav [data-view="inicio"]')
if (homeBtn) {
  let pressTimer = null
  homeBtn.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => { clearSelectedAlbum(); location.reload() }, 600)
  })
  homeBtn.addEventListener('pointerup',    () => clearTimeout(pressTimer))
  homeBtn.addEventListener('pointerleave', () => clearTimeout(pressTimer))
}

// ── Logout button ────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', logout)

// ── Firebase real-time sync ──────────────────────────────────────
function startSync() {
  const syncDot  = document.getElementById('sync-dot')
  const demoMode = new URLSearchParams(location.search).has('demo')

  if (demoMode) {
    setState(new Set()); setDupes({}); setTrades({})
    if (syncDot) { syncDot.className = 'sync-dot'; syncDot.title = 'Modo demo' }
    return
  }

  subscribe((collected, dupes, trades) => {
    const cleanDupes = Object.fromEntries(Object.entries(dupes).filter(([, n]) => n > 0))
    setState(collected)
    setDupes(cleanDupes)
    setTrades(trades)
    if (syncDot) { syncDot.className = 'sync-dot ok'; syncDot.title = `Sincronizado — ${collected.size} figuritas` }
  })
  if (syncDot) { syncDot.className = 'sync-dot busy'; syncDot.title = 'Conectando...' }
}

// ── Boot ─────────────────────────────────────────────────────────
function bootApp() {
  startSync()
  nav('inicio')
}

// ── Auth gate — Firebase Auth ────────────────────────────────────
let booted = false

onAuth(async user => {
  if (user && !booted) {
    booted = true

    // Quitar pantalla de login si está visible
    document.getElementById('login-overlay')?.remove()

    const album = getSelectedAlbum()

    if (album) {
      initDb(user.uid, album)
      const { migrated } = await migrateFromLegacy()
      if (migrated) toast('Datos migrados correctamente', 'ok')
      bootApp()
    } else {
      mountAlbumSelector((albumId) => {
        initDb(user.uid, albumId)
        migrateFromLegacy()
        bootApp()
      })
    }
  } else if (!user && !booted) {
    mountLogin()
  }
})
