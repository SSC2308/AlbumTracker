const el = document.getElementById('toast')
let timer

export function toast(msg, type = 'ok') {
  el.textContent = msg
  el.className = `toast ${type} show`
  clearTimeout(timer)
  timer = setTimeout(() => el.classList.remove('show'), 2200)
}
