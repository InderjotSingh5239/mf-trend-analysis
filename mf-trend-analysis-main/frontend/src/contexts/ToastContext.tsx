import { useCallback, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastContext, type ToastType } from '@/contexts/toast-context'

interface Toast {
  id: string
  message: string
  type: ToastType
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500 border-emerald-500/30',
  error: 'text-crimson-500 border-crimson-500/30',
  info: 'text-blue-500 border-blue-500/30',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.type]
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                className={`glass-panel rounded-xl border p-3.5 flex items-start gap-3 shadow-lg ${COLORS[toast.type]}`}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm text-ink-950 dark:text-paper-100 flex-1">{toast.message}</p>
                <button
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="text-ink-500 hover:text-ink-950 dark:hover:text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
