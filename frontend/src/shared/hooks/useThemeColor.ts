import { useEffect } from 'react'

export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const previous = meta.getAttribute('content') ?? ''
    meta.setAttribute('content', color)
    return () => {
      meta.setAttribute('content', previous)
    }
  }, [color])
}
