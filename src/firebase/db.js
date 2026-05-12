import { initializeApp } from 'firebase/app'
import {
  getFirestore, doc, onSnapshot,
  setDoc, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey:            'AIzaSyCjr2V6z4h12RJQhEixlCpNfTvqfv8H9IE',
  authDomain:        'cletaeats-71879.firebaseapp.com',
  projectId:         'cletaeats-71879',
  storageBucket:     'cletaeats-71879.firebasestorage.app',
  messagingSenderId: '250442768448',
  appId:             '1:250442768448:web:79b1014b57652c27d63fa5',
})

const db  = getFirestore(app)
const REF = doc(db, 'albums', 'mundial2026')

/**
 * Subscribes to the album document.
 * Callback receives a Set<string> of collected codes.
 * Returns the Firestore unsubscribe function.
 */
/** cb(collected: Set<string>, dupes: {code: count}) */
export const subscribe = (cb) =>
  onSnapshot(REF, snap => {
    const data = snap.data() ?? {}
    cb(new Set(data.collected ?? []), data.dupes ?? {})
  })

/**
 * Adds a sticker code. Uses setDoc+merge so the document
 * is created automatically on first write.
 */
export const addSticker = (code) =>
  setDoc(REF, { collected: arrayUnion(code) }, { merge: true })

export const removeSticker = (code) =>
  setDoc(REF, { collected: arrayRemove(code) }, { merge: true })

/** Repetidas — usa Firestore increment para no pisar escrituras concurrentes */
export const addDupe    = (code) => setDoc(REF, { dupes: { [code]: increment(1)  } }, { merge: true })
export const removeDupe = (code) => setDoc(REF, { dupes: { [code]: increment(-1) } }, { merge: true })
