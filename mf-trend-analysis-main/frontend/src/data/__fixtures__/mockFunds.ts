import type {
  MutualFund,
  AMC,
  FundCategory,
  RiskLevel,
  NavPoint,
  HoldingItem,
  SectorAllocation,
} from '@/types/fund'

// Seeded PRNG (mulberry32) so data is stable across renders/reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

function generateNavHistory(fundId: string, startNav: number, driftAnnual: number, volatility: number, days = 365): NavPoint[] {
  const rand = mulberry32(hashSeed(fundId))
  const points: NavPoint[] = []
  let nav = startNav * 0.82 // start lower so trend shows growth into "today"
  const dailyDrift = driftAnnual / 252
  const navValues: number[] = []

  const today = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    // skip weekends (funds don't price on non-business days)
    if (date.getDay() === 0 || date.getDay() === 6) continue

    const shock = (rand() - 0.5) * 2 * volatility
    nav = nav * (1 + dailyDrift + shock)
    navValues.push(nav)

    points.push({
      date: date.toISOString().slice(0, 10),
      nav: Math.round(nav * 100) / 100,
    })
  }

  // rolling moving averages
  for (let i = 0; i < points.length; i++) {
    const w30 = navValues.slice(Math.max(0, i - 29), i + 1)
    const w90 = navValues.slice(Math.max(0, i - 89), i + 1)
    points[i].ma30 = Math.round((w30.reduce((a, b) => a + b, 0) / w30.length) * 100) / 100
    points[i].ma90 = Math.round((w90.reduce((a, b) => a + b, 0) / w90.length) * 100) / 100
  }

  // force the last point to equal the declared "current" nav for consistency
  points[points.length - 1].nav = startNav
  return points
}

interface FundSeed {
  id: string
  name: string
  amc: AMC
  category: FundCategory
  riskLevel: RiskLevel
  nav: number
  driftAnnual: number
  volatility: number
  cagr3y: number
  expenseRatio: number
  aum: number
  rating: number
  fundManager: string
  managerTenure: number
  fundAge: number
  benchmark: string
  sectors: SectorAllocation[]
  holdings: HoldingItem[]
  equityPct: number
}

