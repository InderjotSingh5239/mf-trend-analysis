import type { ApiHolding, ApiPortfolio, ApiPortfolioSummary, ApiTransaction } from '@/types/api'

export interface Holding {
  id: string
  fundId: string
  fundName: string
  sector: string | null
  category: string | null
  units: number
  avgNav: number
  investedAmount: number
  currentNav: number
  currentValue: number
  pnl: number
  pnlPercent: number
}

export interface Portfolio {
  id: string
  name: string
  description: string | null
  baseCurrency: string
  createdAt: string
  updatedAt: string
  holdings: Holding[]
}

export interface Transaction {
  id: string
  fundId: string
  fundName: string
  transactionType: ApiTransaction['transaction_type']
  units: number
  nav: number
  amount: number
  transactionDate: string
}

export interface PortfolioSummary {
  totalInvested: number
  currentValue: number
  totalPnl: number
  totalPnlPercent: number
  xirr: number | null
  numberOfHoldings: number
  diversificationScore: number
  riskScore: number
  volatility: number
  sharpeRatio: number | null
  sectorAllocation: Record<string, number>
  categoryAllocation: Record<string, number>
  topHoldings: Holding[]
}

export function adaptHolding(api: ApiHolding): Holding {
  return {
    id: api.id,
    fundId: api.fund_id,
    fundName: api.fund_name,
    sector: api.sector,
    category: api.category,
    units: api.units,
    avgNav: api.avg_nav,
    investedAmount: api.invested_amount,
    currentNav: api.current_nav,
    currentValue: api.current_value,
    pnl: api.pnl,
    pnlPercent: api.pnl_percent,
  }
}

export function adaptPortfolio(api: ApiPortfolio): Portfolio {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    baseCurrency: api.base_currency,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
    holdings: api.holdings.map(adaptHolding),
  }
}

export function adaptTransaction(api: ApiTransaction): Transaction {
  return {
    id: api.id,
    fundId: api.fund_id,
    fundName: api.fund_name,
    transactionType: api.transaction_type,
    units: api.units,
    nav: api.nav,
    amount: api.amount,
    transactionDate: api.transaction_date,
  }
}

export function adaptSummary(api: ApiPortfolioSummary): PortfolioSummary {
  return {
    totalInvested: api.total_invested,
    currentValue: api.current_value,
    totalPnl: api.total_pnl,
    totalPnlPercent: api.total_pnl_percent,
    xirr: api.xirr,
    numberOfHoldings: api.number_of_holdings,
    diversificationScore: api.diversification_score,
    riskScore: api.risk_score,
    volatility: api.volatility,
    sharpeRatio: api.sharpe_ratio,
    sectorAllocation: api.sector_allocation,
    categoryAllocation: api.category_allocation,
    topHoldings: api.top_holdings.map(adaptHolding),
  }
}
