import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSafeUrl(url: string): boolean {
  if (!url || url.length > 2048) return false
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    // hostname must be a real domain (has at least one dot) or a private host
    return hostname.length > 0 && !hostname.startsWith('.')
  } catch {
    return false
  }
}
