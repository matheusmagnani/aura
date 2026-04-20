import { useState } from 'react'

export function useExpandedSection<T extends string>() {
  const [expanded, setExpanded] = useState<T | null>(null)

  function toggle(section: T) {
    setExpanded(prev => (prev === section ? null : section))
  }

  return { expanded, toggle }
}
