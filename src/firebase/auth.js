import {
  getAuth, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'firebase/auth'
import { firebaseApp } from './app.js'

const auth = getAuth(firebaseApp)

export const login    = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const register = (email, password) => createUserWithEmailAndPassword(auth, email, password)
export const logout   = () => signOut(auth).then(() => location.reload())
export const onAuth   = (cb) => onAuthStateChanged(auth, cb)
export const getUser  = () => auth.currentUser
