# Keysy — Story Verification Evidence

Prepared 2026-10-01 for portal re-verification of STORY-002 to STORY-015. Every test named here passes in the current `main` (backend 27 suites / 155 tests, frontend 20 suites / 174 tests; `tsc --noEmit` clean in both).

Paste each story's block into the portal when you submit it.

---

## STORY-002 — Property Discovery Feed
1. **Feed of properties:** `GET /properties returns the property feed with the REQ-002 fields`; `PropertyFeedPage renders the feed with property details, the disclaimer, and a favorite button per card`.
2. **Saved property appears in favorites:** `favorites saves a property with the default category and it appears in the user favorites`.
3. **Trust (MLS data, displayed accurately):** the feed calls the SimplyRETS MLS API live (`SimplyRetsMlsClient`, wired in `backend/src/server.ts`). Live check on 2026-10-01: 43 for-sale listings × 7 fields compared against SimplyRETS's raw response, 0 mismatches. `mlsClient.test.ts` covers mapping, rental exclusion, retry, and outage.

## STORY-003 — Basic Property Search
1. **Search by city:** `filterProperties matches city as a case-insensitive substring of the free-text address`; `PropertyFeedPage quick lookup filters the grid by city, ignoring case`.
2. **Price filter:** `filterProperties keeps only properties matching every set criterion`; `PropertyFeedPage quick lookup filters by bedrooms and by price`; `lookupProperties supports inclusive ranges, in either order`.
3. **Trust (consistent with MLS):** search filters the same live MLS feed as STORY-002; no separate data source. Real-browser check against live SimplyRETS data: each city's count matched the count computed directly from the API's addresses.

## STORY-004 — Property Details and Match Score
1. **All details including match score:** `PropertyDetailPage shows all the property details once loaded`; `PropertyDetailPage shows the match score and criteria breakdown when reached from a search result`.
2. **Why it's not a match:** the detail page lists "Doesn't match: …" from `unmatchedCriteria`, with a Full / Partial / Poor match label (`explainMatch parses the AI response into a MatchResult object`).
3. **Trust (based on preferences + MLS data):** the score compares the buyer's search criteria against the listing's MLS price, beds, baths, type and features (`aiSearchService.ts`, `explainMatch`).
- **Known limit:** the match score appears when a property is opened from a search; opening it straight from the feed shows "Search to see how well this matches". It is based on the search, not the saved Buyer Profile from STORY-014.

## STORY-005 — Favorites and Saved Properties
1. **Saved to selected category:** `favorites saves a property to a chosen category and it appears in that selected category`; `PropertyCard saves the property to the selected category…`.
2. **Removed no longer appears:** `favorites removes a saved property from its category, and it no longer appears in favorites`; `SavedHomesPage removes a saved property, and it no longer appears`.
3. **Trust (stored and retrieved accurately):** saves are stored in the database with a unique (user, property, category) key, so saving twice creates no duplicate (`favorites saving the same property to the same category twice does not create a duplicate favorite`); each user sees only their own.

## STORY-006 — Property Comparison
1. **Differences highlighted:** `ComparisonPage highlights a row where values differ across properties, and leaves an identical row unhighlighted`.
2. **Removing updates the comparison:** `ComparisonPage calls onRemove with the property id when its Remove button is clicked`.
3. **Trust (accurate, up to date):** each compared property is fetched fresh from the MLS when the view opens; missing values show "not available" rather than invented ones (`ComparisonPage shows honest "not available" placeholders…`).

## STORY-007 — Map View of Properties
1. **Zoom updates visible properties:** `MapView updates markers to the newly visible properties when the map is panned or zoomed`; `filterPropertiesInBounds` tests.
2. **Marker click shows a preview:** each marker carries a popup with price, address, and size (`MapView attaches a preview to each marker showing the price, address, and size`).
3. **Trust (synced with MLS):** markers come from the same live MLS feed, using SimplyRETS's coordinates; listings without coordinates are left off the map rather than guessed (`filterPropertiesInBounds excludes a property missing latitude or longitude…`).
- **Fixed 2026-10-01:** the preview was built as an HTML string from MLS addresses, so a malicious address could inject markup. It now uses text-only DOM nodes (`buildPreviewElement renders markup in an MLS address as plain text, not HTML`).

