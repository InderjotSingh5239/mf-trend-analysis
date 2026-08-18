import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { LogIn, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { AuthError } from '@/services/authService'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      await login(values)
      showToast('Welcome back!', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      setServerError(err instanceof AuthError ? err.message : 'Unable to sign in. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-50 dark:bg-ink-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-ink-950 dark:text-white">
            MF Intelligence
          </span>
        </Link>

        <div className="glass-panel rounded-2xl p-6 border border-ink-950/10 dark:border-white/10">
          <h1 className="font-display font-bold text-xl text-ink-950 dark:text-white mb-1">Sign in</h1>
          <p className="text-sm text-ink-500 dark:text-paper-200/50 mb-6">
            Welcome back — enter your details to continue.
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
                {...registerField('email')}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-crimson-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-medium text-ink-500 dark:text-paper-200/50">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...registerField('password')}
              />
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-crimson-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p role="alert" className="text-sm text-crimson-500 bg-crimson-500/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="w-4 h-4" />
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-500 dark:text-paper-200/50 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
