import type { Locale } from '@/i18n/routing'
import LoginForm from './LoginForm'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <LoginForm locale={locale as Locale} />
}