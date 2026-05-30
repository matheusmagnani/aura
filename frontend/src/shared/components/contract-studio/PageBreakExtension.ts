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
            const domBlocks = Array.from(proseMirrorEl.children) as HTMLElement[]

            // getBoundingClientRect relative to ProseMirror cancels scroll and
            // does not depend on offsetParent — block top = elRect.top - pmRect.top
            const pmRect = proseMirrorEl.getBoundingClientRect()

            const decorations: Decoration[] = []
            let pageEnd = CONTENT_H  // first boundary in ProseMirror-local coordinates
            let cumulative = 0
            let blockIdx = 0

            editorView.state.doc.forEach((node, pos) => {
              const el = domBlocks[blockIdx++]
              if (!el) return

              const elRect = el.getBoundingClientRect()
              const top = (elRect.top - pmRect.top) + cumulative
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
