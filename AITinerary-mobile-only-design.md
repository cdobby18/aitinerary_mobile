# AITinerary — Mobile App UI/UX Design Specification

> **Current platform:** Android and iOS using React Native / Expo
> **Future roadmap:** Website / web dashboard (not part of the current MVP)
> **Visual reference:** Approved mobile-only AITinerary home screen concept
> **Design direction:** Premium, friendly, tropical, modern, and practical.

## 1. Product vision

AITinerary is an AI-powered travel companion that helps travelers discover destinations, create personalized itineraries, understand routes and weather risks, manage trip budgets, save trips, and ask for travel advice.

The mobile app is the primary product. Design every current screen for a phone first. Do not build a desktop website or web dashboard in this phase.

### Core user journey

1. Discover or search for a destination.
2. Create a trip brief with dates, travelers, budget, pace, and interests.
3. Generate a structured itinerary.
4. Review day-by-day activities, transport, costs, and weather-aware alternatives.
5. View destinations and routes on a map.
6. Ask the AI assistant to explain or revise the plan.
7. Save the trip and access it while traveling.

### Design principles

- Mobile-first and easy to use while traveling.
- Visual destination discovery with high-quality photography.
- Clear distinction between verified facts, estimates, and AI suggestions.
- Practical itineraries with realistic timing, routes, and budgets.
- AI as a helpful companion, not the entire application.
- Progressive disclosure: show essentials first, advanced options when needed.

## 2. Platform scope

### In scope now
- Android and iOS mobile applications.
- React Native with Expo.
- Mobile navigation and layouts for different phone sizes.
- Backend API integration.
- Maps, weather, saved trips, and AI assistant.

### Out of scope for the current MVP
- Desktop website.
- Desktop dashboard.
- Separate web application.
- Desktop-specific navigation or layouts.

A website may be added in the future and can reuse the product's design tokens and API contracts. Do not add web-specific components or dependencies just to prepare for it.

**Implementation rule:** Use React Native primitives and Expo-compatible libraries. Avoid web-only CSS, DOM elements, and browser APIs. Keep presentation, API access, and business logic separated.

## 3. Visual identity

Use the approved bright, welcoming travel aesthetic inspired by tropical destinations.

### Color palette

| Token | Suggested value | Usage |
|---|---|---|
| Deep teal | `#123C3A` | Headings and strong text |
| Primary teal | `#0D9C9A` | Primary actions and active navigation |
| Soft teal | `#DDF4F0` | Highlight surfaces |
| Coral | `#F0785A` | Small accents |
| Cream | `#FFF9F0` | Warm backgrounds |
| App background | `#F8FAF9` | Main screen background |
| White | `#FFFFFF` | Cards and sheets |
| Ink | `#172B3A` | Main text |
| Secondary text | `#687784` | Supporting text |
| Muted text | `#9AA5AC` | Metadata |
| Success | `#25865A` | Upcoming / confirmed states |
| Warning | `#B7791F` | Weather and schedule warnings |
| Danger | `#B94A48` | Critical alerts |

Teal is the main product color. Use coral sparingly.

### Typography and surfaces
- Use a clean sans-serif such as Inter where supported.
- Main headings should be bold and prominent.
- Use consistent text styles for section headings, body text, and metadata.
- Main cards: 18–24px radius.
- Buttons: 14–18px radius or pill shape.
- Search fields: pill-shaped.
- Use subtle borders and soft shadows.
- Follow an 8px spacing scale and respect device safe areas.

### Photography
- Use high-quality destination photography for hero areas and destination cards.
- Keep text readable over images using gradients or overlays.
- Avoid decorative imagery in every itinerary row; practical details should remain scannable.

## 4. Mobile navigation

Use a four-item bottom tab bar:

1. **Home** — dashboard, upcoming trip, popular destinations, assistant entry point.
2. **My Trips** — saved, upcoming, ongoing, and past trips.
3. **Explore** — destination discovery and search.
4. **Profile** — account, preferences, and settings.

Keep the bottom tab bar visible on primary screens. Hide it during focused flows when it would distract, such as full-screen map selection. Use teal for the active tab. The AI Assistant is accessible from Home and relevant trip screens; it does not need its own bottom tab.

## 5. Home screen

Follow the approved mobile reference concept.

### Header
- AITinerary logo and wordmark.
- Notification button on the right.
- Unread indicator when notifications exist.
- Respect the device status bar and safe area.

### Hero section
Use a scenic destination image with:

**Headline:** "Plan Smarter. Travel Better."
**Supporting text:** "Your AI travel companion for unforgettable journeys."

Include a prominent destination search field:
- Placeholder: `Where do you want to go?`
- Search icon and submit action.
- Destination suggestions and recent searches when supported.

On smaller phones, reduce hero height instead of allowing the search field to obscure content.

