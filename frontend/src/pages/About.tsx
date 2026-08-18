import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Database,
  Server,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const STACK = [
  {
    icon: TrendingUp,
    title: 'React + TypeScript + Vite',
    description: 'Fast, type-safe production frontend.',
  },
  {
    icon: Sparkles,
    title: 'FastAPI prediction engine',
    description: 'Model-backed multi-horizon NAV forecasting with confidence and risk scoring.',
  },
  {
    icon: Database,
    title: 'PostgreSQL + SQLAlchemy',
    description: 'Persistent fund, NAV, portfolio, watchlist and prediction data.',
  },
  {
    icon: Server,
    title: 'Real API integration',
    description: 'Axios services connect the UI to the versioned FastAPI backend.',
  },
]

export default function About() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white mb-2">
          About NAVigate
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/60 leading-relaxed">
          NAVigate is a mutual-fund intelligence platform connecting real
          backend fund/NAV data, analytics, investment calculators, portfolio
          tracking and trained prediction models in one workflow.
        </p>
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white mb-4">
          Built With
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {STACK.map((item) => (
            <Card key={item.title}>
              <CardContent className="p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <item.icon className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-medium text-ink-950 dark:text-white mb-1">
                  {item.title}
                </p>
                <p className="text-sm text-ink-500 dark:text-paper-200/50">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-amber-500/20">
        <CardContent className="p-5 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-ink-950 dark:text-white mb-1">
              Data and model note
            </p>
            <p className="text-sm text-ink-500 dark:text-paper-200/60 leading-relaxed">
              Fund and NAV screens use the FastAPI backend. Prediction results
              are model estimates and should not be treated as guaranteed
              future returns or investment advice.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
