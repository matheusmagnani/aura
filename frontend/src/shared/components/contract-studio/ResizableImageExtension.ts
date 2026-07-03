import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from './ResizableImageView'

export const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attrs => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: 'left',
        renderHTML: () => ({}),
      },
      marginTop: {
        default: 0,
        renderHTML: () => ({}),
      },
      marginBottom: {
        default: 0,
        renderHTML: () => ({}),
      },
      pinned: {
        default: false,
        renderHTML: () => ({}),
      },
      pinnedVisualY: {
        default: null,
        renderHTML: () => ({}),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView, { trackNodeViewPosition: true })
  },
})
