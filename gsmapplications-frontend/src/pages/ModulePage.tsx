import { useParams } from 'react-router-dom'
import ComingSoon from '@/components/ComingSoon'

function slugToTitle(slug: string): string {
  return slug
    .split('/')
    .filter(Boolean)
    .map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    .join(' — ')
}

export default function ModulePage() {
  const { '*': slug = '' } = useParams()
  return <ComingSoon title={slugToTitle(slug)} />
}
