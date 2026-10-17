-- Correct non-finite guard: isnan() takes float8 only (42883 on numeric),
-- and numeric NaN satisfies NaN=NaN, so compare the text form instead.
-- Applied via migration settle_nan_text_check. The full function body (with
-- this predicate) lives in 20261017121000_canonical_guard_bodies.sql.
-- Verified live: 'NaN' raises bad amount, finite amounts settle normally.
select 1;
