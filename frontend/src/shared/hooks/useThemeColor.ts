import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

function getTopColor(): string | null {
  const safeTop = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'
  )
  const y = Math.max(safeTop + 1, 1)
  const cx = window.innerWidth / 2

  let el = document.elementFromPoint(cx, y) as HTMLElement | null
  while (el && el !== document.documentElement) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return rgbToHex(bg)
    }
    el = el.parentElement
  }
  return rgbToHex(getComputedStyle(document.body).backgroundColor)
}

export function useAutoThemeColor() {
  const location = useLocation()

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return

    // aguarda o render da nova rota antes de ler a cor
    const id = requestAnimationFrame(() => {
      const color = getTopColor()
      if (color) meta.setAttribute('content', color)
    })

    return () => cancelAnimationFrame(id)
  }, [location.pathname])
}
