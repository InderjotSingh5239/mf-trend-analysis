import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { UserPlus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { AuthError } from '@/services/authService'

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function Register() {
  const { register: registerUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    try {
      await registerUser({ fullName: values.fullName, email: values.email, password: values.password })
      showToast('Account created — welcome to MF Intelligence!', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(err instanceof AuthError ? err.message : 'Unable to create your account. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-50 dark:bg-ink-950 px-4 py-10">
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
          <h1 className="font-display font-bold text-xl text-ink-950 dark:text-white mb-1">
            Create your account
          </h1>
          <p className="text-sm text-ink-500 dark:text-paper-200/50 mb-6">
            Start tracking, predicting, and planning your mutual fund investments.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="fullName" className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">
                Full name
              </label>
              <Input
                id="fullName"
                autoComplete="name"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                {...registerField('fullName')}
              />
              {errors.fullName && (
                <p id="fullName-error" role="alert" className="text-xs text-crimson-500 mt-1">
                  {errors.fullName.message}
                </p>
              )}
            </div>

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
              <label htmlFor="password" className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
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

            <div>
              <label htmlFor="confirmPassword" className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                {...registerField('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" role="alert" className="text-xs text-crimson-500 mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {serverError && (
              <p role="alert" className="text-sm text-crimson-500 bg-crimson-500/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-500 dark:text-paper-200/50 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