const FUND_SEEDS: FundSeed[] = [
  {
    id: 'ppfas-flexicap',
    name: 'Parag Parikh Flexi Cap Fund',
    amc: 'Parag Parikh',
    category: 'Equity - Flexi Cap',
    riskLevel: 'Moderately High',
    nav: 82.45,
    driftAnnual: 0.17,
    volatility: 0.009,
    cagr3y: 21.4,
    expenseRatio: 0.63,
    aum: 74521,
    rating: 5,
    fundManager: 'Rajeev Thakkar',
    managerTenure: 11,
    fundAge: 12,
    benchmark: 'NIFTY 500 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 26.4 },
      { sector: 'Technology', percent: 19.8 },
      { sector: 'Consumer Goods', percent: 14.2 },
      { sector: 'Healthcare', percent: 9.6 },
      { sector: 'Energy', percent: 7.1 },
      { sector: 'Others', percent: 22.9 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 8.9 },
      { name: 'Bajaj Holdings', sector: 'Financial Services', percent: 7.2 },
      { name: 'Microsoft Corp', sector: 'Technology', percent: 6.1 },
      { name: 'Alphabet Inc', sector: 'Technology', percent: 5.4 },
      { name: 'ITC Ltd', sector: 'Consumer Goods', percent: 4.8 },
    ],
    equityPct: 91,
  },
  {
    id: 'hdfc-topup',
    name: 'HDFC Top 100 Fund',
    amc: 'HDFC Mutual Fund',
    category: 'Equity - Large Cap',
    riskLevel: 'Moderately High',
    nav: 1124.32,
    driftAnnual: 0.13,
    volatility: 0.008,
    cagr3y: 17.8,
    expenseRatio: 1.02,
    aum: 32890,
    rating: 4,
    fundManager: 'Rahul Baijal',
    managerTenure: 4,
    fundAge: 28,
    benchmark: 'NIFTY 100 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 31.2 },
      { sector: 'Energy', percent: 13.5 },
      { sector: 'Technology', percent: 11.4 },
      { sector: 'Automobile', percent: 9.8 },
      { sector: 'Healthcare', percent: 6.5 },
      { sector: 'Others', percent: 27.6 },
    ],
    holdings: [
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 9.4 },
      { name: 'Reliance Industries', sector: 'Energy', percent: 8.1 },
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 7.6 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 5.9 },
      { name: 'Larsen & Toubro', sector: 'Industrials', percent: 4.3 },
    ],
    equityPct: 97,
  },
  {
    id: 'sbi-smallcap',
    name: 'SBI Small Cap Fund',
    amc: 'SBI Mutual Fund',
    category: 'Equity - Small Cap',
    riskLevel: 'Very High',
    nav: 168.91,
    driftAnnual: 0.21,
    volatility: 0.014,
    cagr3y: 26.7,
    expenseRatio: 0.68,
    aum: 33110,
    rating: 5,
    fundManager: 'R. Srinivasan',
    managerTenure: 9,
    fundAge: 14,
    benchmark: 'NIFTY Smallcap 250 TRI',
    sectors: [
      { sector: 'Industrials', percent: 22.6 },
      { sector: 'Consumer Goods', percent: 17.3 },
      { sector: 'Chemicals', percent: 12.9 },
      { sector: 'Financial Services', percent: 11.2 },
      { sector: 'Healthcare', percent: 8.8 },
      { sector: 'Others', percent: 27.2 },
    ],
    holdings: [
      { name: 'KEI Industries', sector: 'Industrials', percent: 3.8 },
      { name: 'Blue Star Ltd', sector: 'Consumer Goods', percent: 3.4 },
      { name: 'Sonata Software', sector: 'Technology', percent: 3.1 },
      { name: 'Techno Electric', sector: 'Industrials', percent: 2.9 },
      { name: 'Aarti Industries', sector: 'Chemicals', percent: 2.6 },
    ],
    equityPct: 94,
  },
  {
    id: 'axis-midcap',
    name: 'Axis Midcap Fund',
    amc: 'Axis Mutual Fund',
    category: 'Equity - Mid Cap',
    riskLevel: 'High',
    nav: 98.76,
    driftAnnual: 0.16,
    volatility: 0.011,
    cagr3y: 18.9,
    expenseRatio: 0.55,
    aum: 28450,
    rating: 4,
    fundManager: 'Shreyash Devalkar',
    managerTenure: 6,
    fundAge: 13,
    benchmark: 'NIFTY Midcap 150 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 24.1 },
      { sector: 'Healthcare', percent: 15.6 },
      { sector: 'Industrials', percent: 13.7 },
      { sector: 'Consumer Goods', percent: 11.4 },
      { sector: 'Technology', percent: 8.9 },
      { sector: 'Others', percent: 26.3 },
    ],
    holdings: [
      { name: 'Max Healthcare', sector: 'Healthcare', percent: 5.2 },
      { name: 'Cholamandalam Finance', sector: 'Financial Services', percent: 4.7 },
      { name: 'Persistent Systems', sector: 'Technology', percent: 4.1 },
      { name: 'Coforge Ltd', sector: 'Technology', percent: 3.6 },
      { name: 'Page Industries', sector: 'Consumer Goods', percent: 3.2 },
    ],
    equityPct: 93,
  },
  {
    id: 'icici-bluechip',
    name: 'ICICI Prudential Bluechip Fund',
    amc: 'ICICI Prudential',
    category: 'Equity - Large Cap',
    riskLevel: 'Moderately High',
    nav: 94.18,
    driftAnnual: 0.135,
    volatility: 0.0075,
    cagr3y: 17.2,
    expenseRatio: 0.9,
    aum: 61230,
    rating: 4,
    fundManager: 'Anish Tawakley',
    managerTenure: 7,
    fundAge: 18,
    benchmark: 'NIFTY 100 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 33.8 },
      { sector: 'Technology', percent: 12.1 },
      { sector: 'Energy', percent: 10.4 },
      { sector: 'Automobile', percent: 8.7 },
      { sector: 'Healthcare', percent: 6.1 },
      { sector: 'Others', percent: 28.9 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 9.8 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 8.6 },
      { name: 'Reliance Industries', sector: 'Energy', percent: 6.9 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 5.3 },
      { name: 'Bharti Airtel', sector: 'Telecom', percent: 4.1 },
    ],
    equityPct: 96,
  },
  {
    id: 'mirae-largecap',
    name: 'Mirae Asset Large Cap Fund',
    amc: 'Mirae Asset',
    category: 'Equity - Large Cap',
    riskLevel: 'Moderately High',
    nav: 112.6,
    driftAnnual: 0.14,
    volatility: 0.0078,
    cagr3y: 17.9,
    expenseRatio: 0.58,
    aum: 39870,
    rating: 4,
    fundManager: 'Neelesh Surana',
    managerTenure: 14,
    fundAge: 16,
    benchmark: 'NIFTY 100 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 30.5 },
      { sector: 'Technology', percent: 13.2 },
      { sector: 'Energy', percent: 9.8 },
      { sector: 'Consumer Goods', percent: 9.1 },
      { sector: 'Healthcare', percent: 6.4 },
      { sector: 'Others', percent: 31.0 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 8.4 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 7.1 },
      { name: 'Reliance Industries', sector: 'Energy', percent: 6.2 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 5.6 },
      { name: 'Larsen & Toubro', sector: 'Industrials', percent: 4.0 },
    ],
    equityPct: 98,
  },
  {
    id: 'kotak-emergingequity',
    name: 'Kotak Emerging Equity Fund',
    amc: 'Kotak Mahindra',
    category: 'Equity - Mid Cap',
    riskLevel: 'High',
    nav: 141.53,
    driftAnnual: 0.165,
    volatility: 0.0105,
    cagr3y: 19.6,
    expenseRatio: 0.51,
    aum: 46780,
    rating: 5,
    fundManager: 'Atul Bhole',
    managerTenure: 8,
    fundAge: 17,
    benchmark: 'NIFTY Midcap 150 TRI',
    sectors: [
      { sector: 'Industrials', percent: 20.4 },
      { sector: 'Financial Services', percent: 18.7 },
      { sector: 'Healthcare', percent: 12.3 },
      { sector: 'Consumer Goods', percent: 10.9 },
      { sector: 'Chemicals', percent: 8.2 },
      { sector: 'Others', percent: 29.5 },
    ],
    holdings: [
      { name: 'Supreme Industries', sector: 'Industrials', percent: 4.4 },
      { name: 'Cummins India', sector: 'Industrials', percent: 3.9 },
      { name: 'Coforge Ltd', sector: 'Technology', percent: 3.5 },
      { name: 'Balkrishna Industries', sector: 'Automobile', percent: 3.1 },
      { name: 'Fortis Healthcare', sector: 'Healthcare', percent: 2.8 },
    ],
    equityPct: 95,
  },
  {
    id: 'nippon-etfindex',
    name: 'Nippon India Index Fund - Sensex',
    amc: 'Nippon India',
    category: 'Index Fund',
    riskLevel: 'Moderately High',
    nav: 28.34,
    driftAnnual: 0.125,
    volatility: 0.0072,
    cagr3y: 16.4,
    expenseRatio: 0.15,
    aum: 8920,
    rating: 4,
    fundManager: 'Vishal Jain',
    managerTenure: 5,
    fundAge: 10,
    benchmark: 'S&P BSE Sensex TRI',
    sectors: [
      { sector: 'Financial Services', percent: 34.9 },
      { sector: 'Technology', percent: 13.8 },
      { sector: 'Energy', percent: 11.2 },
      { sector: 'Automobile', percent: 8.4 },
      { sector: 'Consumer Goods', percent: 7.6 },
      { sector: 'Others', percent: 24.1 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 12.1 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 9.3 },
      { name: 'Reliance Industries', sector: 'Energy', percent: 8.9 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 6.4 },
      { name: 'TCS Ltd', sector: 'Technology', percent: 5.2 },
    ],
    equityPct: 99,
  },
  {
    id: 'uti-nifty50',
    name: 'UTI Nifty 50 Index Fund',
    amc: 'UTI Mutual Fund',
    category: 'Index Fund',
    riskLevel: 'Moderately High',
    nav: 172.09,
    driftAnnual: 0.122,
    volatility: 0.0071,
    cagr3y: 16.1,
    expenseRatio: 0.2,
    aum: 21340,
    rating: 4,
    fundManager: 'Sharwan Kumar Goyal',
    managerTenure: 6,
    fundAge: 15,
    benchmark: 'NIFTY 50 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 33.1 },
      { sector: 'Technology', percent: 12.9 },
      { sector: 'Energy', percent: 10.8 },
      { sector: 'Automobile', percent: 8.1 },
      { sector: 'Consumer Goods', percent: 7.9 },
      { sector: 'Others', percent: 27.2 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 11.8 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 9.1 },
      { name: 'Reliance Industries', sector: 'Energy', percent: 8.6 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 6.1 },
      { name: 'TCS Ltd', sector: 'Technology', percent: 4.9 },
    ],
    equityPct: 99,
  },
  {
    id: 'dsp-corpbond',
    name: 'DSP Corporate Bond Fund',
    amc: 'DSP Mutual Fund',
    category: 'Debt - Corporate Bond',
    riskLevel: 'Low',
    nav: 14.82,
    driftAnnual: 0.072,
    volatility: 0.0015,
    cagr3y: 6.9,
    expenseRatio: 0.35,
    aum: 4210,
    rating: 3,
    fundManager: 'Vikram Chopra',
    managerTenure: 5,
    fundAge: 9,
    benchmark: 'CRISIL Corporate Bond Index',
    sectors: [
      { sector: 'AAA Rated Bonds', percent: 68.4 },
      { sector: 'AA+ Rated Bonds', percent: 18.2 },
      { sector: 'Government Securities', percent: 9.1 },
      { sector: 'Cash & Equivalents', percent: 4.3 },
    ],
    holdings: [
      { name: 'REC Ltd 7.4% 2027', sector: 'AAA Bonds', percent: 8.2 },
      { name: 'NABARD 7.6% 2026', sector: 'AAA Bonds', percent: 7.4 },
      { name: 'HDFC Ltd 7.5% 2028', sector: 'AAA Bonds', percent: 6.8 },
      { name: 'Power Finance Corp', sector: 'AAA Bonds', percent: 5.9 },
      { name: 'GOI 7.18% 2033', sector: 'G-Sec', percent: 5.1 },
    ],
    equityPct: 0,
  },
  {
    id: 'icici-shortduration',
    name: 'ICICI Prudential Short Term Fund',
    amc: 'ICICI Prudential',
    category: 'Debt - Short Duration',
    riskLevel: 'Low',
    nav: 54.29,
    driftAnnual: 0.068,
    volatility: 0.0013,
    cagr3y: 6.5,
    expenseRatio: 0.4,
    aum: 15780,
    rating: 4,
    fundManager: 'Manish Banthia',
    managerTenure: 10,
    fundAge: 16,
    benchmark: 'CRISIL Short Duration Index',
    sectors: [
      { sector: 'AAA Rated Bonds', percent: 61.2 },
      { sector: 'AA Rated Bonds', percent: 21.4 },
      { sector: 'Government Securities', percent: 11.8 },
      { sector: 'Cash & Equivalents', percent: 5.6 },
    ],
    holdings: [
      { name: 'GOI 7.26% 2029', sector: 'G-Sec', percent: 7.9 },
      { name: 'LIC Housing Finance', sector: 'AAA Bonds', percent: 6.4 },
      { name: 'Bajaj Finance Ltd', sector: 'AAA Bonds', percent: 5.8 },
      { name: 'Sundaram Finance', sector: 'AA Bonds', percent: 4.7 },
      { name: 'Tata Capital Ltd', sector: 'AAA Bonds', percent: 4.2 },
    ],
    equityPct: 0,
  },
  {
    id: 'hdfc-hybridequity',
    name: 'HDFC Hybrid Equity Fund',
    amc: 'HDFC Mutual Fund',
    category: 'Hybrid - Aggressive',
    riskLevel: 'Moderate',
    nav: 89.47,
    driftAnnual: 0.115,
    volatility: 0.006,
    cagr3y: 14.8,
    expenseRatio: 0.85,
    aum: 22140,
    rating: 4,
    fundManager: 'Gopal Agrawal',
    managerTenure: 6,
    fundAge: 19,
    benchmark: 'CRISIL Hybrid 35+65 Index',
    sectors: [
      { sector: 'Financial Services', percent: 21.6 },
      { sector: 'Debt Instruments', percent: 25.0 },
      { sector: 'Technology', percent: 9.4 },
      { sector: 'Energy', percent: 8.1 },
      { sector: 'Others', percent: 35.9 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 6.2 },
      { name: 'GOI 7.18% 2033', sector: 'G-Sec', percent: 5.9 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 4.8 },
      { name: 'Reliance Industries', sector: 'Energy', percent: 4.1 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 3.6 },
    ],
    equityPct: 73,
  },
  {
    id: 'axis-elss',
    name: 'Axis Long Term Equity Fund (ELSS)',
    amc: 'Axis Mutual Fund',
    category: 'ELSS - Tax Saver',
    riskLevel: 'Moderately High',
    nav: 78.92,
    driftAnnual: 0.128,
    volatility: 0.0088,
    cagr3y: 15.9,
    expenseRatio: 0.62,
    aum: 29870,
    rating: 3,
    fundManager: 'Jinesh Gopani',
    managerTenure: 12,
    fundAge: 13,
    benchmark: 'NIFTY 500 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 27.3 },
      { sector: 'Technology', percent: 16.9 },
      { sector: 'Consumer Goods', percent: 12.4 },
      { sector: 'Healthcare', percent: 9.8 },
      { sector: 'Others', percent: 33.6 },
    ],
    holdings: [
      { name: 'Bajaj Finance Ltd', sector: 'Financial Services', percent: 7.8 },
      { name: 'Kotak Mahindra Bank', sector: 'Financial Services', percent: 6.4 },
      { name: 'Avenue Supermarts', sector: 'Consumer Goods', percent: 5.1 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 4.6 },
      { name: 'Pidilite Industries', sector: 'Chemicals', percent: 3.9 },
    ],
    equityPct: 95,
  },
  {
    id: 'sbi-conservative-hybrid',
    name: 'SBI Conservative Hybrid Fund',
    amc: 'SBI Mutual Fund',
    category: 'Hybrid - Conservative',
    riskLevel: 'Moderate',
    nav: 67.14,
    driftAnnual: 0.089,
    volatility: 0.0035,
    cagr3y: 10.6,
    expenseRatio: 0.72,
    aum: 9640,
    rating: 4,
    fundManager: 'Dinesh Ahuja',
    managerTenure: 8,
    fundAge: 20,
    benchmark: 'CRISIL Hybrid 85+15 Index',
    sectors: [
      { sector: 'Debt Instruments', percent: 76.0 },
      { sector: 'Financial Services', percent: 8.2 },
      { sector: 'Technology', percent: 3.9 },
      { sector: 'Others', percent: 11.9 },
    ],
    holdings: [
      { name: 'GOI 7.18% 2033', sector: 'G-Sec', percent: 12.4 },
      { name: 'REC Ltd 7.4% 2027', sector: 'AAA Bonds', percent: 8.9 },
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 3.1 },
      { name: 'NABARD Bonds', sector: 'AAA Bonds', percent: 6.7 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 2.4 },
    ],
    equityPct: 22,
  },
  {
    id: 'mirae-elss-tax',
    name: 'Mirae Asset Tax Saver Fund',
    amc: 'Mirae Asset',
    category: 'ELSS - Tax Saver',
    riskLevel: 'Moderately High',
    nav: 44.61,
    driftAnnual: 0.155,
    volatility: 0.0092,
    cagr3y: 19.1,
    expenseRatio: 0.56,
    aum: 19870,
    rating: 5,
    fundManager: 'Neelesh Surana',
    managerTenure: 9,
    fundAge: 10,
    benchmark: 'NIFTY 500 TRI',
    sectors: [
      { sector: 'Financial Services', percent: 29.4 },
      { sector: 'Technology', percent: 14.8 },
      { sector: 'Consumer Goods', percent: 10.6 },
      { sector: 'Healthcare', percent: 8.1 },
      { sector: 'Others', percent: 37.1 },
    ],
    holdings: [
      { name: 'HDFC Bank Ltd', sector: 'Financial Services', percent: 8.7 },
      { name: 'ICICI Bank Ltd', sector: 'Financial Services', percent: 7.3 },
      { name: 'Infosys Ltd', sector: 'Technology', percent: 5.8 },
      { name: 'Larsen & Toubro', sector: 'Industrials', percent: 4.2 },
      { name: 'Titan Company', sector: 'Consumer Goods', percent: 3.7 },
    ],
    equityPct: 96,
  },
]

