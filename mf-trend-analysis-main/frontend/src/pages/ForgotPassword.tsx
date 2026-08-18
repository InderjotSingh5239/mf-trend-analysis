import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function ForgotPassword() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    // Note: the backend does not yet expose a password-reset endpoint.
    // This intentionally always shows a generic success state — regardless
    // of whether the email is registered — so the flow can't be used to
    // enumerate which addresses have accounts. Wire this up to a real
    // POST /auth/forgot-password once that endpoint exists.
    await delay(600)
    setSubmittedEmail(values.email)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-50 dark:bg-ink-950 px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-ink-950 dark:text-white">
            MF Intelligence
          </span>
        </Link>

        <div className="glass-panel rounded-2xl p-6 border border-ink-950/10 dark:border-white/10">
          {submittedEmail ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h1 className="font-display font-bold text-lg text-ink-950 dark:text-white mb-1">Check your inbox</h1>
              <p className="text-sm text-ink-500 dark:text-paper-200/50">
                If an account exists for <span className="font-medium text-ink-950 dark:text-paper-100">{submittedEmail}</span>,
                we've sent a link to reset your password.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-xl text-ink-950 dark:text-white mb-1">Reset your password</h1>
              <p className="text-sm text-ink-500 dark:text-paper-200/50 mb-6">
                Enter your account email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div>
                  <label htmlFor="email" className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" className="text-xs text-crimson-500 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Mail className="w-4 h-4" />
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-ink-500 dark:text-paper-200/50 hover:text-ink-950 dark:hover:text-white mt-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
      </motion.div>
    </div>
  )
}
