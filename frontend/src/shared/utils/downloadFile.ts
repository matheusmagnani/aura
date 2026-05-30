export function triggerDownload(objectUrl: string, name: string): void {
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `${name}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