function riskMetricsFor(volatility: number, driftAnnual: number, benchmarkDrift = 0.12) {
  const annualVol = volatility * Math.sqrt(252) * 100
  const beta = Math.min(1.4, Math.max(0.55, (volatility / 0.009) * 0.95))
  const alpha = Math.round(((driftAnnual - benchmarkDrift) * 100) * 10) / 10
  const sharpe = Math.round(((driftAnnual - 0.065) / (volatility * Math.sqrt(252))) * 100) / 100
  return {
    alpha,
    beta: Math.round(beta * 100) / 100,
    sharpeRatio: sharpe,
    standardDeviation: Math.round(annualVol * 10) / 10,
    sortino: Math.round((sharpe * 1.25) * 100) / 100,
    rSquared: Math.round((78 + (1 - volatility * 40) * 15) * 10) / 10,
  }
}

function buildReturns(fundId: string, cagr3y: number, driftAnnual: number) {
  const rand = mulberry32(hashSeed(fundId + 'returns'))
  const jitter = (base: number, spread: number) => Math.round((base + (rand() - 0.5) * spread) * 100) / 100
  return {
    '1M': jitter(driftAnnual * 100 / 12, 3),
    '3M': jitter(driftAnnual * 100 / 4, 4),
    '6M': jitter(driftAnnual * 100 / 2, 5),
    '1Y': jitter(driftAnnual * 100, 4),
    '3Y': cagr3y,
    '5Y': jitter(cagr3y * 1.05, 3),
  }
}

