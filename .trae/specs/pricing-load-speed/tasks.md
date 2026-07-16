# Tasks
- [ ] Task 1: Make pricing page load prices instantly from static data
  - Initialize `tiers` state with `staticPrices.month` instead of `[]`
  - Initialize `loading` state to `false` instead of `true`
  - Remove the `useEffect` that fetches `/api/prices?interval=...`
  - Handle interval toggle (month/year) locally by switching between `staticPrices.month` and `staticPrices.year`
- [ ] Task 2: Remove unused `/api/prices` API route
  - Delete `src/app/api/prices/route.ts`
  - Clean up any unused imports (paddle server/client utils) if nothing else uses them

# Task Dependencies
- [Task 2] depends on [Task 1] (no actual dependency, can be done in parallel)
