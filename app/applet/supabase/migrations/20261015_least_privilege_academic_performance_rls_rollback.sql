-- ==============================================================================
-- Rollback: 20261015_least_privilege_academic_performance_rls_rollback.sql
-- VIDYA PLATFORM: ROLLBACK LEAST-PRIVILEGE RLS POLICIES FOR ACADEMIC PERFORMANCE
-- Supabase Project: https://fxwzjeyiywprabttaznt.supabase.co
--
-- STATUS: PREPARED ONLY (NOT EXECUTED).
-- BEHAVIOR: Restores public.academic_performance to strict DEFAULT-DENY state
-- (the exact pre-migration state where no permissive policies exist).
-- ==============================================================================

BEGIN;

-- 1. Drop the three least-privilege policies introduced in the migration
DROP POLICY IF EXISTS "Students can view own academic performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Teachers can view assigned students academic performance" ON public.academic_performance;
DROP POLICY IF EXISTS "Admins can view all academic performance" ON public.academic_performance;

-- 2. Ensure RLS remains enabled (reverting table to strict default-deny)
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;

COMMIT;
