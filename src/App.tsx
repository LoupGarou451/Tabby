import { useEffect, useState } from 'react'
import { useSplash } from './brand/useSplash'
import { CurrencySheet } from './features/CurrencySheet'
import { HistorySheet } from './features/History'
import { QuickSplit } from './features/QuickSplit'
import { SettingsSheet } from './features/Settings'
import { ShareSheet } from './features/ShareSheet'
import { Viewer } from './features/Viewer'
import { isShareHash } from './lib/share'
import { useBill } from './store/billStore'
import { ScanFlow } from './scan/ScanFlow'
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
  const quick = useBill((s) => s.bill.mode === 'quick')
  const theme = usePrefs((s) => s.theme)
  const [shareHash, setShareHash] = useState(() =>
    isShareHash(location.hash) ? location.hash : null,
  )

  useEffect(() => {
    const onHash = () => setShareHash(isShareHash(location.hash) ? location.hash : null)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  if (shareHash)
    return (
      <Viewer
        hash={shareHash}
        onExit={() => {
          history.replaceState(null, '', location.pathname + location.search)
          setShareHash(null)
        }}
      />
    )

  const View = quick ? QuickSplit : STEP_VIEWS[step]
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[480px] flex-1 px-4 pt-5 pb-8">
        <View />
      </main>
      {!quick && <BottomBar />}
      <Snackbar />
      <MenuSheet />
      <AboutSheet />
      <CurrencySheet />
      <ShareSheet />
      <HistorySheet />
      <SettingsSheet />
      <ScanFlow />
    </div>
  )
}
