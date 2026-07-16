# Pricing Load Speed Spec

## Why
Pricing page takes several seconds to display prices because it calls Paddle's `/api/prices` endpoint on every load. Hardcoded `staticPrices` already exist in the file but are only used as a fallback. Prices should render instantly (in milliseconds) without waiting for a network round-trip.

## What Changes
- Initialize `tiers` state with `staticPrices.month` directly instead of empty array `[]`
- Initialize `loading` state to `false` instead of `true`
- Remove the `useEffect` that fetches `/api/prices?interval=...` from the pricing page
- Switch interval (month/year) locally using `staticPrices` instead of an API call
- Remove the `/api/prices` API route entirely (no longer called)

## Impact
- Affected specs: Pricing page interaction
- Affected code: `src/app/pricing/page.tsx`, `src/app/api/prices/route.ts`

## ADDED Requirements
### Requirement: Instant Price Display
The system SHALL display prices immediately without waiting for any network request.

#### Scenario: Page loads
- **WHEN** user navigates to `/pricing`
- **THEN** prices are rendered immediately from static data (no loading state shown)

#### Scenario: Interval toggle (month/year)
- **WHEN** user clicks "Annual" or "Monthly" toggle
- **THEN** prices switch instantly without any API call

## REMOVED Requirements
### Requirement: Paddle Price Preview API
**Reason**: Prices are static and match what Paddle returns. The API call only adds latency — the `staticPrices` object already has the correct data.
**Migration**: Paddle SDK (`@paddle/paddle-js`) still initializes in the background for checkout flow. The `/api/prices` route is no longer needed.
