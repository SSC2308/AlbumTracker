import { login } from '../firebase/auth.js'

export function mountLogin(onSuccess) {
  const overlay = document.createElement('div')
  overlay.id = 'login-overlay'
  overlay.innerHTML = `
    <div class="login-box">
      <img src="/logo-wc26.png" class="login-logo" alt="FIFA World Cup 2026">
      <h2 class="login-title">Album Mundial 2026</h2>
      <div class="login-fields">
        <input id="login-user" class="ing-input" type="text"
          placeholder="Usuario" autocomplete="username"
          autocorrect="off" autocapitalize="off" spellcheck="false">
        <input id="login-pass" class="ing-input" type="password"
          placeholder="Contraseña" autocomplete="current-password">
      </div>
      <div id="login-err" class="login-err" style="display:none"></div>
      <button class="btn btn-p btn-full" id="login-btn" style="margin-top:4px">Entrar</button>
    </div>
  `
  document.body.appendChild(overlay)

  const userEl = overlay.querySelector('#login-user')
  const passEl = overlay.querySelector('#login-pass')
  const btnEl  = overlay.querySelector('#login-btn')
  const errEl  = overlay.querySelector('#login-err')

  async function doLogin() {
    const username = userEl.value.trim()
    const password = passEl.value
    if (!username || !password) { showErr('Completa los campos'); return }

    btnEl.disabled = true
    btnEl.textContent = 'Entrando...'
    errEl.style.display = 'none'

    const result = await login(username, password)
    if (result.ok) {
      overlay.classList.add('login-fade-out')
      overlay.addEventListener('transitionend', () => {
        overlay.remove()
        onSuccess()
      }, { once: true })
    } else {
      showErr(result.error)
      btnEl.disabled = false
      btnEl.textContent = 'Entrar'
    }
  }

  function showErr(msg) {
    errEl.textContent = msg
    errEl.style.display = 'block'
  }

  btnEl.addEventListener('click', doLogin)
  passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })
  userEl.addEventListener('keydown', e => { if (e.key === 'Enter') passEl.focus() })

  // Focus usuario al cargar
  setTimeout(() => userEl.focus(), 100)
}
