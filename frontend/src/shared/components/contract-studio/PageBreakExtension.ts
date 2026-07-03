import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const PAGE_H = 1123
export const PAGE_PAD_V = 60
export const PAGE_PAD_H = 72
export const PAGE_GAP = 20
// Breathing space kept between a pinned block (logo/number/divider) and the flow
// content pushed below it, so the text doesn't sit flush against the fixed block.
// Applied to every pinned block's reserved area, so it's generic to any template.
// NOTE: this accumulates (each page's content starts a bit lower), so keep it small
// — a large value can push the last content of a long document onto an extra page.
export const PINNED_CONTENT_GAP = 5

let _forceMeasure: (() => void) | null = null
export function forcePageBreakMeasure() { _forceMeasure?.() }

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
          // Set after our own dispatch so the pm-level ResizeObserver ignores the
          // resize that we caused (avoids an unnecessary extra measure pass).
          let skipNextPmResize = false
          // Convergence tracking: keep measuring until the decoration set stabilises.
          // Without this, a wrong first-pass state (due to absoluteFlowRemoved
          // approximation) can get stuck because skipNextPmResize swallows the only
          // external trigger that would re-run measure().
          let prevDecoSig = ''
          let passCount = 0
          const MAX_PASSES = 8

          // Find the scrollable ancestor once. We disable overflow-anchor to stop
          // the browser from auto-adjusting scrollTop when margin-tops change (scroll
          // anchoring fires after JS, so a synchronous restore alone isn't enough).
          // We also save/restore scrollTop around each dispatch as a belt-and-
          // suspenders measure against any remaining ProseMirror scroll logic.
          const scrollParent = (() => {
            let el: HTMLElement | null = (editorView.dom as HTMLElement).parentElement
            while (el) {
              const oy = getComputedStyle(el).overflowY
              if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return el
              el = el.parentElement
            }
            return null
          })()
          if (scrollParent) scrollParent.style.overflowAnchor = 'none'

          const measure = () => {
            if (dispatching) return

            const proseMirrorEl = editorView.dom as HTMLElement

            const domBlocks = Array.from(proseMirrorEl.children).filter(
              el =>
                !el.classList.contains('ProseMirror-gapcursor') &&
                !el.classList.contains('ProseMirror-dropcursor'),
            ) as HTMLElement[]

            const wrapperEl = proseMirrorEl.closest('[data-editor-wrapper]') as HTMLElement | null
            const padV = wrapperEl
              ? (parseFloat(getComputedStyle(wrapperEl).paddingTop) || PAGE_PAD_V)
              : PAGE_PAD_V
            const contentH = PAGE_H - 2 * padV
            const pageJump = 2 * padV + PAGE_GAP
            const pmRect = proseMirrorEl.getBoundingClientRect()

            // Pre-pass: collect Y ranges that pinned blocks will occupy so we can
            // prevent non-pinned blocks (that come AFTER the pin in document order)
            // from being page-break-pushed into them.
            // pinnedDocIdx: 0-based document index of the pinned block, so we can
            // distinguish pre-pin blocks (which should flow freely past the pin area)
            // from post-pin blocks (which must be kept below the pin).
            const reservedRanges: Array<{ start: number; end: number; pinnedDocIdx: number }> = []
            {
              let pi = 0
              editorView.state.doc.forEach(node => {
                const el = domBlocks[pi++]
                if (!el) return
                if (node.attrs?.pinned && typeof node.attrs.pinnedVisualY === 'number') {
                  const ty = node.attrs.pinnedVisualY as number
                  // end includes PINNED_CONTENT_GAP so flow content lands a little below
                  // the block instead of flush against it.
                  reservedRanges.push({ start: ty, end: ty + el.offsetHeight + PINNED_CONTENT_GAP, pinnedDocIdx: pi - 1 })
                }
              })
            }

            const decorations: Decoration[] = []
            let pageEnd = contentH
            let cumulative = 0       // sum of new margin-tops applied so far
            let domCumulative = 0    // sum of old margin-tops already in DOM
            // Heights of blocks that will become position:absolute after this
            // dispatch. Before dispatch they are still in flow, so their heights
            // appear in subsequent blocks' DOM positions. We subtract this to
            // recover the post-dispatch logical top of those subsequent blocks.
            // NOTE: this is an approximation (CSS margins between blocks are not
            // accounted for), so a second pass is scheduled when transitioning
            // to converge to the correct stable values.
            let absoluteFlowRemoved = 0
            let blockIdx = 0
            let pinnedFloor = 0
            let needsSecondPass = false
            // Last non-absolute flow element — used to detect CSS margin collapsing.
            let prevFlowEl: HTMLElement | null = null

            editorView.state.doc.forEach((node, pos) => {
              const el = domBlocks[blockIdx++]
              if (!el) return

              const existingDecoration = parseFloat(el.style.marginTop) || 0
              const elRect = el.getBoundingClientRect()

              // CSS margin collapsing: adjacent block elements collapse their
              // margins so the gap = max(prevMarginBottom, marginTop) not their sum.
              // The pre-dispatch DOM already includes prevMarginBottom in el's visual
              // position. But after dispatch when our marginTop > prevMarginBottom,
              // CSS collapse absorbs prevMarginBottom — so the block lands short by
              // exactly prevMarginBottom. Correct by subtracting it from top.
              const prevMarginBottom = prevFlowEl
                ? (parseFloat(getComputedStyle(prevFlowEl).marginBottom) || 0)
                : 0
              const collapseAdj = Math.max(prevMarginBottom - existingDecoration, 0)

              const top =
                (elRect.top - pmRect.top) -
                domCumulative -
                existingDecoration +
                cumulative -
                absoluteFlowRemoved -
                collapseAdj
              const contentHeight = el.offsetHeight

              // ── Pinned block ────────────────────────────────────────────────
              if (node.attrs?.pinned) {
                const targetY: number | null =
                  typeof node.attrs.pinnedVisualY === 'number'
                    ? (node.attrs.pinnedVisualY as number)
                    : null

                if (targetY !== null) {
                  const isCurrentlyAbsolute = el.style.position === 'absolute'
                  if (!isCurrentlyAbsolute) {
                    absoluteFlowRemoved += contentHeight
                    // CSS margin gaps between blocks mean absoluteFlowRemoved is an
                    // approximation. Schedule a second pass to reach the stable state.
                    needsSecondPass = true
                  }

                  // Images: hide original off-screen so the React NodeView doesn't
                  // conflict with ProseMirror's decoration. ContractStudio renders
                  // a separate overlay div at the exact pinned Y position.
                  // Text nodes (paragraph/heading): pin in place via position:absolute
                  // since ProseMirror owns their DOM directly (no React conflict).
                  const isImage = node.type.name === 'image'
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      style: isImage
                        ? `position: absolute; top: -9999px; left: 0; right: 0;`
                        : `position: absolute; top: ${targetY}px; left: 0; right: 0;`,
                    }),
                  )
                  pinnedFloor = Math.max(pinnedFloor, targetY + contentHeight + PINNED_CONTENT_GAP)
                } else {
                  // No captured Y yet — stay in flow, just exempt from page-break push.
                  // Still in flow — update prevFlowEl so next block's margin
                  // collapse is calculated correctly.
                  prevFlowEl = el
                  pinnedFloor = Math.max(pinnedFloor, top + contentHeight + PINNED_CONTENT_GAP)
                }

                domCumulative += existingDecoration
                return
              }

              // ── Normal block: page-break logic ──────────────────────────────
              while (top >= pageEnd + pageJump) {
                pageEnd += contentH + pageJump
              }

              let effectiveTop = Math.max(top, pinnedFloor)
              let effectiveBottom = effectiveTop + contentHeight

              while (effectiveTop >= pageEnd + pageJump) {
                pageEnd += contentH + pageJump
              }

              const currentDocIdx = blockIdx - 1

              let pushBy = 0
              if (effectiveBottom > pageEnd) {
                const pushedTop = top + (pageEnd + pageJump - top)
                // Find any pinned block that comes BEFORE the current block and
                // whose area would overlap the pushed destination.
                const collidingRange = reservedRanges.find(
                  r => currentDocIdx > r.pinnedDocIdx &&
                       pushedTop < r.end && pushedTop + contentHeight > r.start,
                )
                if (!collidingRange) {
                  pushBy = pageEnd + pageJump - top
                  pageEnd += contentH + pageJump
                  effectiveTop = top + pushBy
                  effectiveBottom = effectiveTop + contentHeight
                } else {
                  // Pushing to the next page start would land inside the pinned
                  // header area. Push past the header instead so the block doesn't
                  // get stranded in the inter-page gap.
                  pushBy = collidingRange.end - top
                  effectiveTop = top + pushBy
                  while (effectiveTop >= pageEnd + pageJump) pageEnd += contentH + pageJump
                  effectiveBottom = effectiveTop + contentHeight
                }
                // After any page-break push, also skip past the pinned page HEADER on
                // the destination page (logo + page number + divider…) so content that
                // overflows to a new page lands below the header, not inside it.
                // The header is the CONTIGUOUS CHAIN of pinned blocks (docIdx after this
                // one) that starts at the top of the destination page and stacks down —
                // even with small gaps between logo/number/divider. Chaining (instead of
                // "max end of any pin on the page") means a pin sitting in the MIDDLE of
                // the page — with a gap above it, not reachable from the page top — is NOT
                // treated as header and won't drag content that lands above it below it.
                {
                  const CHAIN_GAP = 48 // bridge normal spacing between stacked header blocks
                  let headerEnd = effectiveTop
                  let extended = true
                  while (extended) {
                    extended = false
                    for (const range of reservedRanges) {
                      if (
                        range.pinnedDocIdx > currentDocIdx &&
                        range.start <= headerEnd + CHAIN_GAP &&
                        range.end > headerEnd
                      ) {
                        headerEnd = range.end
                        extended = true
                      }
                    }
                  }
                  if (headerEnd > effectiveTop) {
                    pushBy = headerEnd - top
                    effectiveTop = top + pushBy
                    effectiveBottom = effectiveTop + contentHeight
                    while (effectiveTop >= pageEnd + pageJump) pageEnd += contentH + pageJump
                  }
                }
              } else if (effectiveTop > top) {
                pushBy = effectiveTop - top
              }

              // Prevent any block from occupying a pinned element's reserved Y range.
              // Applies to both pre-pin and post-pin blocks. With multiple pinned blocks
              // we must keep re-checking all ranges after each push, because pushing past
              // one pin may land the block on the next pin's range.
              {
                let moved = true
                while (moved) {
                  moved = false
                  for (const range of reservedRanges) {
                    const blockTop = top + pushBy
                    const blockBottom = blockTop + contentHeight
                    if (blockTop < range.end && blockBottom > range.start) {
                      const pushPast = range.end - top
                      if (pushPast > pushBy) {
                        pushBy = pushPast
                        effectiveTop = top + pushBy
                        effectiveBottom = effectiveTop + contentHeight
                        while (effectiveTop >= pageEnd + pageJump) {
                          pageEnd += contentH + pageJump
                        }
                        moved = true
                      }
                    }
                  }
                }
              }

              if (pushBy > 0) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    style: `margin-top: ${pushBy}px`,
                  }),
                )
                // Subtract collapseAdj because the CSS gap (prevMB) is absorbed
                // into our marginTop after dispatch, so the net downstream shift
                // is pushBy - collapseAdj, not the full pushBy.
                cumulative += pushBy - collapseAdj
              }

              domCumulative += existingDecoration
              prevFlowEl = el
            })

            // Signature of the decoration set we're about to dispatch — used to
            // detect whether the layout has stabilised (output == previous output).
            const newDecoSig = decorations.length === 0 ? '' :
              decorations.map(d => `${d.from}:${(d.spec as any)?.style ?? ''}`).join('|')
            const stable = newDecoSig === prevDecoSig
            prevDecoSig = newDecoSig
            passCount++

            const savedScrollTop = scrollParent?.scrollTop ?? 0

            dispatching = true
            editorView.dispatch(
              editorView.state.tr.setMeta(
                pluginKey,
                DecorationSet.create(editorView.state.doc, decorations),
              ),
            )
            dispatching = false

            if (scrollParent) scrollParent.scrollTop = savedScrollTop

            // Skip the resize event that our own dispatch causes so we don't
            // trigger a redundant extra measure() in the ResizeObserver below.
            skipNextPmResize = true

            // Re-measure until the decoration set stabilises (same output as last
            // pass) OR a pinned block is still transitioning. This handles cases
            // where the first pass computes wrong page breaks due to the
            // absoluteFlowRemoved approximation, ensuring correct convergence.
            // MAX_PASSES guards against pathological oscillation.
            if (needsSecondPass || (!stable && passCount < MAX_PASSES)) {
              raf = requestAnimationFrame(measure)
            }
          }

          raf = requestAnimationFrame(measure)

          const scheduleMeasure = () => {
            if (dispatching) return
            // Reset convergence state so the new cycle runs until stable.
            prevDecoSig = ''
            passCount = 0
            if (raf) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(measure)
          }

          _forceMeasure = scheduleMeasure

          const imgResizeObserver = new ResizeObserver(scheduleMeasure)

          // Watch the ProseMirror element itself. When any block changes height
          // (e.g. font-family change causes text to rewrap) this fires and triggers
          // a fresh measure even if we didn't detect a doc change via update().
          // skipNextPmResize prevents an infinite loop: our own dispatch grows the
          // element, we mark skip=true, the ResizeObserver fires and skips once.
          const pmResizeObserver = new ResizeObserver(() => {
            if (skipNextPmResize) {
              skipNextPmResize = false
              return
            }
            scheduleMeasure()
          })
          pmResizeObserver.observe(editorView.dom)

          const watchImg = (img: HTMLImageElement) => {
            if (!img.complete) {
              img.addEventListener('load', scheduleMeasure, { once: true })
              img.addEventListener('error', scheduleMeasure, { once: true })
            }
            imgResizeObserver.observe(img)
          }

          editorView.dom.querySelectorAll('img').forEach(img =>
            watchImg(img as HTMLImageElement),
          )

          const mutationObserver = new MutationObserver(mutations => {
            for (const m of mutations) {
              m.addedNodes.forEach(node => {
                if (node instanceof HTMLImageElement) {
                  watchImg(node)
                } else if (node instanceof Element) {
                  node.querySelectorAll('img').forEach(img =>
                    watchImg(img as HTMLImageElement),
                  )
                }
              })
            }
          })
          mutationObserver.observe(editorView.dom, { childList: true, subtree: true })

          // Re-measure when new fonts finish loading. When the user changes the
          // font-family to a web font that isn't cached, the first measure() runs
          // before the font is applied and gets wrong block heights. The
          // 'loadingdone' event fires once the font is ready so we correct it.
          const onFontsLoaded = () => scheduleMeasure()
          document.fonts.addEventListener('loadingdone', onFontsLoaded)

          return {
            update(view, prevState) {
              if (dispatching) return
              if (!view.state.doc.eq(prevState.doc)) scheduleMeasure()
            },
            destroy() {
              if (raf) cancelAnimationFrame(raf)
              if (_forceMeasure === scheduleMeasure) _forceMeasure = null
              mutationObserver.disconnect()
              imgResizeObserver.disconnect()
              pmResizeObserver.disconnect()
              document.fonts.removeEventListener('loadingdone', onFontsLoaded)
              if (scrollParent) scrollParent.style.overflowAnchor = ''
            },
          }
        },
      }),
    ]
  },
})
