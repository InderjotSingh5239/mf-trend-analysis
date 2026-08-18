import { Link } from 'react-router-dom'
import {
  Mail,
  TrendingUp,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-50 dark:bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="flex items-center gap-2 justify-center mb-8"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg">
            MF Intelligence
          </span>
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>

            <h1 className="font-display font-bold text-xl text-center">
              Password reset unavailable
            </h1>

            <p className="text-sm text-ink-500 dark:text-paper-200/50 text-center mt-3">
              This deployment does not have an email delivery provider or
              password-reset endpoint configured yet. The app will not show a
              fake success message.
            </p>

            <Link to="/login">
              <Button className="w-full mt-6">
                <Mail className="w-4 h-4" />
                Return to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-ink-500 dark:text-paper-200/50 hover:text-ink-950 dark:hover:text-white mt-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
