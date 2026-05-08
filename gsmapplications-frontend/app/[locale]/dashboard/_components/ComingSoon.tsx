import { Construction } from 'lucide-react'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Construction className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">This module is under construction.</p>
    </div>
  )
}