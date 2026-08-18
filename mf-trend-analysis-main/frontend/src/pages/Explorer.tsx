import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useFunds } from '@/hooks/useFunds'
import type { FundFilters } from '@/services/fundService'
import { FundCard } from '@/components/common/FundCard'
import { FilterPanel } from '@/components/common/FilterPanel'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

export default function Explorer() {
  const [searchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<FundFilters>({
    search: searchParams.get('q') || '',
    category: 'All',
    amc: 'All',
    riskLevel: 'All',
    sortBy: 'aum',
    sortOrder: 'desc',
    page: 1,
    pageSize: 9,
  })

  const { data, isLoading, isError, refetch } = useFunds(filters)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white">Explore Mutual Funds</h1>
        <p className="text-sm text-ink-500 dark:text-paper-200/50">
          {data ? `${data.total} funds` : 'Loading funds'} across equity, debt, hybrid and index categories.
        </p>
      </div>

      <div className="flex gap-3 items-center">
        <Input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          placeholder="Search by fund name or AMC..."
          className="max-w-md"
          aria-label="Search funds"
        />
        <Button variant="outline" size="default" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </Button>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="hidden lg:block">
          <FilterPanel filters={filters} onChange={setFilters} />
        </aside>

        <Dialog open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Filters">
          <div className="p-5">
            <FilterPanel filters={filters} onChange={setFilters} />
            <Button className="w-full mt-4" onClick={() => setMobileFiltersOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </Dialog>

        <div>
          {isError && <ErrorState onRetry={() => refetch()} description="We couldn't fetch the fund list. Please try again." />}

          {isLoading && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          )}

          {!isLoading && !isError && data?.funds.length === 0 && (
            <EmptyState
              title="No funds match your filters"
              description="Try widening your category, AMC, or expense ratio filters."
              actionLabel="Clear filters"
              onAction={() =>
                setFilters({ search: '', category: 'All', amc: 'All', riskLevel: 'All', sortBy: 'aum', sortOrder: 'desc', page: 1, pageSize: 9 })
              }
            />
          )}

          {!isLoading && !isError && data && data.funds.length > 0 && (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.funds.map((fund) => (
                  <FundCard key={fund.id} fund={fund} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