### Quick actions
Show four action tiles:
- Plan Trip
- Explore
- Map
- AI Assistant

Each tile needs an icon, short label, soft tinted background, accessible touch target, and a working navigation/action.

### Upcoming trip
Show the next upcoming trip:
- Destination image.
- Trip name, e.g. `Cebu Adventure`.
- Date range and duration.
- Destination.
- Status chip such as Upcoming.
- Tap to open itinerary.
- Optional View All link to My Trips.

If no trip exists, show a friendly empty state with a **Plan your first trip** action.

### Popular destinations
Use a horizontally scrollable row of destination cards. Each card includes an image, destination name, optional short descriptor, and navigation to destination details. Use "Explore Destinations" instead of "Popular Destinations" if the ordering is curated rather than based on actual popularity.

### AI assistant promotional card
Use a soft teal card:

**"Need help planning?"**
"Ask me anything about your trip!"

CTA: **Chat with AI Assistant**

Open the assistant with relevant trip context when available.

## 6. Plan Trip flow

Use a guided mobile flow rather than one long form.

### Step 1 — Destination
- Destination search.
- Supported region suggestions.
- Recently viewed destinations where available.

### Step 2 — Dates and travelers
- Start and end dates.
- Number of adults and children.
- Optional traveler details that affect planning.

### Step 3 — Preferences
- Budget and currency.
- Pace: Relaxed, Balanced, or Packed.
- Interests: beaches, food, culture, nature, shopping, family activities, adventure.
- Accessibility or special requirements.
- Additional notes.

### Step 4 — Review
Show a compact trip summary and allow editing.

### Step 5 — Generate
CTA: **Generate Itinerary**. Show honest loading/progress feedback. Do not claim that external services were checked unless they were actually called.

## 7. Itinerary screen

The itinerary is a core screen.

### Trip summary
Show trip name, destination, date range, duration, travelers, estimated budget, pace, and supported save/share actions.

### Day selector
Use horizontally scrollable day chips (Day 1, Day 2, etc.) with a clear selected state.

### Activity cards
Each stop may show:
- Time or suggested time window.
- Activity / destination name and category.
- Thumbnail when useful.
- Short description.
- Estimated duration.
- Opening hours when verified.
- Entrance fee or estimated cost with currency.
- Location / area.
- Transport to the next stop.
- Insider tip when available.

Keep cards scannable. Put additional information in a stop-detail screen.

### Weather and backup plans
When forecast data is available, show the day's weather summary. If there is a risk:
- Explain the risk.
- Identify affected activities.
- Offer a practical backup plan.
- Label forecast-based information versus seasonal estimates.

If live weather is unavailable, say so clearly.

### Budget breakdown
Show supported categories such as transport, activities, food, and accommodation, plus the total and currency. Label estimates. Never present generated prices as confirmed booking prices.

## 8. Map screen

The map should help users understand the location and sequence of itinerary stops.

- Display destination pins.
- Show route sequence for the selected day.
- Allow pin selection to open stop details.
- Request current-location permission only when needed.
- Provide a route/list toggle.
- Keep map controls uncluttered.

Where supported, show travel mode, estimated time, distance, transport notes, and alternatives. Do not invent travel times, distances, or live traffic. Label estimates and identify sources where practical.

If location permission is denied, keep manual map use available. Provide a useful fallback if map or routing services fail.

## 9. Explore screen

Include:
- Destination search.
- Featured destinations.
- Destination categories.
- Curated travel collections.
- Recently viewed places.
- Region filters.

Possible categories: Beaches & Islands, Nature & Adventure, Food & Culture, City Breaks, and Family-Friendly. Keep search prominent and filters easy to use on a phone.

## 10. AI Travel Assistant

### Entry points
- Home quick action.
- Home assistant promotional card.
- Itinerary screen.
- Stop detail screen.

### Chat interface
- User and assistant message bubbles.
- Typing/loading indicator.
- Composer fixed above the keyboard.
- Suggested prompt chips when the conversation is empty.
- Structured itinerary previews when useful.

Suggested prompts:
- "Plan a 3-day trip within my budget."
- "Make tomorrow less tiring."
- "Find indoor alternatives if it rains."
- "Explain how to get to this destination."
- "Replace this activity with something family-friendly."

### Assistant behavior
The assistant can understand preferences, answer destination questions using available curated information, suggest itinerary changes, explain budget/schedule trade-offs, and use supported tools such as destination lookup, weather, or maps.

For itinerary changes:
1. Explain the proposed change.
2. Show affected stops, schedule, and budget.
3. Ask for confirmation when applying the change is consequential.
4. Update the itinerary only after confirmation.

Never invent opening hours, entrance fees, availability, or real-time conditions.

## 11. My Trips screen

Organize trips into:
- Upcoming.
- Ongoing.
- Past.
- Saved drafts, if supported.

