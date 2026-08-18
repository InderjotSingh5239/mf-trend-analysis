export type FundCategory =
  | 'Equity - Large Cap'
  | 'Equity - Mid Cap'
  | 'Equity - Small Cap'
  | 'Equity - Flexi Cap'
  | 'Debt - Short Duration'
  | 'Debt - Corporate Bond'
  | 'Hybrid - Aggressive'
  | 'Hybrid - Conservative'
  | 'Index Fund'
  | 'ELSS - Tax Saver'

export type RiskLevel = 'Low' | 'Moderate' | 'Moderately High' | 'High' | 'Very High'

export type AMC =
  | 'HDFC Mutual Fund'
  | 'SBI Mutual Fund'
  | 'ICICI Prudential'
  | 'Axis Mutual Fund'
  | 'Nippon India'
  | 'Kotak Mahindra'
  | 'Mirae Asset'
  | 'Parag Parikh'
  | 'UTI Mutual Fund'
  | 'DSP Mutual Fund'

export interface FundReturns {
  '1M': number
  '3M': number
  '6M': number
  '1Y': number
  '3Y': number
  '5Y': number
}

export interface NavPoint {
  date: string
  nav: number
  ma30?: number
  ma90?: number
}

export interface HoldingItem {
  name: string
  sector: string
  percent: number
}

export interface SectorAllocation {
  sector: string
  percent: number
}

export interface AssetAllocation {
  equity: number
  debt: number
  cash: number
  other: number
}

export interface RiskMetrics {
  alpha: number
  beta: number
  sharpeRatio: number
  standardDeviation: number
  sortino: number
  rSquared?: number
}

/**
 * UI fund shape. Fields unavailable from the backend remain undefined;
 * the frontend never fabricates values for missing production data.
 */
export interface MutualFund {
  id: string
  name: string
  amc?: string
  category?: string
  riskLevel?: string
  nav?: number
  navChange?: number
  navChangePercent?: number
  cagr3y?: number
  expenseRatio?: number
  exitLoad?: string
  aum?: number // in crores
  rating?: number // out of 5
  returns?: FundReturns
  fundManager?: string
  fundManagerTenureYears?: number
  fundAgeYears?: number
  minSipAmount?: number
  minLumpsumAmount?: number
  benchmark?: string
  navHistory: NavPoint[]
  holdings?: HoldingItem[]
  sectorAllocation?: SectorAllocation[]
  assetAllocation?: AssetAllocation
  riskMetrics?: RiskMetrics
  isin?: string
}

export type PredictionHorizon = 7 | 30 | 90 | 180 | 365

export type Recommendation = 'Buy' | 'Hold' | 'Sell'

export interface PredictionResult {
  fundId: string
  horizon: PredictionHorizon
  currentNav: number
  predictedNav: number
  expectedReturnPercent: number
  confidenceScore: number
  recommendation: Recommendation
  riskScore: number
  forecastSeries: { date: string; nav: number; lowerBound: number; upperBound: number }[]
  generatedAt: string
  modelVersion: string
  featureImportance: { feature: string; importance: number }[]
}
