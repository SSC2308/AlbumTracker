export function mountAlbumSelector(onSelect) {
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
          <span class="als-card-sub">Panini</span>
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

  overlay.querySelector('#als-wc2026').addEventListener('click', () => {
    overlay.classList.add('als-fade-out')
    overlay.addEventListener('transitionend', () => {
      overlay.remove()
      onSelect('wc2026')
    }, { once: true })
  })
}
