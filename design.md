# AITinerary — Design System

Photo-led editorial travel app for the Philippines. Cream canvas, forest green, teal accents, oversized Playfair Display headlines, minimal chrome. The goal is a calm travel magazine you can tap, not a dashboard.

This document reflects the shipped Expo/React Native UI. When a token or component changes, update this file in the same change.

---

## 1. Source of truth

| File | Owns |
|---|---|
| `frontend/mobile/theme.ts` | Colors, fonts, radii, layout, shadows, photo URLs, destination picks, hero copy |
| `frontend/mobile/ui.tsx` | Typography variants and reusable primitives |
| `frontend/mobile/App.tsx` | Screens, state, API calls, screen-specific styles |

Rule of thumb: if a value could be reused on another screen, it belongs in `theme.ts`. If a block is used twice, it belongs in `ui.tsx`.

---

## 2. Color tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F3F1E7` | App background |
| `surface` | `#FFFFFF` | Cards, sheets, nav bar |
| `surfaceAlt` | `#F7F5EC` | Inputs, inset panels, reason rows |
| `surfaceMuted` | `#EDEBDF` | Image placeholders, progress track |
| `ink` | `#1C2B20` | Primary text and headings |
| `inkSoft` | `#526054` | Body copy |
| `muted` | `#8A9285` | Captions, placeholders, inactive nav |
| `line` | `#E3E0D3` | Default dividers and borders |
| `lineStrong` | `#D3D0C2` | Emphasized outlines, inactive choice dots |
| `forest` | `#2E4A33` | Primary buttons, active tabs, profile hero |
| `forestDeep` | `#1F3423` | Photo fallbacks, dark-on-light text |
| `teal` | `#156C61` | Weather, timing, transport, secondary accents |
| `tealSoft` | `#DDE9E2` | Transport card background, teal icon badges |
| `sage` | `#A7B7A0` | Activity budget segment |
| `sageSoft` | `#E8EDE2` | Empty-state icon tile, map wash |
| `clay` | `#C86F45` | Step labels, timeline dots, tertiary accent |
| `claySoft` | `#F4E3D8` | Clay icon badges |
| `sand` | `#E8D9BF` | Small warm highlights on dark photos |
| `cream` | `#EFEDE1` | CTA on photography, light brand marks |
| `white` | `#FFFFFF` | Text and icons on dark images |
| `danger` / `dangerSoft` | `#B4463A` / `#F8E9E6` | Inline errors |
| `warning` / `warningSoft` | `#B2762B` / `#FBF2E0` | Backup plans, risk badges |
| `overlay` | `rgba(18,30,21,0.55)` | Gradient scrim base |

Photography scrims use inline `rgba(18,30,21,…)` stops inside `LinearGradient`. That is the only place raw colors are acceptable.

Accent discipline: forest is the action color, teal is information, clay is a small editorial marker. Never use all three at equal weight in one block.

---

## 3. Typography

Fonts are loaded with `useFonts` from `@expo-google-fonts`.

- **UI:** Inter — 400 / 500 / 600 / 700 / 800
- **Editorial:** Playfair Display — 600 / 600 italic / 700

Use `AppText` with a variant. Do not set font sizes ad hoc for standard copy.

| Variant | Face | Size / line | Use |
|---|---|---|---|
| `display` | Playfair 600 | 38 / 44 | Screen titles, onboarding, result destination |
| `hero` | Playfair 600 | 34 / 40 | Featured route headline |
| `h1` | Playfair 600 | 30 / 36 | Major section titles, planner title |
| `h2` | Playfair 600 | 24 / 30 | Card/section titles |
| `h3` | Inter 600 | 17 / 23 | Item titles, row headings |
| `body` | Inter 400 | 15 / 23 | Primary body copy |
| `bodySm` | Inter 400 | 13.5 / 21 | Secondary body copy |
| `caption` | Inter 500 | 12 / 17 | Metadata, hints, inactive labels |
| `label` | Inter 600 | 12 / 16 | Input labels, compact buttons |
| `eyebrow` | Inter 600 | 10.5 / 14, 1.8 tracking, uppercase | Kickers and step labels |
| `button` | Inter 600 | 15 / 20 | Button text |

Headline rule: one serif headline per block. Supporting copy stays Inter. Avoid all-caps serif.

---

## 4. Layout, shape, elevation

