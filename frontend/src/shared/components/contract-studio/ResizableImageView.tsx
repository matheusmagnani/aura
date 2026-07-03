import { useRef, useCallback } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { TextAlignLeft, TextAlignCenter, TextAlignRight, DotsSixVertical, ArrowUp, ArrowDown, PushPin } from '@phosphor-icons/react'

const MARGIN_STEP = 4
const MARGIN_MAX = 120

export function ResizableImageView({ editor, node, updateAttributes, selected, getPos }: NodeViewProps) {
  const { src, alt, title, width, align = 'left', marginTop = 0, marginBottom = 0, pinned = false } = node.attrs
  const imgRef = useRef<HTMLImageElement>(null)

  function makeResizeHandler(direction: 'left' | 'right') {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const img = imgRef.current
      if (!img) return

      const startX = e.clientX
      const startW = img.offsetWidth || Number(width) || 400

      const onMove = (ev: MouseEvent) => {
        const dx = direction === 'right'
          ? ev.clientX - startX
          : startX - ev.clientX
        const newW = Math.max(50, Math.round(startW + dx))
        // Update the img CSS directly — no ProseMirror transaction during drag.
        // This lets the ResizeObserver in PageBreakExtension detect the size change
        // and re-measure page breaks in real time, without the race condition caused
        // by calling updateAttributes on every pixel (which would dispatch a transaction,
        // clear all decorations, and schedule a RAF before React re-rendered the new size).
        img.style.width = `${newW}px`
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        // Commit final width to ProseMirror state only on mouseup (one transaction total).
        const finalW = img.offsetWidth || startW
        updateAttributes({ width: finalW })
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  const setAlign = useCallback(
    (a: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      updateAttributes({ align: a })
    },
    [updateAttributes],
  )

  const adjustMargin = useCallback(
    (side: 'marginTop' | 'marginBottom', delta: number) => (e: React.MouseEvent) => {
      e.preventDefault()
      const current = side === 'marginTop' ? (marginTop ?? 0) : (marginBottom ?? 0)
      const next = Math.max(0, Math.min(MARGIN_MAX, current + delta))
      updateAttributes({ [side]: next })
    },
    [updateAttributes, marginTop, marginBottom],
  )

  const alignments = [
    { value: 'left', icon: <TextAlignLeft size={14} /> },
    { value: 'center', icon: <TextAlignCenter size={14} /> },
    { value: 'right', icon: <TextAlignRight size={14} /> },
  ]

  return (
    <NodeViewWrapper
      style={{
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        marginTop: marginTop ? `${marginTop}px` : undefined,
        marginBottom: marginBottom ? `${marginBottom}px` : undefined,
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ''}
          title={title ?? ''}
          draggable={false}
          style={{
            width: width ? `${width}px` : undefined,
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            outline: selected ? '2px solid #6AA6C1' : 'none',
            outlineOffset: 1,
          }}
        />

        {/* Pinned badge — always visible when pinned */}
        {pinned && editor.isEditable && (
          <div
            contentEditable={false}
            title="Imagem fixada — não será empurrada por quebras de página"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(106,166,193,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <PushPin size={11} weight="fill" color="#fff" />
          </div>
        )}

        {selected && editor.isEditable && (
          <>
            {/* Alignment + size toolbar (with drag handle) */}
            <div
              contentEditable={false}
              style={{
                position: 'absolute',
                top: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: 'var(--color-app-primary)',
                border: '1px solid rgba(106,166,193,0.3)',
                borderRadius: 8,
                padding: '4px 8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                zIndex: 20,
                whiteSpace: 'nowrap',
              }}
            >
              {/* Drag handle */}
              <div
                data-drag-handle
                style={{
                  cursor: 'grab',
                  color: 'rgba(106,166,193,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: 4,
                  marginRight: 2,
                  borderRight: '1px solid rgba(106,166,193,0.25)',
                }}
              >
                <DotsSixVertical size={14} weight="bold" />
              </div>
              {alignments.map(({ value, icon }) => (
                <button
                  key={value}
                  type="button"
                  onMouseDown={setAlign(value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: align === value ? 'rgba(106,166,193,0.25)' : 'transparent',
                    color: align === value ? '#6AA6C1' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {icon}
                </button>
              ))}

              <span style={{
                marginLeft: 4,
                paddingLeft: 6,
                borderLeft: '1px solid rgba(106,166,193,0.25)',
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace',
              }}>
                {width ? `${width}px` : 'auto'}
              </span>

              {/* Pin toggle */}
              <div style={{
                marginLeft: 4,
                paddingLeft: 6,
                borderLeft: '1px solid rgba(106,166,193,0.25)',
                display: 'flex',
                alignItems: 'center',
              }}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (pinned) {
                      updateAttributes({ pinned: false, pinnedVisualY: null })
                    } else {
                      const pos = typeof getPos === 'function' ? getPos() : null
                      let pinnedVisualY: number | null = null
                      if (pos != null) {
                        const nodeEl = editor.view.nodeDOM(pos) as HTMLElement | null
                        if (nodeEl) {
                          pinnedVisualY = nodeEl.getBoundingClientRect().top - editor.view.dom.getBoundingClientRect().top
                        }
                      }
                      updateAttributes({ pinned: true, pinnedVisualY })
                    }
                  }}
                  title={pinned ? 'Desafixar imagem' : 'Fixar imagem nesta posição'}
                  style={{
                    ...marginBtnStyle,
                    width: 22,
                    height: 22,
                    color: pinned ? '#6AA6C1' : 'rgba(255,255,255,0.5)',
                    background: pinned ? 'rgba(106,166,193,0.25)' : 'rgba(106,166,193,0.1)',
                  }}
                >
                  <PushPin size={12} weight={pinned ? 'fill' : 'regular'} />
                </button>
              </div>

              {/* Margin top */}
              <div style={{
                marginLeft: 4,
                paddingLeft: 6,
                borderLeft: '1px solid rgba(106,166,193,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}>
                <ArrowUp size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <button type="button" onMouseDown={adjustMargin('marginTop', -MARGIN_STEP)} style={marginBtnStyle}>−</button>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 26, textAlign: 'center' }}>
                  {marginTop ?? 0}px
                </span>
                <button type="button" onMouseDown={adjustMargin('marginTop', MARGIN_STEP)} style={marginBtnStyle}>+</button>
              </div>

              {/* Margin bottom */}
              <div style={{
                marginLeft: 2,
                paddingLeft: 6,
                borderLeft: '1px solid rgba(106,166,193,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}>
                <ArrowDown size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <button type="button" onMouseDown={adjustMargin('marginBottom', -MARGIN_STEP)} style={marginBtnStyle}>−</button>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', minWidth: 26, textAlign: 'center' }}>
                  {marginBottom ?? 0}px
                </span>
                <button type="button" onMouseDown={adjustMargin('marginBottom', MARGIN_STEP)} style={marginBtnStyle}>+</button>
              </div>
            </div>

            {/* Left resize handle */}
            <div
              contentEditable={false}
              onMouseDown={makeResizeHandler('left')}
              style={handleStyle('left')}
            />

            {/* Right resize handle */}
            <div
              contentEditable={false}
              onMouseDown={makeResizeHandler('right')}
              style={handleStyle('right')}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const marginBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: 3,
  border: 'none',
  cursor: 'pointer',
  background: 'rgba(106,166,193,0.15)',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.75rem',
  lineHeight: 1,
  padding: 0,
}

function handleStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: -5,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 10,
    height: 10,
    background: '#6AA6C1',
    borderRadius: '50%',
    boxShadow: '0 0 0 2px #fff',
    cursor: 'ew-resize',
    zIndex: 10,
  }
}
