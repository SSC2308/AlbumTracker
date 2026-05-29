import { login, register } from '../firebase/auth.js'

const ERR = {
  'auth/invalid-credential':   'Email o contraseña incorrectos',
  'auth/user-not-found':       'No existe una cuenta con ese email',
  'auth/wrong-password':       'Contraseña incorrecta',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email',
  'auth/invalid-email':        'Email inválido',
  'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres',
  'auth/too-many-requests':    'Demasiados intentos, esperá un momento',
}

export function mountLogin() {
  const overlay = document.createElement('div')
  overlay.id = 'login-overlay'
  overlay.innerHTML = `
    <div class="login-wrap">

      <div class="login-header">
        <img src="/logo-wc26.png" class="login-logo" alt="FIFA World Cup 2026">
        <h1 class="login-title">Album Mundial 2026</h1>
        <p class="login-sub">Seguí tu colección en tiempo real</p>
      </div>

      <div class="login-card">
        <div class="login-tabs">
          <button class="login-tab act" data-tab="in">Entrar</button>
          <button class="login-tab"     data-tab="up">Registrarse</button>
        </div>

        <!-- ── Entrar ── -->
        <div id="login-panel-in" class="login-form">
          <div class="login-field">
            <label class="login-label" for="login-email-in">Email</label>
            <input id="login-email-in" class="login-input" type="email"
              autocomplete="email" autocapitalize="none"
              autocorrect="off" spellcheck="false" inputmode="email"
              placeholder="tu@email.com">
          </div>
          <div class="login-field">
            <label class="login-label" for="login-pass-in">Contraseña</label>
            <input id="login-pass-in" class="login-input" type="password"
              autocomplete="current-password" placeholder="••••••••">
          </div>
          <div id="login-err-in" class="login-err" style="display:none"></div>
          <button class="login-btn" id="login-btn-in">Entrar</button>
        </div>

        <!-- ── Registrarse ── -->
        <div id="login-panel-up" class="login-form" style="display:none">
          <div class="login-field">
            <label class="login-label" for="login-email-up">Email</label>
            <input id="login-email-up" class="login-input" type="email"
              autocomplete="email" autocapitalize="none"
              autocorrect="off" spellcheck="false" inputmode="email"
              placeholder="tu@email.com">
          </div>
          <div class="login-field">
            <label class="login-label" for="login-pass-up">Contraseña</label>
            <input id="login-pass-up" class="login-input" type="password"
              autocomplete="new-password" placeholder="Mínimo 6 caracteres">
          </div>
          <div class="login-field">
            <label class="login-label" for="login-pass2-up">Repetir contraseña</label>
            <input id="login-pass2-up" class="login-input" type="password"
              autocomplete="new-password" placeholder="••••••••">
          </div>
          <div id="login-err-up" class="login-err" style="display:none"></div>
          <button class="login-btn" id="login-btn-up">Crear cuenta</button>
        </div>
      </div>

    </div>
  `
  document.body.appendChild(overlay)

  // ── Tabs ───────────────────────────────────────────────────────
  overlay.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.login-tab').forEach(t => t.classList.remove('act'))
      tab.classList.add('act')
      const isIn = tab.dataset.tab === 'in'
      overlay.querySelector('#login-panel-in').style.display = isIn ? '' : 'none'
      overlay.querySelector('#login-panel-up').style.display = isIn ? 'none' : ''
      overlay.querySelector(isIn ? '#login-email-in' : '#login-email-up').focus()
    })
  })

  // ── Entrar ─────────────────────────────────────────────────────
  const emailIn = overlay.querySelector('#login-email-in')
  const passIn  = overlay.querySelector('#login-pass-in')
  const btnIn   = overlay.querySelector('#login-btn-in')
  const errIn   = overlay.querySelector('#login-err-in')

  async function doLogin() {
    const email = emailIn.value.trim()
    const pass  = passIn.value
    if (!email || !pass) { showErr(errIn, 'Completá los campos'); return }
    setLoading(btnIn, true, 'Entrando...')
    errIn.style.display = 'none'
    try {
      await login(email, pass)
    } catch (e) {
      showErr(errIn, ERR[e.code] ?? 'Error al entrar')
      setLoading(btnIn, false, 'Entrar')
    }
  }

  btnIn.addEventListener('click', doLogin)
  passIn.addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin() })
  emailIn.addEventListener('keydown', e => { if (e.key === 'Enter') passIn.focus() })

  // ── Registrarse ────────────────────────────────────────────────
  const emailUp = overlay.querySelector('#login-email-up')
  const passUp  = overlay.querySelector('#login-pass-up')
  const pass2Up = overlay.querySelector('#login-pass2-up')
  const btnUp   = overlay.querySelector('#login-btn-up')
  const errUp   = overlay.querySelector('#login-err-up')

  async function doRegister() {
    const email = emailUp.value.trim()
    const pass  = passUp.value
    const pass2 = pass2Up.value
    if (!email || !pass)   { showErr(errUp, 'Completá los campos'); return }
    if (pass !== pass2)    { showErr(errUp, 'Las contraseñas no coinciden'); return }
    setLoading(btnUp, true, 'Creando cuenta...')
    errUp.style.display = 'none'
    try {
      await register(email, pass)
    } catch (e) {
      showErr(errUp, ERR[e.code] ?? 'Error al registrarse')
      setLoading(btnUp, false, 'Crear cuenta')
    }
  }

  btnUp.addEventListener('click', doRegister)
  pass2Up.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister() })
  passUp.addEventListener('keydown',  e => { if (e.key === 'Enter') pass2Up.focus() })
  emailUp.addEventListener('keydown', e => { if (e.key === 'Enter') passUp.focus() })

  setTimeout(() => emailIn.focus(), 120)
}

function showErr(el, msg) {
  el.textContent = msg
  el.style.display = 'block'
}

function setLoading(btn, loading, text) {
  btn.disabled    = loading
  btn.textContent = text
}