- Screen padding: `20`
- Max content width: `480` (centered on web/tablet)
- Bottom nav reserve: `132` of scroll padding
- Radii: `sm 12`, `md 16`, `lg 22`, `xl 28`, `pill 999`
- Shadows: `shadows.soft` for cards, `shadows.lifted` for overlays, `shadows.nav` for the tab bar
- Borders are 1px and low contrast. Prefer a rule or spacing over a heavy box.
- Photo blocks use `radius.xl` and a bottom-heavy gradient scrim.

Breakpoints: the app is mobile-first. On web it renders as a centered 480px column, so layouts must survive at 430px wide.

---

## 5. Photography

Remote Unsplash images are defined in `theme.ts`:

- `photoForDestination(destination, region)` — hero and saved thumbnails
- `photoForTheme(theme, index)` — day cards
- `smallPhoto(uri)` — swaps `w=1200` for `w=700` for thumbnails

Rules:
- Photos carry the emotion; keep UI chrome light around them.
- Always pair a photo with a gradient scrim before white text.
- Use 16:10 or taller for hero blocks; do not letterbox.
- Do not add emoji or illustrated icons on top of photography.

### Live weather

Hero weather uses Open-Meteo current conditions for the selected destination:

- Coordinates live on each entry in `destinationPicks`.
- The app fetches `current=temperature_2m,weather_code` and maps WMO codes to a short label plus an Ionicon.
- `fallbackWeather` keeps the hero useful if the request fails or is offline.
- Attribution ("Live weather by Open-Meteo") appears at the bottom of the Plan screen.

---

## 6. Components (`ui.tsx`)

### `AppText`
Text with a variant and optional style override. Accepts all `TextProps`.

### `Button`
`primary` (forest fill), `light` (white fill, forest text), `secondary` (transparent, 1px border), `ghost` (text-only).
Props: `label`, `onPress`, `icon`, `loading`, `disabled`, `style`. Minimum height 54 (ghost 44). Includes `accessibilityRole="button"` and an accessible label.

### `Card`
White surface, 1px `line` border, `lg` radius, soft shadow, 20px padding by default. Use `padded={false}` when the card contains edge-to-edge photography.

### `Chip`
Pill toggle. Available for compact filters. Filled forest when active. The smart planner intentionally does **not** use chips — use the ledger pattern instead.

### `SectionHeader`
Eyebrow + serif title + optional meta/action. Aligns to the bottom edge.

### `Field`
Label + control + optional hint. Used in auth and other conventional forms.

### `MetaItem`
Inline icon + caption. `light` switches to white-on-photo styling.

### `IconBadge`
Tinted square icon tile. Tones: `forest`, `teal`, `clay`, `sand`.

### `ProgressBar`
6px track, rounded, percentage width fill. Used for budget segments.

### `EmptyState`
Icon tile, title, supporting copy, optional action button. Centered and narrow.

### `BottomNav`
Floating white pill with four tabs: Plan, Saved, Insights, Profile. Active tab gets a forest icon tile and forest label. Fixed to the bottom, max width 480, with safe bottom spacing.

---

## 7. Screen patterns

1. **Onboarding** — 3 full-bleed photo slides, progress dots, serif headline, light CTA, skip link.
2. **Auth** — photo hero with scrim, brand row, feature tags, overlapping white form card (sign in / sign up / guest).
3. **Plan home** — brand bar, "Where to next?" intro, horizontal destination rail, featured photo hero with weather/date meta and "Start planning" CTA, smart planner, chat planner, feature list.
4. **Loading** — photo card with spinner, editorial status copy.
5. **Result** — photo hero with save/share, overlapping summary card, 4 stat tiles, budget snapshot with progress bars, "Why this works" checklist, day-by-day photo cards and stop timelines, route map card.
6. **Saved** — library header, count/value pills, thumbnail rows, empty state.
7. **Insights** — editorial photo hero, three capability rows, monthly tip card.
8. **Profile** — forest hero with avatar, 3 compact stat tiles, preferences, recent plans, sign out.
9. **Route map** — overview/route/stops segmented control, native `MapView` on iOS/Android, stylized CSS map on web, selected-stop details, open-in-maps and share actions.

### Smart planner (distinctive form pattern)

A flat numbered ledger, not a stack of inputs:

- Header: eyebrow, serif title ("Say it simply."), one-line promise, "2 min" pill.
- `01 — Where`: oversized serif destination input + small region field, underline only.
- `02 — Time & spend`: two large serif numerals (days, budget), vertical rule between, month inline.
- `03 — Style`: plain checkbox rows for vibes, plain radio rows for pace and travelers. No pill backgrounds.
- `04 — Notes`: single underlined multiline field.
- Full-width primary CTA.

