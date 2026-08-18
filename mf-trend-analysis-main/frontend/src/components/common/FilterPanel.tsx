import { SlidersHorizontal, X } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { FundFilters } from '@/services/fundService'
import type { FundCategory, AMC, RiskLevel } from '@/types/fund'

const CATEGORIES: (FundCategory | 'All')[] = [
  'All',
  'Equity - Large Cap',
  'Equity - Mid Cap',
  'Equity - Small Cap',
  'Equity - Flexi Cap',
  'Debt - Short Duration',
  'Debt - Corporate Bond',
  'Hybrid - Aggressive',
  'Hybrid - Conservative',
  'Index Fund',
  'ELSS - Tax Saver',
]

const AMCS: (AMC | 'All')[] = [
  'All',
  'HDFC Mutual Fund',
  'SBI Mutual Fund',
  'ICICI Prudential',
  'Axis Mutual Fund',
  'Nippon India',
  'Kotak Mahindra',
  'Mirae Asset',
  'Parag Parikh',
  'UTI Mutual Fund',
  'DSP Mutual Fund',
]

const RISK_LEVELS: (RiskLevel | 'All')[] = ['All', 'Low', 'Moderate', 'Moderately High', 'High', 'Very High']

interface FilterPanelProps {
  filters: FundFilters
  onChange: (filters: FundFilters) => void
  className?: string
}

export function FilterPanel({ filters, onChange, className }: FilterPanelProps) {
  const hasActiveFilters =
    (filters.category && filters.category !== 'All') ||
    (filters.amc && filters.amc !== 'All') ||
    (filters.riskLevel && filters.riskLevel !== 'All') ||
    filters.maxExpenseRatio !== undefined

  const clearAll = () =>
    onChange({ ...filters, category: 'All', amc: 'All', riskLevel: 'All', maxExpenseRatio: undefined, page: 1 })

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-950 dark:text-white">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2 text-xs">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Category</label>
          <Select
            value={filters.category || 'All'}
            onChange={(e) => onChange({ ...filters, category: e.target.value as FundCategory | 'All', page: 1 })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Fund House (AMC)</label>
          <Select
            value={filters.amc || 'All'}
            onChange={(e) => onChange({ ...filters, amc: e.target.value as AMC | 'All', page: 1 })}
          >
            {AMCS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Risk Level</label>
          <Select
            value={filters.riskLevel || 'All'}
            onChange={(e) => onChange({ ...filters, riskLevel: e.target.value as RiskLevel | 'All', page: 1 })}
          >
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">
            Max Expense Ratio: {filters.maxExpenseRatio ?? 2}%
          </label>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={filters.maxExpenseRatio ?? 2}
            onChange={(e) => onChange({ ...filters, maxExpenseRatio: parseFloat(e.target.value), page: 1 })}
            className="w-full accent-emerald-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-ink-500 dark:text-paper-200/50 mb-1.5 block">Sort By</label>
          <Select
            value={filters.sortBy || 'aum'}
            onChange={(e) => {
              const sortBy = e.target.value as FundFilters['sortBy']
              const sortOrder = sortBy === 'expenseRatio' ? 'asc' : 'desc'
              onChange({ ...filters, sortBy, sortOrder, page: 1 })
            }}
          >
            <option value="aum">AUM (High to Low)</option>
            <option value="cagr3y">3Y CAGR (High to Low)</option>
            <option value="rating">Rating (High to Low)</option>
            <option value="nav">NAV (High to Low)</option>
            <option value="expenseRatio">Expense Ratio (Low to High)</option>
          </Select>
        </div>
      </div>
    </div>
  )
}
