import { useRef, useCallback } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { TextAlignLeft, TextAlignCenter, TextAlignRight, DotsSixVertical } from '@phosphor-icons/react'

export function ResizableImageView({ editor, node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, title, width, align = 'left' } = node.attrs
  const imgRef = useRef<HTMLImageElement>(null)

  function makeResizeHandler(direction: 'left' | 'right') {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startW = imgRef.current?.offsetWidth ?? (Number(width) || 400)

      const onMove = (ev: MouseEvent) => {
        const dx = direction === 'right'
          ? ev.clientX - startX
          : startX - ev.clientX
        const newW = Math.max(50, Math.round(startW + dx))
        updateAttributes({ width: newW })
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
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