Inputs use bottom borders and transparent backgrounds. Labels are captions under the value, not above it.

State rule: selected vibes live in `interests` and are sent to the API as `interests`. Notes remain free text and must not be used to encode selections.

---

## 8. Interaction and accessibility

- Every interactive view is a `TouchableOpacity` with `accessibilityRole` (`button`, `checkbox`, `radio`) and an appropriate state (`checked`, `selected`).
- Buttons expose `accessibilityLabel` matching the visible label.
- Tap targets: 44px minimum height. The visual chip may be smaller than its hit area.
- Scroll-to-section uses measured `onLayout` offsets (`formYRef`, `mapYRef`) and `scrollRef.scrollTo`. Preserve this when moving blocks.
- Map preview opens the platform maps app via `Linking`; share uses React Native `Share`.
- Web and native must both render. Guard native-only modules (`react-native-maps`) behind `Platform.OS !== 'web'`.
- Test at 430×932 with a full flow: onboarding → auth → generate → save → saved → reopen → map.

---

## 9. Persistence

Local state is persisted with `@react-native-async-storage/async-storage` (localStorage on web). The app hydrates before first paint, so returning users never flash onboarding.

| Key | Stores |
|---|---|
| `@aitinerary/saved-trips/v1` | Array of full itinerary objects plus `savedAt` |
| `@aitinerary/session/v1` | `{ authenticated, name?, email?, guest?, token? }` |
| `@aitinerary/onboarding-seen/v1` | `"true"` once onboarding is completed or skipped |

Rules:
- Saved trips are stored as the complete itinerary, not an id, so saved rows can reopen offline/local state without a backend.
- Validate on load: keep only entries with a `days` array. Never trust the stored shape.
- Signing out removes the session key but keeps saved trips.
- Guest mode keeps trips in AsyncStorage. Signed-in users keep trips and sessions in the backend (SQLite) via bearer tokens.
- Passwords are never stored in the client; the backend stores only PBKDF2 password hashes.

---

## 10. Icons and copy

- Icons: `@expo/vector-icons` Ionicons only. Outline icons in body UI, filled variants for active navigation.
- Sizes: 11–14 metadata, 18–20 actions, 26 empty states.
- No emoji anywhere in the UI.
- Voice: short, warm, specific. Avoid hype and generic AI language.
- Numbers: peso formatting via `formatPeso`, thousands separators via `formatNumber`.
- Capitalization: sentence case for headings and labels, uppercase only for eyebrows and step markers.

---

## 11. Adding a screen

1. Compose with `AppText`, `Card`, `Button`, and the other primitives.
2. Use tokens from `theme.ts`; add a new token only if it is genuinely reusable.
3. Put screen-specific layout in `App.tsx` styles.
4. Add the screen to the tab switch or render function without duplicating API/state logic.
5. Cover loading, empty, error, and long-content states.
6. Verify typecheck, web export, and the 430px browser flow.

---

## 11.5 Maps

The route map is a real map on both platforms:

- **Web:** Leaflet with CARTO light tiles (OpenStreetMap data) by default; Google Maps JavaScript API when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set and the backend reports Google enabled.
- **Native:** `react-native-maps` with the platform default provider.
- Markers are numbered by stop order and colored by category (food = clay, outdoor = teal, else forest). The selected stop gets a larger clay pin and the map pans to it.
- Route mode draws a dashed polyline connecting stops in day order.
- Map modes: `overview`, `route`, `stops`. The selected stop drives the detail panel (name, area, timing, open-in-maps, share).

Coordinates come from `backend/regions.py` stop profiles and the generated itinerary; the frontend falls back to a small deterministic ring around the destination center when a stop has no coordinates.

---

## 11.6 Testing

- Backend: `python -m unittest tests.test_backend` (uses `.venv313` which has `httpx`). Covers health, maps config, trip generation coordinates, chat planning, region snapshots, and stop profile coordinates.
- Frontend: `npm run typecheck` (TypeScript). Web export smoke test via `npx expo export --platform web`.
- Manual browser flow: onboarding → auth → generate → save → saved → reopen → map at 430×932.

---

## 12. Known gaps

- Auth sessions are bearer tokens in SQLite; production should move to hashed/rotating tokens and a real user database.
- Weather is current conditions only, not a forecast for the travel month.
- Native map still uses the platform default provider; Google Maps on native needs an API key in `app.json`.
- Japan and Singapore are scaffolded in the backend only; no region data or UI yet.
