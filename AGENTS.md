# Quadillar LiveView Architecture Directives

## Architecture Standard
- Built on ISO 19650-2 Common Data Environment (CDE) state transitions: WIP -> Shared -> Published -> Archived.
- Mobile/field views must ONLY display `Published` files with `is_latest = true`.
- Contractual Cascades: RFI (inquiry only) -> RFC (potential cost/time impact) -> Change Order (signed contract adjustment).
- Progressive COBie extraction: Approved submittals automatically populate `cobie_types` and `cobie_components`.
- Database: Supabase client in `app/lib/supabase.ts`.

## Deliverables Required
1. `types/construction.ts` - All ISO 19650, RFI, RFC, Change Order, and COBie interfaces.
2. `lib/workflow/engine.ts` - Deterministic state machine and SLA float erosion calculation.
3. `lib/cobie/pipeline.ts` - Progressive metadata extractor for approved submittals.
4. `app/lib/services.ts` - Supabase query layer for CDE items, RFIs, and Change Orders.
5. `app/dashboard/page.tsx` - Command hub displaying the CDE container ledger, active Ball-In-Court RFIs, and change order pipelines.