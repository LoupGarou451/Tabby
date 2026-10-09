import { Logo } from './brand/Logo'
import { useSplash } from './brand/useSplash'

export default function App() {
  useSplash()
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 p-6">
      <Logo size={96} />
      <h1 className="font-rounded text-3xl font-extrabold text-brand">Tabby</h1>
      <p className="text-muted">Split the tab. Coming together…</p>
    </div>
  )
}
