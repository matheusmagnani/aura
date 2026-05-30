import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const PAGE_H = 1123
export const PAGE_PAD_V = 60
export const PAGE_PAD_H = 72
export const CONTENT_H = PAGE_H - PAGE_PAD_V * 2  // 1003
export const PAGE_GAP = 20
export const PAGE_JUMP = PAGE_PAD_V + PAGE_GAP + PAGE_PAD_V  // 140 — space to skip at each break

const pluginKey = new PluginKey<DecorationSet>('pageBreak')

export const PageBreakExtension = Extension.create({
  name: 'pageBreak',

  addProseMirrorPlugins() {
    let dispatching = false

    return [
      new Plugin({
        key: pluginKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, set, _, newState) {
            const next = tr.getMeta(pluginKey)
            if (next !== undefined) return next as DecorationSet
            if (tr.docChanged) return DecorationSet.empty
            return set.map(tr.mapping, newState.doc)
          },
        },

        props: {
          decorations: state => pluginKey.getState(state),
        },

        view: editorView => {
          let raf: ReturnType<typeof requestAnimationFrame> | null = null

          const measure = () => {
            if (dispatching) return

            const proseMirrorEl = editorView.dom as HTMLElement
            // Direct DOM children of .ProseMirror correspond 1:1 with doc's top-level nodes
            const domBlocks = Array.from(proseMirrorEl.children) as HTMLElement[]

            const decorations: Decoration[] = []
            // .ProseMirror has position:relative → it IS the offsetParent.
            // p.offsetTop starts at 0 (not at PAGE_PAD_V), so boundary = CONTENT_H only.
            let pageEnd = CONTENT_H  // first boundary: 1003px
            let cumulative = 0  // extra px added by decorations already decided
            let blockIdx = 0

            editorView.state.doc.forEach((node, pos) => {
              const el = domBlocks[blockIdx++]
              if (!el) return

              // Adjusted position (accounts for spacers already decided above)
              const top = el.offsetTop + cumulative
              const bottom = top + el.offsetHeight

              // Advance pageEnd past boundaries already covered by previous blocks
              while (top >= pageEnd + PAGE_JUMP) {
                pageEnd += CONTENT_H + PAGE_JUMP
              }

              if (top < pageEnd && bottom > pageEnd) {
                // Block crosses the page boundary — push it to the next page content area
                const pushBy = PAGE_JUMP + (pageEnd - top)
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    style: `margin-top: ${pushBy}px`,
                  }),
                )
                cumulative += pushBy
                pageEnd += CONTENT_H + PAGE_JUMP
              } else if (top >= pageEnd) {
                // Block starts inside the gap zone (bottom margin + gap + top margin).
                // Push it to the start of the next page content area.
                const pushBy = pageEnd + PAGE_JUMP - top
                if (pushBy > 0) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      style: `margin-top: ${pushBy}px`,
                    }),
                  )
                  cumulative += pushBy
                }
                pageEnd += CONTENT_H + PAGE_JUMP
              }
            })

            dispatching = true
            editorView.dispatch(
              editorView.state.tr.setMeta(
                pluginKey,
                DecorationSet.create(editorView.state.doc, decorations),
              ),
            )
            dispatching = false
          }

          // Also measure on initial load
          raf = requestAnimationFrame(measure)

          return {
            update(view, prevState) {
              if (dispatching) return
              if (!view.state.doc.eq(prevState.doc)) {
                if (raf) cancelAnimationFrame(raf)
                raf = requestAnimationFrame(measure)
              }
            },
            destroy() {
              if (raf) cancelAnimationFrame(raf)
            },
          }
        },
      }),
    ]
  },
})