Each trip card shows cover image, trip name, destination, dates, duration, status, and an action to open details. Include useful empty states for each category.

## 12. Profile and settings

Include only implemented settings:
- User profile.
- Travel preferences.
- Preferred currency.
- Preferred language, if supported.
- Measurement preferences, if supported.
- Notification settings.
- Privacy and location permission information.
- Sign out.

## 13. Reusable React Native components

Suggested component inventory:

```text
components/
├── layout/
│   ├── ScreenContainer
│   ├── AppHeader
│   └── BottomTabBar
├── home/
│   ├── HeroSearch
│   ├── QuickActionTile
│   ├── UpcomingTripCard
│   ├── DestinationCarousel
│   └── AssistantPromoCard
├── trip/
│   ├── TripBriefStep
│   ├── TripSummaryCard
│   ├── DaySelector
│   ├── ItineraryStopCard
│   ├── TransportLegCard
│   ├── WeatherRiskCard
│   ├── BackupPlanCard
│   └── BudgetBreakdown
├── map/
│   ├── TripMap
│   ├── MapStopMarker
│   └── RouteSummary
├── assistant/
│   ├── AssistantChatScreen
│   ├── ChatMessageBubble
│   ├── SuggestedPromptChip
│   └── ChatComposer
├── destinations/
│   ├── DestinationCard
│   └── DestinationSearch
└── common/
    ├── PrimaryButton
    ├── StatusChip
    ├── LoadingState
    ├── EmptyState
    └── ErrorState
```

Use TypeScript interfaces for props and API response models. Avoid duplicating business logic in UI components.

## 14. Adaptation to phone sizes

### Small phones
- Single-column layout.
- Reduce decorative hero height.
- Keep primary actions visible.
- Avoid fixed widths that cause horizontal overflow.
- Use compact cards and scrollable content.

### Larger phones
- Use more generous spacing.
- Allow wider destination cards.
- Keep text line lengths readable.

Prioritize portrait mode. Core flows must not depend on landscape orientation.

## 15. Accessibility and usability

- Accessible labels for icon-only controls.
- Readable contrast and dynamic font scaling.
- Touch targets approximately 44×44pt or larger.
- Do not rely on color alone for status or risk.
- Clear form labels and validation messages.
- Predictable keyboard behavior.
- Accessible loading and error announcements.
- Provide a list alternative for map information.

## 16. States to design

- First launch / onboarding.
- No saved trips or upcoming trips.
- Destination search with no results.
- Unsupported destination.
- Invalid date range.
- Trip generation loading and failure.
- Partial weather or map provider failure.
- AI model unavailable.
- Network offline.
- Location permission denied.
- Weather warning and no-warning itinerary.
- Saved trip and unsaved changes.
- Assistant loading, empty conversation, and response error.

Communicate limitations honestly. Preserve access to saved trip information offline where the current implementation supports it.

## 17. Design acceptance criteria

- The current product is a mobile app for Android and iOS.
- No desktop website or dashboard is added to the MVP.
- Home follows the approved mobile visual direction.
- Bottom navigation contains Home, My Trips, Explore, and Profile.
- Users can create trips through a guided flow.
- Itinerary screens show day-by-day plans and practical travel details.
- Map and list alternatives are available.
- Weather risks include backup plans when supported.
- The AI assistant is accessible from relevant screens.
- AI-proposed itinerary changes can be reviewed before applying.
- Costs, opening hours, and travel estimates are labeled accurately.
- Loading, empty, offline, and provider-error states are handled.
- Existing backend contracts and working functionality are preserved unless a change is explicitly required.

## 18. Instructions for a coding agent

Before editing:
1. Inspect the current repository, Expo app structure, navigation, screens, and shared components.
2. Review existing design tokens and backend/API contracts.
3. Identify implemented features versus placeholders.
4. Compare the current Home screen with the approved mobile reference.

During implementation:
- Treat this document and the approved mobile mockup as the UI source of truth.
- Implement mobile screens only using React Native / Expo.
- Do not create a website, desktop dashboard, or web-specific layout.
- Preserve existing API contracts unless a change is necessary and documented.
- Reuse working functionality and integrations.
- Do not invent endpoints, data fields, provider results, or booking availability.
- Keep UI, API access, and AI orchestration separated.
- Use reusable, typed components.
- Implement and verify one screen or flow at a time.

After implementation:
1. Run TypeScript checks, linting, and existing tests.
2. Test on Android and iOS simulators or devices where available.
3. Verify all bottom navigation destinations.
4. Test trip creation and itinerary viewing.
5. Test map permissions and fallback behavior.
6. Test AI assistant loading, errors, and confirmation flows.
7. Check small and large phone layouts.
8. Report completed work, tests run, and remaining gaps.

**Primary instruction:** Build AITinerary as a polished mobile travel app inspired by the approved mobile reference. The website is a future roadmap item and must not be included in the current implementation.
