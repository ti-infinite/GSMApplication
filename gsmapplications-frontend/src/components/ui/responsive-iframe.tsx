type Props = {
  src:        string
  title:      string
  maxHeight?: string
  className?: string
}

export function ResponsiveIframe({ src, title, maxHeight = '65vh', className = '' }: Props) {
  const noScroll = { scrolling: 'no' } as React.IframeHTMLAttributes<HTMLIFrameElement>

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