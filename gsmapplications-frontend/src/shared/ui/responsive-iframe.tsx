type Props = {
  src:        string
  title:      string
  maxHeight?: string
  /**
   * When true, the iframe fills its parent (h-full w-full) instead of using a
   * fixed 16:9 aspect ratio. Use for documents/PDFs where the parent controls
   * the height. Default (false) keeps the legacy aspect-video behaviour used by
   * the dashboard — do not change that default.
   */
  fill?:      boolean
  className?: string
}

export function ResponsiveIframe({ src, title, maxHeight = '65vh', fill = false, className = '' }: Props) {
  const noScroll = { scrolling: 'no' } as React.IframeHTMLAttributes<HTMLIFrameElement>

  // Document/fill mode: the parent sets the height; allow internal scrolling
  // (PDFs are taller than the viewport).
  if (fill) {
    return (
      <iframe
        key={src}
        src={src}
        title={title}
        allowFullScreen
        className={`h-full w-full border-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{ maxHeight: maxHeight !== 'none' ? maxHeight : undefined }}
    >
      <iframe
        key={src}
        src={src}
        title={title}
        allowFullScreen
        className="aspect-video w-full border-0"
        {...noScroll}
      />
    </div>
  )
}
