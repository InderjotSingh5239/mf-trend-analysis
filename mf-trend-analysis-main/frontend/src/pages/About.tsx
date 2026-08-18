import { TrendingUp, Sparkles, ShieldCheck, Database, Server } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const STACK = [
  { icon: TrendingUp, title: 'React + TypeScript + Vite', description: 'A fast, type-safe frontend foundation.' },
  { icon: Sparkles, title: 'AI Prediction Engine', description: 'Pluggable prediction service — swap the mock engine for a FastAPI + XGBoost/LSTM backend.' },
  { icon: Database, title: 'React Query', description: 'Handles caching, loading, and error states for all data fetching.' },
  { icon: Server, title: 'FastAPI-ready API layer', description: 'Axios client and service functions structured to match a REST backend contract.' },
]

export default function About() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white mb-2">About NAVigate</h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/60 leading-relaxed">
          NAVigate is a demonstration platform for AI-assisted mutual fund research and NAV prediction.
          It's built to show how historical NAV data, fund fundamentals, and market signals can be brought
          together into a single, readable interface — from exploration to prediction to portfolio tracking.
        </p>
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white mb-4">Built With</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {STACK.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <s.icon className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-medium text-ink-950 dark:text-white mb-1">{s.title}</p>
                <p className="text-sm text-ink-500 dark:text-paper-200/50">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-amber-500/20">
        <CardContent className="p-5 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-ink-950 dark:text-white mb-1">A note on the data</p>
            <p className="text-sm text-ink-500 dark:text-paper-200/60 leading-relaxed">
              All fund data, NAV history, and predictions in this demo are synthetically generated for illustration.
              Connect the API layer in <code className="font-mono-data text-xs bg-ink-950/5 dark:bg-white/10 px-1 py-0.5 rounded">src/services/</code> to a real
              AMFI/NSE feed and your own trained model before using this for actual investment decisions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
