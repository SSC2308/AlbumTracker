import { firebaseApp } from './app.js'
import {
  getFirestore, doc, onSnapshot, getDoc,
  setDoc, updateDoc, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore'

const db = getFirestore(firebaseApp)

// REF is set once per session via initDb()
let REF = null

export function initDb(uid, albumId = 'wc2026') {
  REF = doc(db, 'users', uid, 'albums', albumId)
}

/** cb(collected: Set<string>, dupes: {code: count}, trades: {id: trade}) */
export const subscribe = (cb) =>
  onSnapshot(REF, snap => {
    const data = snap.data() ?? {}
    cb(new Set(data.collected ?? []), data.dupes ?? {}, data.trades ?? {})
  })

export const addSticker   = (code) => setDoc(REF, { collected: arrayUnion(code)    }, { merge: true })
export const removeSticker = (code) => setDoc(REF, { collected: arrayRemove(code)   }, { merge: true })

/** Repetidas */
export const addDupe    = (code) => setDoc(REF, { dupes: { [code]: increment(1)  } }, { merge: true })
export const removeDupe = (code) => setDoc(REF, { dupes: { [code]: increment(-1) } }, { merge: true })

/** Intercambios */
export function savePendingTrade({ partner, gave, received }) {
  const id = Date.now().toString()
  return updateDoc(REF, {
    [`trades.${id}`]: { partner, gave, received, status: 'pending', ts: new Date().toISOString() }
  })
}

export const completeTrade = (id) =>
  updateDoc(REF, {
    [`trades.${id}.status`]:       'done',
    [`trades.${id}.ts_confirmed`]: new Date().toISOString(),
  })

export const cancelTrade = (id) =>
  updateDoc(REF, { [`trades.${id}.status`]: 'cancelled' })

/**
 * Migración desde el esquema anterior (albums/mundial2026 → users/{uid}/albums/wc2026).
 * Solo corre si el nuevo doc está vacío y el viejo existe.
 */
export async function migrateFromLegacy() {
  if (!REF) return { migrated: false }
  const newSnap = await getDoc(REF)
  if (newSnap.exists() && (newSnap.data().collected ?? []).length > 0) return { migrated: false }

  const legacyRef = doc(db, 'albums', 'mundial2026')
  const oldSnap   = await getDoc(legacyRef)
  if (!oldSnap.exists()) return { migrated: false }

  await setDoc(REF, oldSnap.data())
  return { migrated: true }
}

/** Migración de códigos renombrados (JAP→JPN, FW→FWC) */
export async function migrateOldCodes() {
  const FW_RE = /^FW(\d+)$/

  const snap = await getDoc(REF)
  const data = snap.data() ?? {}
  const collected = data.collected ?? []
  const dupes     = data.dupes     ?? {}

  const newCollected = collected.map(c => {
    if (c === '00') return 'FWC00'
    const fw = c.match(FW_RE); if (fw) return `FWC${fw[1]}`
    if (c.startsWith('JAP')) return 'JPN' + c.slice(3)
    return c
  })

  const newDupes = {}
  for (const [code, count] of Object.entries(dupes)) {
    let nc = code
    if (code === '00') nc = 'FWC00'
    else { const fw = code.match(FW_RE); if (fw) nc = `FWC${fw[1]}` }
    if (code.startsWith('JAP')) nc = 'JPN' + code.slice(3)
    newDupes[nc] = count
  }

  await setDoc(REF, { collected: newCollected, dupes: newDupes })
  return { fixed: collected.filter((c, i) => c !== newCollected[i]).length }
}
