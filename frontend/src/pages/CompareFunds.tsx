import { useMemo, useState } from 'react'
import { GitCompareArrows, X, Plus } from 'lucide-react'
import { useFunds } from '@/hooks/useFunds'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { Loader } from '@/components/common/Loader'
import { cn, formatPercent } from '@/lib/utils'
import type { MutualFund } from '@/types/fund'

const MAX_COMPARE = 5

export default function CompareFunds() {
  const { data, isLoading, isError } = useFunds({
    page: 1,
    pageSize: 100,
  })

  const allFunds = data?.funds ?? []
  const [selectedIds, setSelectedIds] =
    useState<string[]>([])

  const funds = useMemo<MutualFund[]>(
  () =>
    selectedIds
      .map((id) =>
        allFunds.find((fund) => fund.id === id),
      )
      .filter(
        (fund): fund is MutualFund =>
          fund !== undefined,
      ),
  [allFunds, selectedIds],
)

  const available = allFunds.filter(
    (fund) => !selectedIds.includes(fund.id),
  )

  const addFund = (id: string) => {
    if (
      id &&
      selectedIds.length < MAX_COMPARE &&
      !selectedIds.includes(id)
    ) {
      setSelectedIds((current) => [...current, id])
    }
  }

  const removeFund = (id: string) => {
    setSelectedIds((current) =>
      current.filter((item) => item !== id),
    )
  }

  if (isLoading) {
    return (
      <Loader
        label="LOADING FUNDS..."
        className="min-h-[40vh]"
      />
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          Unable to load real fund data.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white flex items-center gap-2">
          <GitCompareArrows className="w-6 h-6" />
          Compare Funds
        </h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">
          Compare up to {MAX_COMPARE} real funds from the API.
        </p>
      </div>

      {selectedIds.length < MAX_COMPARE && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <Plus className="w-4 h-4 text-ink-500" />
            <Select
              className="max-w-xl"
              value=""
              onChange={(event) =>
                addFund(event.target.value)
              }
            >
              <option value="">
                Add a fund to compare...
              </option>
              {available.map((fund) => (
                <option
                  key={fund.id}
                  value={fund.id}
                >
                  {fund.name}
                </option>
              ))}
            </Select>
            <span className="text-xs text-ink-500">
              {selectedIds.length}/{MAX_COMPARE}
            </span>
          </CardContent>
        </Card>
      )}

      {funds.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No funds selected"
          description="Choose funds above to start a real-data comparison."
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div
              className="grid gap-3 mb-3"
              style={{
                gridTemplateColumns: `180px repeat(${funds.length}, minmax(180px, 1fr))`,
              }}
            >
              <div />
              {funds.map((fund) => (
                <Card
                  key={fund.id}
                  className="relative"
                >
                  <button
                    onClick={() =>
                      removeFund(fund.id)
                    }
                    aria-label={`Remove ${fund.name}`}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-ink-950/10 dark:hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm pr-5">
                      {fund.name}
                    </p>
                    <p className="text-xs text-ink-500 mt-1">
                      {fund.amc ?? 'AMC unavailable'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <CompareRow
                  label="NAV"
                  funds={funds}
                  render={(fund) =>
                    fund.nav == null
                      ? '—'
                      : `₹${fund.nav.toFixed(2)}`
                  }
                />
                <CompareRow
                  label="Daily Change"
                  funds={funds}
                  render={(fund) =>
                    formatPercent(
                      fund.navChangePercent ?? 0,
                    )
                  }
                  positive={(fund) =>
                    (fund.navChangePercent ?? 0) >= 0
                  }
                />
                <CompareRow
                  label="Risk"
                  funds={funds}
                  render={(fund) =>
                    fund.riskLevel ?? 'Not available'
                  }
                />
                <CompareRow
                  label="Expense Ratio"
                  funds={funds}
                  render={(fund) =>
                    fund.expenseRatio == null
                      ? '—'
                      : `${fund.expenseRatio}%`
                  }
                />
                <CompareRow
                  label="AUM"
                  funds={funds}
                  render={(fund) =>
                    fund.aum == null
                      ? '—'
                      : `₹${fund.aum.toLocaleString('en-IN')} Cr`
                  }
                />
                <CompareRow
                  label="Category"
                  funds={funds}
                  render={(fund) =>
                    fund.category ?? 'Not available'
                  }
                  final
                />
                <div
                  className="grid items-center px-4 py-3"
                  style={{
                    gridTemplateColumns: `180px repeat(${funds.length}, minmax(180px, 1fr))`,
                  }}
                >
                  <span className="text-xs font-medium text-ink-500 uppercase">
                    Benchmark
                  </span>
                  {funds.map((fund) => (
                    <Badge
                      key={fund.id}
                      variant="outline"
                      className="w-fit"
                    >
                      {fund.benchmark ?? '—'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function CompareRow({
  label,
  funds,
  render,
  positive,
  final = false,
}: {
  label: string
  funds: MutualFund[]
  positive?: (fund: MutualFund) => boolean
  render: (fund: MutualFund) => string
  final?: boolean
}) {
  return (
    <div
      className={cn(
        'grid items-center px-4 py-3',
        !final &&
          'border-b border-ink-950/5 dark:border-white/5',
      )}
      style={{
        gridTemplateColumns: `180px repeat(${funds.length}, minmax(180px, 1fr))`,
      }}
    >
      <p className="text-xs font-medium text-ink-500 uppercase">
        {label}
      </p>
      {funds.map((fund) => {
        const good = positive?.(fund)

        return (
          <p
            key={fund.id}
            className={cn(
              'text-sm font-mono-data font-medium',
              positive
                ? good
                  ? 'ticker-up'
                  : 'ticker-down'
                : 'text-ink-950 dark:text-paper-100',
            )}
          >
            {render(fund)}
          </p>
        )
      })}
    </div>
  )
}
