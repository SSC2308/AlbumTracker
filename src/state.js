let _collected = new Set()
let _dupes     = {}          // { code: count }
const _listeners      = new Set()
const _dupesListeners = new Set()

export const get = () => _collected
export const set = (newSet) => { _collected = newSet; _listeners.forEach(fn => fn(newSet)) }
export const on  = (fn) => { _listeners.add(fn); return () => _listeners.delete(fn) }

export const getDupes = () => _dupes
export const setDupes = (d) => { _dupes = d; _dupesListeners.forEach(fn => fn(d)) }
export const onDupes  = (fn) => { _dupesListeners.add(fn); return () => _dupesListeners.delete(fn) }
