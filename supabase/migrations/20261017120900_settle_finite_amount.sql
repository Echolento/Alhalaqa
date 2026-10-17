-- Clean non-finite amount guard (NaN self-inequality + Infinity bounds).
-- NaN comparisons bypass a plain <0 check, so NaN/Infinity are rejected
-- explicitly. Applied via migration settle_finite_amount. The full function
-- body (with this predicate) lives in
-- 20261017120600_race_close_guards.sql (kept current).
select 1;
