export const GROUPS = [
  { id: 'esp', label: 'Especiales FIFA', teams: [
    { id: 'FIFA', name: 'FIFA World Cup 2026', flag: '🏆',
      stickers: ['FWC00','FWC1','FWC2','FWC3','FWC4','FWC5','FWC6','FWC7','FWC8','FWC9','FWC10','FWC11','FWC12','FWC13','FWC14','FWC15','FWC16','FWC17','FWC18','FWC19'] }
  ]},
  { id: 'A', label: 'Grupo A', teams: [
    { id: 'MEX', name: 'México',        flag: '🇲🇽' },
    { id: 'RSA', name: 'Sudáfrica',     flag: '🇿🇦' },
    { id: 'KOR', name: 'Corea del Sur', flag: '🇰🇷' },
    { id: 'CZE', name: 'Rep. Checa',    flag: '🇨🇿' },
  ]},
  { id: 'B', label: 'Grupo B', teams: [
    { id: 'CAN', name: 'Canadá',            flag: '🇨🇦' },
    { id: 'BIH', name: 'Bosnia y Herz.',    flag: '🇧🇦' },
    { id: 'QAT', name: 'Qatar',             flag: '🇶🇦' },
    { id: 'SUI', name: 'Suiza',             flag: '🇨🇭' },
  ]},
  { id: 'C', label: 'Grupo C', teams: [
    { id: 'BRA', name: 'Brasil',    flag: '🇧🇷' },
    { id: 'MAR', name: 'Marruecos', flag: '🇲🇦' },
    { id: 'HAI', name: 'Haití',     flag: '🇭🇹' },
    { id: 'SCO', name: 'Escocia',   flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  ]},
  { id: 'D', label: 'Grupo D', teams: [
    { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸' },
    { id: 'PAR', name: 'Paraguay',       flag: '🇵🇾' },
    { id: 'AUS', name: 'Australia',      flag: '🇦🇺' },
    { id: 'TUR', name: 'Turquía',        flag: '🇹🇷' },
  ]},
  { id: 'E', label: 'Grupo E', teams: [
    { id: 'GER', name: 'Alemania',        flag: '🇩🇪' },
    { id: 'CUW', name: 'Curazao',         flag: '🇨🇼' },
    { id: 'CIV', name: 'Costa de Marfil', flag: '🇨🇮' },
    { id: 'ECU', name: 'Ecuador',         flag: '🇪🇨' },
  ]},
  { id: 'F', label: 'Grupo F', teams: [
    { id: 'NED', name: 'Países Bajos', flag: '🇳🇱' },
    { id: 'JPN', name: 'Japón',        flag: '🇯🇵' },
    { id: 'SWE', name: 'Suecia',       flag: '🇸🇪' },
    { id: 'TUN', name: 'Túnez',        flag: '🇹🇳' },
  ]},
  { id: 'G', label: 'Grupo G', teams: [
    { id: 'BEL', name: 'Bélgica',       flag: '🇧🇪' },
    { id: 'EGY', name: 'Egipto',        flag: '🇪🇬' },
    { id: 'IRN', name: 'Irán',          flag: '🇮🇷' },
    { id: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿' },
  ]},
  { id: 'H', label: 'Grupo H', teams: [
    { id: 'ESP', name: 'España',         flag: '🇪🇸' },
    { id: 'CPV', name: 'Cabo Verde',     flag: '🇨🇻' },
    { id: 'KSA', name: 'Arabia Saudita', flag: '🇸🇦' },
    { id: 'URU', name: 'Uruguay',        flag: '🇺🇾' },
  ]},
  { id: 'I', label: 'Grupo I', teams: [
    { id: 'FRA', name: 'Francia',  flag: '🇫🇷' },
    { id: 'SEN', name: 'Senegal',  flag: '🇸🇳' },
    { id: 'IRQ', name: 'Irak',     flag: '🇮🇶' },
    { id: 'NOR', name: 'Noruega',  flag: '🇳🇴' },
  ]},
  { id: 'J', label: 'Grupo J', teams: [
    { id: 'ARG', name: 'Argentina', flag: '🇦🇷' },
    { id: 'ALG', name: 'Argelia',   flag: '🇩🇿' },
    { id: 'AUT', name: 'Austria',   flag: '🇦🇹' },
    { id: 'JOR', name: 'Jordania',  flag: '🇯🇴' },
  ]},
  { id: 'K', label: 'Grupo K', teams: [
    { id: 'POR', name: 'Portugal',    flag: '🇵🇹' },
    { id: 'COD', name: 'RD Congo',    flag: '🇨🇩' },
    { id: 'UZB', name: 'Uzbekistán',  flag: '🇺🇿' },
    { id: 'COL', name: 'Colombia',    flag: '🇨🇴' },
  ]},
  { id: 'L', label: 'Grupo L', teams: [
    { id: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 'CRO', name: 'Croacia',    flag: '🇭🇷' },
    { id: 'GHA', name: 'Ghana',      flag: '🇬🇭' },
    { id: 'PAN', name: 'Panamá',     flag: '🇵🇦' },
  ]},
]

// Generate numeric stickers for all non-special teams
GROUPS.forEach(g => g.teams.forEach(t => {
  if (!t.stickers) t.stickers = Array.from({ length: 20 }, (_, i) => `${t.id}${i + 1}`)
}))

export const ALL_CODES = new Set()
export const CODE_TO_TEAM = {}

GROUPS.forEach(g => g.teams.forEach(t => {
  t.stickers.forEach(s => { ALL_CODES.add(s); CODE_TO_TEAM[s] = t })
}))

export const TOTAL = ALL_CODES.size // 980
