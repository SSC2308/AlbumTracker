import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'

const SESSION_KEY = 'album_session'

function db() { return getFirestore(getApp()) }

export async function login(username, password) {
  const ref  = doc(db(), 'cuentas', username.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return { ok: false, error: 'Usuario no encontrado' }
  const data = snap.data()
  if (data.password !== password) return { ok: false, error: 'Contraseña incorrecta' }
  if (data.rol !== 'Admin') return { ok: false, error: 'Sin acceso' }
  localStorage.setItem(SESSION_KEY, username.trim())
  return { ok: true }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  location.reload()
}

export function getSession() {
  return localStorage.getItem(SESSION_KEY)
}
