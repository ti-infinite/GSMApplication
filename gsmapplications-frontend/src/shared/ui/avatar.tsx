import { isSafeUrl } from '@/shared/lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'

const SIZES: Record<AvatarSize, { box: string; text: string; dot: string }> = {
  sm: { box: 'h-7 w-7',  text: 'text-xs',  dot: 'h-2.5 w-2.5' },
  md: { box: 'h-9 w-9',  text: 'text-sm',  dot: 'h-3 w-3' },
  lg: { box: 'h-12 w-12', text: 'text-base', dot: 'h-3.5 w-3.5' },
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
}

type AvatarProps = {
  /** Full name — used to derive initials when there is no image. */
  name: string
  /** Optional image URL; falls back to initials if missing or unsafe. */
  src?: string
  /** Shows the green "online" dot at the bottom-right. */
  online?: boolean
  size?: AvatarSize
  /** Ring color of the online dot — match the surface behind the avatar. */
  ringClass?: string
  className?: string
}

export function Avatar({
  name,
  src,
  online = false,
  size = 'sm',
  ringClass = 'ring-background',
  className = '',
}: AvatarProps) {
  const s = SIZES[size]
  const initials = getInitials(name)
  const showImage = src && isSafeUrl(src)

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`flex ${s.box} items-center justify-center overflow-hidden rounded-full bg-primary ${s.text} font-bold text-primary-foreground`}
      >
        {showImage ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          initials || '?'
        )}
      </div>
      {online && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${s.dot} rounded-full bg-green-500 ring-2 ${ringClass}`}
          aria-label="En línea"
        />
      )}
    </div>
  )
}