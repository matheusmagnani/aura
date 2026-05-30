import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from './ResizableImageView'

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: attrs => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: 'left',
        renderHTML: () => ({}), // handled by the NodeView wrapper
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