## STORY-008 — Schedule a Property Tour
1. **Confirmation received:** `tour requests creates a tour request and sends a confirmation email with accurate details`; `TourRequestPage submits the form and shows a confirmation message…`.
2. **Incomplete details prompt:** `tour requests rejects incomplete details with a 400 error and creates no tour request`; `TourRequestPage shows an error message when the backend rejects incomplete or invalid details`.
3. **Trust (logged and confirmed accurately):** `tour requests logs the tour request with a timestamp in the audit trail`; `requesting the same tour twice does not create a duplicate`.

## STORY-009 — Notification Preferences
1. **Updates reflect changes:** `notification preferences updates preferences and reflects the change on the next read`; `NotificationPreferencesPage toggles a preference off and saves it`.
2. **Disabled is not sent:** `tour requests skips the confirmation email entirely when the buyer has disabled tour-confirmation notifications`.
3. **Trust (stored and applied correctly):** stored in one row per user (`saving preferences twice updates the one row instead of creating a duplicate`; `keeps each user's preferences independent`) and checked before sending (`isNotificationEnabled` tests).

## STORY-010 — Affordability Calculator
1. **All cost components:** `AffordabilityCalculatorPage displays every cost component once the property loads`; `calculateAffordability displays every cost component, and they sum to the total`.
2. **Inputs change results:** `AffordabilityCalculatorPage recalculates the total when an input changes`.
3. **Trust (accurate + disclaimer):** `calculateAffordability computes a principal-and-interest payment that fully amortizes the loan to zero over the loan term`; mortgage-insurance threshold tests; `AffordabilityCalculatorPage always shows the affordability disclaimer alongside the results`.

## STORY-011 — Share a Property
1. **Email share received:** `POST /properties/:id/share sends the property details to the recipient and returns the shareable link`; live Resend send returned 200 with a message id (2026-09-30).
2. **Text share sends a link:** `SharePropertyPanel shows the shareable link, a text-share link, and an email form once opened` (opens the phone's messaging app with the link; user-approved instead of a paid SMS provider).
3. **Trust (links valid, lead to correct property):** `App shows the shared property when ?property= is present in the URL, ahead of the login gate`; `POST /properties/:id/share returns 404 for an unknown property, without attempting to send`.

## STORY-012 — Data Security and Third-Party Integrations
1. **Encrypted in transit:** `transport security (production wiring) rejects a plain-HTTP login before the password reaches the auth handler`; `serves HTTPS requests with HSTS and nosniff headers`. Real TLS proof: TLSv1.3 negotiated, plain HTTP refused.
2. **Integrations connect to the correct service:** live checks — SimplyRETS 200, MapTiler 200, Resend 200.
3. **Trust (security in place, integrations functional):** passwords hashed (`passwordService` tests); tokens revocable (`tokenService` tests); every integration fails safely (MLS 503, map error message, email failure reported honestly).

## STORY-014 — Buyer Profile Creation
1. **Valid info creates a profile:** `buyer profile creates a profile from valid information`.
2. **Incomplete info shows an error:** `buyer profile rejects incomplete information with a 400 error message and creates no profile`.
3. **Trust (logged with timestamp):** `buyer profile logs profile creation with a timestamp in the audit trail`.

## STORY-015 — Audit Trail for User Actions
1. **Registration logged:** `POST /auth/signup logs a successful registration in the audit trail with the new user's id and a timestamp`.
2. **Password reset logged:** `POST /auth/password-reset/request and /confirm logs the password reset request in the audit trail for a registered email, with a timestamp`.
3. **Trust (all user actions, with timestamp):** `audit trail coverage records every user action, in order, each with a timestamp` — registration, login, logout, password reset requested and completed, favorite saved and removed, notification preferences updated, plus buyer profile created, tour requested and property shared (each covered in its own route test). Failed logins and invalid reset tokens are not logged as actions.
- **Fixed 2026-10-01:** login, logout, password-reset completion, favorites save/remove, and notification-preference updates were not being logged before today.

---

**Not in this list:** STORY-013 does not exist in `plan.json`, `progress.json`, or any commit. Check the portal backlog.
