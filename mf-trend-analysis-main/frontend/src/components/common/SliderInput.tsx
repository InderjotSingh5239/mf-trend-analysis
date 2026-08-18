export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-ink-950 dark:text-paper-100">{label}</label>
        <span className="text-sm font-mono-data font-semibold text-emerald-600 dark:text-emerald-400">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const val = Number(e.target.value)
          if (Number.isNaN(val)) return
          onChange(val)
        }}
        className="w-full accent-emerald-500"
      />
      <div className="flex justify-between mt-1">
        <span className="text-[11px] text-ink-500 dark:text-paper-200/40 font-mono-data">{format(min)}</span>
        <span className="text-[11px] text-ink-500 dark:text-paper-200/40 font-mono-data">{format(max)}</span>
      </div>
    </div>
  )
}
