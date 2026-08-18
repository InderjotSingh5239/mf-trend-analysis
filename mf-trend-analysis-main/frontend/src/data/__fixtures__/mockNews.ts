export interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  category: 'Markets' | 'Mutual Funds' | 'Economy' | 'RBI Policy' | 'Global'
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  publishedAt: string
}

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    headline: 'Equity mutual fund inflows cross ₹28,000 crore in June',
    summary:
      'SIP contributions hit a fresh record as retail investors continue to favor flexi-cap and mid-cap categories despite valuation concerns.',
    source: 'AMFI Data Desk',
    category: 'Mutual Funds',
    sentiment: 'Positive',
    publishedAt: '2026-07-15T09:30:00',
  },
  {
    id: 'n2',
    headline: 'RBI holds repo rate steady at 6.25% for third straight meeting',
    summary:
      'The central bank maintained its neutral stance, citing balanced inflation risks. Debt fund NAVs showed limited movement post-announcement.',
    source: 'Market Wire',
    category: 'RBI Policy',
    sentiment: 'Neutral',
    publishedAt: '2026-07-14T14:00:00',
  },
  {
    id: 'n3',
    headline: 'Small-cap funds see volatility spike amid profit booking',
    summary:
      'Fund managers advise caution as small-cap indices correct nearly 6% from recent highs, though long-term flows remain resilient.',
    source: 'Business Desk',
    category: 'Markets',
    sentiment: 'Negative',
    publishedAt: '2026-07-14T11:15:00',
  },
  {
    id: 'n4',
    headline: 'FIIs turn net buyers after four months of consistent selling',
    summary:
      'Foreign institutional flows into Indian equities turned positive last week, a shift analysts attribute to easing global rate expectations.',
    source: 'Global Markets Bureau',
    category: 'Global',
    sentiment: 'Positive',
    publishedAt: '2026-07-13T08:45:00',
  },
  {
    id: 'n5',
    headline: 'CPI inflation eases to 4.1%, lowest in eighteen months',
    summary:
      'Softer food prices drove the decline, raising expectations of a rate cut later this year that could benefit long-duration debt funds.',
    source: 'Economic Times Wire',
    category: 'Economy',
    sentiment: 'Positive',
    publishedAt: '2026-07-12T07:00:00',
  },
  {
    id: 'n6',
    headline: 'SEBI proposes tighter disclosure norms for thematic funds',
    summary:
      'New rules would require clearer risk labeling for sector and thematic mutual fund schemes ahead of new fund launches.',
    source: 'Regulatory Desk',
    category: 'Mutual Funds',
    sentiment: 'Neutral',
    publishedAt: '2026-07-11T16:20:00',
  },
]
