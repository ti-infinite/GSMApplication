import ComingSoon from '../_components/ComingSoon'

function slugToTitle(slug: string[]): string {
  return slug
    .map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    .join(' — ')
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  return <ComingSoon title={slugToTitle(slug)} />
}