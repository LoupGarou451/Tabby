import { useEffect } from 'react'
import { useSplash } from './brand/useSplash'
import { CurrencySheet } from './features/CurrencySheet'
import { AboutSheet, BottomBar, Header, MenuSheet, Snackbar } from './components/Shell'
import { applyTheme, usePrefs } from './store/prefsStore'
import { useUi } from './store/uiStore'
import { AssignStep } from './steps/AssignStep'
import { PeopleStep } from './steps/PeopleStep'
import { ReceiptStep } from './steps/ReceiptStep'
import { SummaryStep } from './steps/SummaryStep'
import { TaxTipStep } from './steps/TaxTipStep'

const STEP_VIEWS = {
  receipt: ReceiptStep,
  people: PeopleStep,
  assign: AssignStep,
  tip: TaxTipStep,
  summary: SummaryStep,
}

export default function App() {
  useSplash()
  const step = useUi((s) => s.step)
  const theme = usePrefs((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const View = STEP_VIEWS[step]
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-5 pb-8">
        <View />
      </main>
      <BottomBar />
      <Snackbar />
      <MenuSheet />
      <AboutSheet />
      <CurrencySheet />
    </div>
  )
}
