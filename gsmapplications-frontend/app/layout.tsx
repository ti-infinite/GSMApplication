// Passthrough root layout — html/body are provided by app/[locale]/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement 
}
