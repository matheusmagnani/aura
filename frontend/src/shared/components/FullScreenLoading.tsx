import React from 'react'
import CircularProgress, { circularProgressClasses } from '@mui/material/CircularProgress'

function GradientSpinner() {
  return (
    <React.Fragment>
      <svg width={0} height={0}>
        <defs>
          <linearGradient id="aura_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1D2529" />
            <stop offset="100%" stopColor="#6AA6C1" />
          </linearGradient>
        </defs>
      </svg>
      <CircularProgress
        variant="indeterminate"
        disableShrink
        size={44}
        thickness={4}
        aria-label="Carregando…"
        sx={{
          animationDuration: '600ms',
          filter: 'blur(1.5px)',
          'svg circle': { stroke: 'url(#aura_gradient)' },
          [`& .${circularProgressClasses.circle}`]: { strokeLinecap: 'round' },
        }}
      />
    </React.Fragment>
  )
}

interface FullScreenLoadingProps {
  visible: boolean
  label?: string
}

export function FullScreenLoading({ visible, label }: FullScreenLoadingProps) {
  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgb(var(--color-app-bg-rgb) / 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, pointerEvents: 'all',
    }}>
      <GradientSpinner />
      {label && (
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em' }}>
          {label}
        </span>
      )}
    </div>
  )
}
