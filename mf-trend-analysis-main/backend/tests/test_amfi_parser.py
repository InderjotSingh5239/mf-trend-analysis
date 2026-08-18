from datetime import date

from app.etl.amfi_etl import deduplicate_rows, parse_amfi_text

SAMPLE_TEXT = """Open Ended Schemes

Aditya Birla Sun Life Mutual Fund

Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
100001;INF001;INF002;ABSL Frontline Equity Fund - Growth;45.6789;17-Jul-2026
100002;INF003;;ABSL Liquid Fund - Growth;123.4567;17-Jul-2026

HDFC Mutual Fund

Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
200001;INF004;;HDFC Top 100 Fund - Growth;789.1234;17-Jul-2026
BADROW;WITHOUT;ENOUGH
"""


def test_parse_amfi_text_extracts_valid_rows():
    rows = parse_amfi_text(SAMPLE_TEXT)
    assert len(rows) == 3

    first = rows[0]
    assert first.amc_name == "Aditya Birla Sun Life Mutual Fund"
    assert first.scheme_code == "100001"
    assert first.nav_value == 45.6789
    assert first.nav_date == date(2026, 7, 17)


def test_parse_amfi_text_skips_malformed_rows():
    rows = parse_amfi_text(SAMPLE_TEXT)
    scheme_codes = {row.scheme_code for row in rows}
    assert "BADROW" not in scheme_codes


def test_deduplicate_rows_keeps_last_occurrence():
    rows = parse_amfi_text(SAMPLE_TEXT)
    duplicated = rows + [rows[0]]
    deduped = deduplicate_rows(duplicated)
    assert len(deduped) == len(rows)
