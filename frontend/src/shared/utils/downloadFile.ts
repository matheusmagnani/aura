export async function triggerDownload(blob: Blob, name: string): Promise<void> {
  const filename = `${name}.pdf`
  const isMobile = window.matchMedia('(pointer: coarse)').matches

  if (isMobile && typeof navigator.canShare === 'function') {
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
