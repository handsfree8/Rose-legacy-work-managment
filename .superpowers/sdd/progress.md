# Estimate Flow SDD Progress

Branch start: 3d2bd71

Task 1: complete (DB-only migration, no commits — estimates.ticket_id nullable, expires_at added)
Task 2: complete (pg_cron expire-pending-estimates scheduled 0 2 * * *)
Task 3+4: complete (commit 13192c8 on feature/estimate-flow in invoice-2-0, review clean, RLS ok via authenticated session)
Task 5: complete (commit 8a4094a on feature/estimate-button in work-management)
