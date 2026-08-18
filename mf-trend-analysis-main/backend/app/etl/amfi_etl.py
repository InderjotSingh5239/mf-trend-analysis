"""
AMFI India NAV ETL pipeline.

Source: https://www.amfiindia.com/spages/NAVAll.txt
This is a free, public, no-auth-required pipe-delimited text file
published daily by AMFI (Association of Mutual Funds in India)
containing the NAV of every scheme of every AMC in India.

File format (pipe-delimited), section headers look like:
    Aditya Birla Sun Life Mutual Fund
    Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date

Blank lines separate AMC sections. This module streams the file,
parses it defensively (AMFI's format has known quirks), validates
rows, deduplicates, and upserts into Postgres via FundRepository.
"""

import uuid
from dataclasses import dataclass
from datetime import date, datetime

import httpx
from loguru import logger
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.repositories.fund_repository import FundRepository

EXPECTED_COLUMNS = 6


@dataclass
class ParsedNavRow:
    amc_name: str
    scheme_code: str
    isin_growth: str | None
    isin_div_reinvestment: str | None
    scheme_name: str
    nav_value: float
    nav_date: date


class AMFIParseError(Exception):
    pass


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=2, max=30))
def fetch_amfi_raw_text() -> str:
    """Fetch the raw AMFI NAV file with automatic retries on transient failures."""
    logger.info("Fetching AMFI NAV file from {}", settings.AMFI_NAV_URL)
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        response = client.get(settings.AMFI_NAV_URL)
        response.raise_for_status()
        return response.text


def _parse_nav_date(raw: str) -> date | None:
    raw = raw.strip()
    for fmt in ("%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def parse_amfi_text(raw_text: str) -> list[ParsedNavRow]:
    """
    Parse the AMFI NAVAll.txt content into structured rows.
    Defensive against malformed lines, header repeats, and blank sections.
    """
    rows: list[ParsedNavRow] = []
    current_amc = "Unknown AMC"
    skipped = 0

    for line in raw_text.splitlines():
        line = line.strip()

        if not line:
            continue

        # AMC section header lines contain no ';' delimiter
        if ";" not in line:
            current_amc = line
            continue

        # Skip the repeated column-header row
        if line.lower().startswith("scheme code"):
            continue

        parts = line.split(";")
        if len(parts) < EXPECTED_COLUMNS:
            skipped += 1
            continue

        scheme_code, isin_growth, isin_div, scheme_name, nav_str, date_str = parts[:6]

        scheme_code = scheme_code.strip()
        if not scheme_code:
            skipped += 1
            continue

        try:
            nav_value = float(nav_str.strip())
        except ValueError:
            skipped += 1
            continue

        nav_date = _parse_nav_date(date_str)
        if nav_date is None:
            skipped += 1
            continue

        rows.append(
            ParsedNavRow(
                amc_name=current_amc,
                scheme_code=scheme_code,
                isin_growth=isin_growth.strip() or None,
                isin_div_reinvestment=isin_div.strip() or None,
                scheme_name=scheme_name.strip(),
                nav_value=nav_value,
                nav_date=nav_date,
            )
        )

    logger.info("Parsed {} valid NAV rows, skipped {} malformed rows", len(rows), skipped)
    return rows


def deduplicate_rows(rows: list[ParsedNavRow]) -> list[ParsedNavRow]:
    """Keep the last occurrence of each (scheme_code, nav_date) pair."""
    seen: dict[tuple[str, date], ParsedNavRow] = {}
    for row in rows:
        seen[(row.scheme_code, row.nav_date)] = row
    return list(seen.values())


def load_rows(db: Session, rows: list[ParsedNavRow]) -> tuple[int, int]:
    """
    Upsert AMCs, MutualFunds and NAVHistory rows into the database.
    Returns (funds_processed, nav_rows_inserted).
    """
    repo = FundRepository(db)
    amc_cache: dict[str, uuid.UUID] = {}
    nav_batch: list[dict] = []
    funds_processed = 0

    for row in rows:
        amc = amc_cache.get(row.amc_name)
        if amc is None:
            amc_obj = repo.get_or_create_amc(row.amc_name)
            amc_cache[row.amc_name] = amc_obj.id
            amc = amc_obj.id

        fund = repo.upsert_fund(row.scheme_code, row.scheme_name, amc)
        funds_processed += 1

        nav_batch.append({"fund_id": fund.id, "nav_date": row.nav_date, "nav_value": row.nav_value})

    db.commit()

    inserted = 0
    # Batch the NAV upserts to keep individual statements reasonably sized.
    batch_size = 1000
    for i in range(0, len(nav_batch), batch_size):
        chunk = nav_batch[i : i + batch_size]
        inserted += repo.bulk_upsert_nav(chunk)

    return funds_processed, inserted


def run_amfi_sync(db: Session) -> dict:
    """Full ETL run: fetch -> parse -> validate -> dedupe -> load."""
    started_at = datetime.utcnow()

    raw_text = fetch_amfi_raw_text()
    parsed = parse_amfi_text(raw_text)
    deduped = deduplicate_rows(parsed)
    funds_processed, nav_rows_inserted = load_rows(db, deduped)

    finished_at = datetime.utcnow()
    logger.info(
        "AMFI sync complete: {} funds, {} NAV rows in {:.2f}s",
        funds_processed,
        nav_rows_inserted,
        (finished_at - started_at).total_seconds(),
    )

    return {
        "funds_processed": funds_processed,
        "nav_rows_inserted": nav_rows_inserted,
        "started_at": started_at,
        "finished_at": finished_at,
    }
