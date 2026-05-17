import { useRef, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

export interface StatisticsStatisticsStatusCardItem {
  id: string
  label: string
  color: string
  primaryValue: string | number
  secondaryValue?: string
}

interface Props {
  items: StatisticsStatusCardItem[]
  activeIds?: string[]
  onToggle?: (id: string) => void
  /**
   * grid    — 2 colunas (padrão). Se pageSize for definido e items > pageSize, pagina.
   * row     — todos em uma linha. Se pageSize definido e items > pageSize, pagina.
   *           Se mobileColumns definido, usa esse nº de colunas no mobile.
   * sidebar — lista vertical (sem paginação).
   */
  layout?: 'grid' | 'row' | 'sidebar'
  /** Itens por página. Ativa paginação com setas e bolinhas quando items > pageSize. */
  pageSize?: number
  /** Nº de colunas no mobile quando layout='row'. Usa Tailwind p/ alternar com desktop. */
  mobileColumns?: number
  /** Esconde o label no mobile. */
  hideLabelOnMobile?: boolean
  compact?: boolean
}

function Card({
  item, active, onToggle, size = 'normal', hideLabelOnMobile = false, compact = false,
}: {
  item: StatisticsStatusCardItem
  active: boolean
  onToggle: () => void
  size?: 'normal' | 'sidebar'
  hideLabelOnMobile?: boolean
  compact?: boolean
}) {
  if (size === 'sidebar') {
    return (
      <div
        onClick={onToggle}
        style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
          background: active ? `${item.color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${active ? item.color : `${item.color}33`}`,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{item.primaryValue}</span>
          {item.secondaryValue && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>{item.secondaryValue}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0,
        padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
        background: active ? `${item.color}22` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? item.color : `${item.color}33`}`,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
        <span
          className={hideLabelOnMobile ? 'hidden md:block' : undefined}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {item.label}
        </span>
      </div>
      <span style={{ fontSize: compact ? 12 : 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{item.primaryValue}</span>
      {item.secondaryValue && (
        <span style={{ fontSize: compact ? 9 : 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>{item.secondaryValue}</span>
      )}
    </div>
  )
}

function Paginated({
  items, activeIds, onToggle, pageSize, columns, hideLabelOnMobile, compact,
}: {
  items: StatisticsStatusCardItem[]
  activeIds: string[]
  onToggle: (id: string) => void
  pageSize: number
  columns: number
  hideLabelOnMobile: boolean
  compact: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPage, setScrollPage] = useState(0)

  if (items.length <= pageSize) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}>
        {items.map(item => (
          <Card key={item.id} item={item} active={activeIds.includes(item.id)} onToggle={() => onToggle(item.id)} hideLabelOnMobile={hideLabelOnMobile} compact={compact} />
        ))}
      </div>
    )
  }

  const pages: StatisticsStatusCardItem[][] = []
  for (let p = 0; p < items.length; p += pageSize)
    pages.push(items.slice(p, p + pageSize))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => scrollRef.current?.scrollTo({ left: (scrollPage - 1) * scrollRef.current.offsetWidth, behavior: 'smooth' })}
          disabled={scrollPage === 0}
          style={{ background: 'none', border: 'none', cursor: scrollPage === 0 ? 'default' : 'pointer', padding: 0, display: 'flex', flexShrink: 0, opacity: scrollPage === 0 ? 0.25 : 1, transition: 'opacity 0.2s' }}
        >
          <CaretLeft size={14} color="var(--color-app-gray)" />
        </button>
        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current
            if (!el) return
            setScrollPage(Math.round(el.scrollLeft / el.offsetWidth))
          }}
          style={{ flex: 1, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {pages.map((page, pi) => (
            <div
              key={pi}
              style={{ flexShrink: 0, width: '100%', scrollSnapAlign: 'start', display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}
            >
              {page.map(item => (
                <Card key={item.id} item={item} active={activeIds.includes(item.id)} onToggle={() => onToggle(item.id)} hideLabelOnMobile={hideLabelOnMobile} compact={compact} />
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={() => scrollRef.current?.scrollTo({ left: (scrollPage + 1) * scrollRef.current.offsetWidth, behavior: 'smooth' })}
          disabled={scrollPage === pages.length - 1}
          style={{ background: 'none', border: 'none', cursor: scrollPage === pages.length - 1 ? 'default' : 'pointer', padding: 0, display: 'flex', flexShrink: 0, opacity: scrollPage === pages.length - 1 ? 0.25 : 1, transition: 'opacity 0.2s' }}
        >
          <CaretRight size={14} color="var(--color-app-gray)" />
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
        {pages.map((_, i) => (
          <div
            key={i}
            onClick={() => scrollRef.current?.scrollTo({ left: i * scrollRef.current!.offsetWidth, behavior: 'smooth' })}
            style={{
              height: 6, borderRadius: 999, cursor: 'pointer',
              width: i === scrollPage ? 16 : 6,
              background: i === scrollPage ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.2)',
              transition: 'width 0.2s, background 0.2s',
            }}
          />
        ))}
      </div>
    </>
  )
}

export function StatisticsStatusCards({
  items,
  activeIds = [],
  onToggle = () => {},
  layout = 'grid',
  pageSize,
  mobileColumns,
  hideLabelOnMobile = false,
  compact = false,
}: Props) {
  if (items.length === 0) return null

  if (layout === 'sidebar') {
    return (
      <>
        {items.map(item => (
          <Card key={item.id} item={item} active={activeIds.includes(item.id)} onToggle={() => onToggle(item.id)} size="sidebar" />
        ))}
      </>
    )
  }

  const desktopCols = layout === 'row' ? items.length : 2

  // row com split mobile/desktop
  if (layout === 'row' && mobileColumns) {
    return (
      <>
        <div className={`grid md:hidden`} style={{ gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))`, gap: 8 }}>
          {items.map(item => (
            <Card key={item.id} item={item} active={activeIds.includes(item.id)} onToggle={() => onToggle(item.id)} hideLabelOnMobile={hideLabelOnMobile} compact={compact} />
          ))}
        </div>
        <div className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${desktopCols}, minmax(0, 1fr))`, gap: 8 }}>
          {items.map(item => (
            <Card key={item.id} item={item} active={activeIds.includes(item.id)} onToggle={() => onToggle(item.id)} hideLabelOnMobile={hideLabelOnMobile} compact={compact} />
          ))}
        </div>
      </>
    )
  }

  // com paginação
  if (pageSize) {
    return (
      <Paginated
        items={items}
        activeIds={activeIds}
        onToggle={onToggle}
        pageSize={pageSize}
        columns={desktopCols}
        hideLabelOnMobile={hideLabelOnMobile}
        compact={compact}
      />
    )
  }

  // grid/row simples
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${desktopCols}, minmax(0, 1fr))`, gap: 8 }}>
      {items.map(item => (
        <Card key={item.id} item={item} active={activeIds.includes(item.id)} onToggle={() => onToggle(item.id)} hideLabelOnMobile={hideLabelOnMobile} compact={compact} />
      ))}
    </div>
  )
}