export const MUTUAL_FUNDS: MutualFund[] = FUND_SEEDS.map((seed) => {
  const navHistory = generateNavHistory(seed.id, seed.nav, seed.driftAnnual, seed.volatility)
  const rand = mulberry32(hashSeed(seed.id + 'change'))
  const navChangePercent = Math.round(((rand() - 0.35) * 1.8) * 100) / 100
  const navChange = Math.round(seed.nav * (navChangePercent / 100) * 100) / 100

  return {
    id: seed.id,
    name: seed.name,
    amc: seed.amc,
    category: seed.category,
    riskLevel: seed.riskLevel,
    nav: seed.nav,
    navChange,
    navChangePercent,
    cagr3y: seed.cagr3y,
    expenseRatio: seed.expenseRatio,
    exitLoad: seed.category.startsWith('Debt') ? 'Nil after 1 year' : '1% if redeemed within 1 year',
    aum: seed.aum,
    rating: seed.rating,
    returns: buildReturns(seed.id, seed.cagr3y, seed.driftAnnual),
    fundManager: seed.fundManager,
    fundManagerTenureYears: seed.managerTenure,
    fundAgeYears: seed.fundAge,
    minSipAmount: 500,
    minLumpsumAmount: 5000,
    benchmark: seed.benchmark,
    navHistory,
    holdings: seed.holdings,
    sectorAllocation: seed.sectors,
    assetAllocation: {
      equity: seed.equityPct,
      debt: seed.equityPct > 0 ? Math.max(0, 100 - seed.equityPct - 3) : 92,
      cash: seed.equityPct > 0 ? 3 : 5,
      other: seed.equityPct > 0 ? Math.max(0, 100 - seed.equityPct - (100 - seed.equityPct - 3) - 3) : 3,
    },
    riskMetrics: riskMetricsFor(seed.volatility, seed.driftAnnual),
    isin: `INF${hashSeed(seed.id).toString(36).slice(0, 6).toUpperCase().padStart(6, '0')}01234`,
  }
})

export function getFundById(id: string): MutualFund | undefined {
  return MUTUAL_FUNDS.find((f) => f.id === id)
}
