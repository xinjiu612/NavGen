import { createContext, useContext, useEffect, useState } from 'react'

const MediaContext = createContext(null)

/** Resolve a manifest-relative path against Vite's BASE_URL. */
export function mediaUrl(rel) {
  if (!rel) return null
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/, '')}/media/${rel}`
}

export function MediaProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let alive = true
    fetch(mediaUrl('manifest.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`)
        return r.json()
      })
      .then((data) => alive && setState({ status: 'ready', data, error: null }))
      .catch((error) => alive && setState({ status: 'error', data: null, error }))
    return () => {
      alive = false
    }
  }, [])

  return <MediaContext.Provider value={state}>{children}</MediaContext.Provider>
}

export function useMedia() {
  const ctx = useContext(MediaContext)
  if (!ctx) throw new Error('useMedia must be used inside <MediaProvider>')
  return ctx
}

/** Manifest slice with a safe empty default while loading. */
export function useMediaSlice(key, fallback) {
  const { data } = useMedia()
  return data?.[key] ?? fallback
}

/**
 * Build the compare-player URLs for one (method, task) pair. Each method
 * carries its own template because the bidirectional run is laid out
 * differently on disk from the per-dataset rollouts.
 */
export function compareUrls(method, task) {
  const fill = (tpl) => tpl.replace('{task}', task)
  return {
    video: mediaUrl(fill(method.video)),
    poster: mediaUrl(fill(method.poster)),
  }
}
