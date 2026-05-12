import { ALL_CODES, GROUPS } from '../data/stickers.js'

/**
 * Parsea una lista de figuritas en cualquier formato:
 *   - Códigos completos:  "MEX4 MEX5 BRA16"
 *   - Equipo + números:   "MEX 🇲🇽: 4, 5, 17"
 *   - Líneas de grupo:    "— Grupo A —"  (ignoradas)
 * Devuelve un array de códigos válidos según ALL_CODES.
 */
export function parseList(text) {
  const results = []
  const lines = text.split('\n').filter(l => l.trim())

  lines.forEach(line => {
    // Intentar primero códigos completos: 2-4 letras seguidas de 1-2 dígitos
    const direct = line.toUpperCase().match(/[A-Z]{2,4}\d{1,2}/g)
    if (direct) {
      direct.forEach(c => { if (ALL_CODES.has(c)) results.push(c) })
      return
    }

    // Fallback: extraer equipo y números por separado (ej. "MEX: 4, 5, 17")
    const upper = line.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').trim()
    const parts  = upper.split(/\s+/)
    const team   = parts.find(p => /^[A-Z]{2,4}$/.test(p))
    if (!team) return
    const numbers = line.match(/\d+/g)
    if (!numbers) return
    numbers.forEach(n => {
      const code = `${team}${n}`
      if (ALL_CODES.has(code)) results.push(code)
    })
  })

  return results
}

/**
 * Formatea un array de códigos al estilo: "MEX 🇲🇽: 4, 5, 17"
 * Mantiene el orden de GROUPS y agrupa por equipo.
 */
export function formatExportList(codes) {
  const codeSet = codes // puede ser array con repetidos (para dupes)
  const lines = []

  GROUPS.forEach(g => {
    g.teams.forEach(t => {
      const teamCodes = codeSet.filter(c => c.startsWith(t.id))
      if (!teamCodes.length) return
      const nums = teamCodes.map(c => c.slice(t.id.length))
      lines.push(`${t.id} ${t.flag}: ${nums.join(', ')}`)
    })
  })

  return lines.join('\n')
}
