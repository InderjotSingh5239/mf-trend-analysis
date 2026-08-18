# Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : has
    USERS ||--o{ PORTFOLIOS : owns
    USERS ||--o{ WATCHLISTS : owns
    USERS ||--o{ ALERTS : owns
    USERS ||--o{ NOTIFICATIONS : receives

    AMCS ||--o{ MUTUAL_FUNDS : manages
    MUTUAL_FUNDS ||--o{ NAV_HISTORY : has
    MUTUAL_FUNDS ||--o{ ML_MODELS : trained_for
    MUTUAL_FUNDS ||--o{ PREDICTIONS : predicted_for
    ML_MODELS ||--o{ MODEL_METRICS : scored_by

    MUTUAL_FUNDS ||--o{ HOLDINGS : "held as"
    MUTUAL_FUNDS ||--o{ TRANSACTIONS : "traded as"
    MUTUAL_FUNDS ||--o{ WATCHLIST_ITEMS : "watched as"
    MUTUAL_FUNDS ||--o{ ALERTS : "monitored (optional)"

    PORTFOLIOS ||--o{ HOLDINGS : contains
    PORTFOLIOS ||--o{ TRANSACTIONS : records
    PORTFOLIOS ||--o{ ALERTS : "monitored (optional)"

    WATCHLISTS ||--o{ WATCHLIST_ITEMS : contains
    ALERTS ||--o{ NOTIFICATIONS : triggers

    USERS {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        enum role
        bool is_active
        bool is_verified
    }
    AMCS {
        uuid id PK
        string name UK
        string code UK
    }
    MUTUAL_FUNDS {
        uuid id PK
        string scheme_code UK
        string scheme_name
        uuid amc_id FK
        string category
        string risk_category
    }
    NAV_HISTORY {
        uuid id PK
        uuid fund_id FK
        date nav_date
        numeric nav
    }
    ML_MODELS {
        uuid id PK
        uuid fund_id FK
        string model_name
        int version
        bool is_best
        json hyperparameters
    }
    PREDICTIONS {
        uuid id PK
        uuid fund_id FK
        uuid model_id FK
        date target_date
        numeric predicted_nav
    }
    MARKET_DATA {
        uuid id PK
        string symbol
        enum category
        numeric close_value
    }
    NEWS {
        uuid id PK
        string title UK "unique on url"
        enum sentiment_label
        json related_symbols
    }
    PORTFOLIOS {
        uuid id PK
        uuid user_id FK
        string name
        string base_currency
    }
    HOLDINGS {
        uuid id PK
        uuid portfolio_id FK
        uuid fund_id FK
        float units
        float avg_nav
        float current_nav
    }
    TRANSACTIONS {
        uuid id PK
        uuid portfolio_id FK
        uuid fund_id FK
        enum transaction_type
        float units
        float nav
        float amount
        datetime transaction_date
    }
    WATCHLISTS {
        uuid id PK
        uuid user_id FK
        string name
    }
    WATCHLIST_ITEMS {
        uuid id PK
        uuid watchlist_id FK
        uuid fund_id FK
        string notes
    }
    ALERTS {
        uuid id PK
        uuid user_id FK
        uuid fund_id FK "nullable"
        uuid portfolio_id FK "nullable"
        enum alert_type
        float threshold_value
        enum status
    }
    NOTIFICATIONS {
        uuid id PK
        uuid alert_id FK
        uuid user_id FK
        string message
        bool is_read
    }
```

## Notes

- All primary keys are UUIDv4, generated application-side (`uuid.uuid4()` default on
  `mapped_column`), not database-side — this keeps IDs generatable before an INSERT is flushed
  (useful for the transaction/holding upsert flow in `PortfolioService`).
- `holdings` and `watchlist_items` each carry a `UNIQUE(portfolio_id/watchlist_id, fund_id)`
  constraint — a fund can only appear once per portfolio/watchlist; repeated purchases update
  the existing `Holding` row's weighted-average NAV rather than inserting a new row.
- `alerts.fund_id` and `alerts.portfolio_id` are both nullable and mutually-optional-but-not-
  exclusive at the DB level — the API layer (`AlertCreate` schema) is what decides which
  combination is meaningful for a given `alert_type`.
- See `alembic/versions/0004_portfolio_watchlist_alerts.py` for the exact column-level DDL,
  including all `ON DELETE` behaviors (`CASCADE` for user/portfolio/watchlist-owned rows,
  `RESTRICT` for `fund_id` on `holdings`/`transactions` so a fund can't be deleted out from
  under an existing position).
