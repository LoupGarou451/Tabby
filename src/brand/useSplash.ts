import { useEffect } from 'react'

const MIN_MS = 1200
const MIN_MS_REDUCED = 600
const SESSION_KEY = 'tabby:splash'

// Fades out the splash that index.html paints before JS loads. It stays up for a
// minimum time measured from page load, never longer, and any tap or key skips it.
export function useSplash() {
  useEffect(() => {
    const el = document.getElementById('splash')
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // storage unavailable (private mode) — the splash just shows again next load
    }
    if (!el || document.documentElement.classList.contains('no-splash')) {
      el?.remove()
      return
    }

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const remaining = Math.max(0, (reduced ? MIN_MS_REDUCED : MIN_MS) - performance.now())

    const dismiss = () => {
      if (el.classList.contains('splash--out')) return
      el.setAttribute('aria-hidden', 'true')
      el.classList.add('splash--out')
      el.addEventListener('transitionend', () => el.remove(), { once: true })
      setTimeout(() => el.remove(), 500) // in case transitionend never fires
    }

    const timer = setTimeout(dismiss, remaining)
    el.addEventListener('click', dismiss)
    window.addEventListener('keydown', dismiss, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', dismiss)
    }
  }, [])
}
