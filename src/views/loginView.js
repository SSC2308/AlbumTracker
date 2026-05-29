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
    <div class="login-box">
      <img src="/logo-wc26.png" class="login-logo" alt="FIFA World Cup 2026">
      <h2 class="login-title">Album Mundial 2026</h2>

      <div class="login-tabs">
        <button class="login-tab act" data-tab="in">Entrar</button>
        <button class="login-tab"     data-tab="up">Registrarse</button>
      </div>

      <div id="login-panel-in" class="login-fields">
        <input id="login-email-in" class="ing-input" type="email"
          placeholder="Email" autocomplete="email"
          autocorrect="off" autocapitalize="off" spellcheck="false">
        <input id="login-pass-in" class="ing-input" type="password"
          placeholder="Contraseña" autocomplete="current-password">
        <div id="login-err-in" class="login-err" style="display:none"></div>
        <button class="btn btn-p btn-full" id="login-btn-in">Entrar</button>
      </div>

      <div id="login-panel-up" class="login-fields" style="display:none">
        <input id="login-email-up" class="ing-input" type="email"
          placeholder="Email" autocomplete="email"
          autocorrect="off" autocapitalize="off" spellcheck="false">
        <input id="login-pass-up" class="ing-input" type="password"
          placeholder="Contraseña (mín. 6 caracteres)" autocomplete="new-password">
        <input id="login-pass2-up" class="ing-input" type="password"
          placeholder="Repetir contraseña" autocomplete="new-password">
        <div id="login-err-up" class="login-err" style="display:none"></div>
        <button class="btn btn-p btn-full" id="login-btn-up">Crear cuenta</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  // ── Tab switching ──────────────────────────────────────────────
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

  // ── Login ──────────────────────────────────────────────────────
  const emailIn = overlay.querySelector('#login-email-in')
  const passIn  = overlay.querySelector('#login-pass-in')
  const btnIn   = overlay.querySelector('#login-btn-in')
  const errIn   = overlay.querySelector('#login-err-in')

  async function doLogin() {
    const email    = emailIn.value.trim()
    const password = passIn.value
    if (!email || !password) { showErr(errIn, 'Completá los campos'); return }
    btnIn.disabled = true; btnIn.textContent = 'Entrando...'
    errIn.style.display = 'none'
    try {
      await login(email, password)
      // onAuthStateChanged in main.js handles the rest
    } catch (e) {
      showErr(errIn, ERR[e.code] ?? 'Error al entrar')
      btnIn.disabled = false; btnIn.textContent = 'Entrar'
    }
  }

  btnIn.addEventListener('click', doLogin)
  passIn.addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin() })
  emailIn.addEventListener('keydown', e => { if (e.key === 'Enter') passIn.focus() })

  // ── Register ───────────────────────────────────────────────────
  const emailUp = overlay.querySelector('#login-email-up')
  const passUp  = overlay.querySelector('#login-pass-up')
  const pass2Up = overlay.querySelector('#login-pass2-up')
  const btnUp   = overlay.querySelector('#login-btn-up')
  const errUp   = overlay.querySelector('#login-err-up')

  async function doRegister() {
    const email = emailUp.value.trim()
    const pass  = passUp.value
    const pass2 = pass2Up.value
    if (!email || !pass) { showErr(errUp, 'Completá los campos'); return }
    if (pass !== pass2)  { showErr(errUp, 'Las contraseñas no coinciden'); return }
    btnUp.disabled = true; btnUp.textContent = 'Creando cuenta...'
    errUp.style.display = 'none'
    try {
      await register(email, pass)
      // onAuthStateChanged in main.js handles the rest
    } catch (e) {
      showErr(errUp, ERR[e.code] ?? 'Error al registrarse')
      btnUp.disabled = false; btnUp.textContent = 'Crear cuenta'
    }
  }

  btnUp.addEventListener('click', doRegister)
  pass2Up.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister() })
  passUp.addEventListener('keydown',  e => { if (e.key === 'Enter') pass2Up.focus() })
  emailUp.addEventListener('keydown', e => { if (e.key === 'Enter') passUp.focus() })

  setTimeout(() => emailIn.focus(), 100)
}

function showErr(el, msg) {
  el.textContent = msg
  el.style.display = 'block'
}
