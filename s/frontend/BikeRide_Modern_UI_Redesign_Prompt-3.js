BikeRide — Modern Ride-Sharing UI Redesign Prompt

You are working on my existing BikeRide full-stack ride-sharing application.

The project already has a working React/Vite frontend and Node.js/Express/PostgreSQL/PostGIS backend with authentication, rides, bookings, geographic matching, maps and Socket.IO functionality.

IMPORTANT RULE

Do NOT rewrite or break the existing backend.

Do NOT remove existing APIs, routes, business logic, authentication, database logic, Socket.IO functionality, PostGIS functionality, booking logic or existing features.

Your primary task is to modernize and redesign the frontend UI/UX while preserving the existing functionality.

First inspect the existing project structure and understand the current components, pages, API calls and state management.

Then incrementally improve the UI.

1. DESIGN DIRECTION

Create a modern mobility/ride-sharing UI inspired by the usability patterns of products such as BlaBlaCar and Uber, but DO NOT copy their branding, logo, exact layout or proprietary visual design.

The BikeRide application should have its own visual identity.

Visual style:
- Modern
- Clean
- Premium
- Minimal
- Mobile-first
- Professional
- Easy to scan
- Map-centric
- Smooth interactions
- Strong visual hierarchy
- Plenty of whitespace
- Rounded cards
- Soft shadows
- Subtle animations

Suggested colors:
Primary: #0F766E
Background: #F8FAFC
Card: #FFFFFF
Primary text: #0F172A
Secondary text: #64748B
Success: #16A34A
Warning: #F59E0B
Error: #DC2626

Do not overuse colors.

2. MAIN HOME / SEARCH EXPERIENCE

Redesign the main ride-search page into a map-first experience.

Desktop:
LEFT SIDE = Search / filters / ride information
RIGHT SIDE = Large interactive map

Mobile:
Search card
↓
Map
↓
Ride cards

Make the layout fully responsive.

3. LOCATION AUTOCOMPLETE

Upgrade pickup and destination fields.

When the user clicks the pickup field, provide:
- Current location
- Search places
- Recent locations
- Nearby locations
- Location suggestions

Typing a place should show autocomplete suggestions.

Selecting a location must automatically populate the form.

Do not require users to manually type latitude and longitude.

Use the existing location/geographic functionality where possible.

4. CURRENT USER LOCATION

Use browser geolocation where appropriate and permitted.

Add:
"Use my current location"

When selected:
- Get the user's current coordinates.
- Center the map on the user.
- Show a current-location marker.
- Reverse geocode the coordinates into a readable location.
- Automatically populate the pickup field.

Handle permission denied and unavailable location gracefully.

Do not repeatedly request location permission.

5. MAP EXPERIENCE

Make the map a major part of the application.

Show:
- Current user
- Available rides
- Pickup location
- Destination
- Route
- Nearby ride markers
- Bike markers
- Car markers
- Selected ride marker
- User/driver markers where appropriate

For bike rides use a bike marker/icon.
For car rides use a car marker/icon.

Create a visual distinction between available rides and the currently selected ride.

6. DOTTED / ROUTE EFFECT

Create a modern route visualization.

Use dashed/dotted route effects where appropriate.

The route should visually connect pickup and destination.

Do not make the map visually cluttered.

7. NEARBY USERS / RIDES

Show relevant nearby ride markers on the map.

Use geographic distance from the existing backend/PostGIS functionality when available.

Do not expose private user information.

Only display information that the current user is authorized to see.

Add indicators such as:
"4 rides within 3 km"
"8 rides along your route"
"Best match near you"

8. MODERN RIDE CARD

Redesign the existing ride cards.

Each card should clearly show:
- Driver profile/avatar
- Driver name
- Rating
- Verification status
- Vehicle
- Vehicle type
- Pickup
- Destination
- Departure time
- Available seats
- Price
- Distance from current user
- View ride button

Use a clean visual route between pickup and destination.

When a ride card is selected:
- Highlight its map marker.
- Center/focus the map on that ride.
- Highlight its route.
- Add a subtle animation.

9. MAP + CARD INTERACTION

Create two-way interaction.

When user selects a ride card:
CARD → MAP
The map focuses on that ride.

When user clicks a map marker:
MAP → CARD
The corresponding ride card becomes selected/highlighted.

This should feel like a modern mobility application.

10. LIST / MAP TOGGLE

Add:
[ List ] [ Map ]

Users should be able to switch between:
1. List view
2. Map view
3. Combined map + list view on desktop

Remember mobile responsiveness.

11. RIDE DETAILS PAGE

Redesign the Ride Details page.

Structure:
- Back button
- Ride route
- Large map
- Driver profile
- Vehicle information
- Pickup
- Destination
- Departure time
- Available seats
- Price
- Ride preferences
- Safety information
- Primary CTA: Request Seat

On mobile, make the main CTA sticky at the bottom.

12. DRIVER PROFILE UI

Create a modern trust-oriented profile section.

Show:
- Avatar
- Driver name
- Rating
- Verified badge
- Number of rides
- Basic vehicle information
- Reviews

Keep it clean and trustworthy.

13. DASHBOARD REDESIGN

The dashboard should NOT look like a traditional admin panel.

Create a modern mobility dashboard.

Include:
- Greeting
- Find a ride section
- Upcoming ride
- Quick actions
- Nearby rides
- Ride statistics where useful

Quick actions:
[ Find a ride ]
[ Offer a ride ]

14. CREATE RIDE PAGE

Modernize the Create Ride form.

Use a clean multi-step or sectioned form.

Suggested sections:
1. Route
2. Date & time
3. Vehicle
4. Seats
5. Price
6. Preferences
7. Confirmation

Make location fields prominent.

Use the map alongside the form on desktop.

Desktop:
FORM | MAP

Mobile:
FORM
↓
MAP

Show route preview after pickup and destination are selected.

15. VEHICLE UI

Vehicle selection should be visual.

Use cards for:
- Bike
- Car

Show vehicle details and selected state.

16. SEARCH FILTERS

Add modern filters:
- Departure time
- Price
- Seats
- Vehicle type
- Distance
- Rating
- Pickup proximity
- Destination proximity

Use a filter drawer/modal on mobile.
Use a side panel on desktop.

17. EMPTY / LOADING / ERROR STATES

Create polished states.

Loading:
- Skeleton cards
- Loading map
- Searching for rides...

Empty:
"No rides found"
"Try changing your pickup, destination or date."

Error:
"Something went wrong"
[ Try again ]

18. MICRO-ANIMATIONS

Use subtle animations only:
- Card hover
- Button hover
- Map marker pulse
- Route animation
- Smooth map focus
- Slide-in search panel
- Skeleton loading
- Selected ride elevation
- Modal transitions
- Location pin animation

Avoid excessive animations.

19. RESPONSIVE DESIGN

This is extremely important.

Desktop:
- Large map
- Side search panel
- Ride cards
- Multi-column layouts

Tablet:
- Adaptive map/card layout

Mobile:
- Bottom navigation where appropriate
- Full-width cards
- Sticky CTA
- Bottom-sheet style filters
- Map optimized for touch
- Large touch targets
- No horizontal scrolling

Test:
320px
375px
390px
768px
1024px
1440px+

20. NAVIGATION

Modernize the navigation.

Desktop:
Logo | Find Ride | Offer Ride | My Rides | Notifications | Profile

Mobile:
Home | Search | My Rides | Notifications | Profile

Use icons consistently.
Keep navigation simple.

21. DESIGN SYSTEM

Create reusable UI components instead of repeating styles.

Examples:
- Button
- Input
- LocationInput
- RideCard
- DriverCard
- VehicleCard
- MapMarker
- MapPanel
- SearchPanel
- FilterPanel
- StatusBadge
- Rating
- EmptyState
- LoadingSkeleton
- BottomSheet
- SectionHeader

Keep styling consistent across the application.

22. IMPORTANT EXISTING TECHNOLOGY

Continue using the existing project technology where practical:
- React
- Vite
- Ant Design
- React Router
- Axios
- React Leaflet / Leaflet
- Socket.IO client
- Existing API layer
- Existing authentication
- Existing backend

Do not unnecessarily introduce another UI framework.

Do not replace working architecture just for the redesign.

If Ant Design components are already being used, customize them to match the new BikeRide design rather than blindly using default Ant Design appearance.

23. DO NOT BREAK FUNCTIONALITY

Before changing a component, understand:
- Existing API calls
- Props
- State
- Context
- Routing
- Authentication
- Form submission
- Validation
- Map functionality
- Socket.IO functionality

The UI redesign must preserve all existing functionality.

Do not replace working API calls with mock data.
Do not hardcode rides.
Do not hardcode users.
Do not remove existing validation.
Do not remove authentication.
Do not remove authorization.
Do not remove existing pages.

24. PERFORMANCE

The map can contain many markers.

Avoid unnecessary React re-renders.

Use appropriate:
- Memoization
- Marker clustering where necessary
- Lazy loading
- Debounced location search
- Efficient state updates

Do not render thousands of unnecessary DOM elements.

25. FINAL USER EXPERIENCE

The final application should feel like:
"Uber/BlaBlaCar-style usability + BikeRide's own identity."

The key flow should be:

User opens BikeRide
↓
Current location detected
↓
Pickup automatically populated
↓
User selects destination using autocomplete
↓
Map displays route
↓
Nearby rides appear
↓
User sees ride cards + map
↓
User selects a ride
↓
Map focuses on the selected ride
↓
User opens Ride Details
↓
Reviews driver and vehicle
↓
Requests a seat
↓
Booking flow continues using the existing backend

26. IMPLEMENTATION PROCESS

Do NOT modify everything at once.

First:
1. Inspect the existing frontend.
2. Identify reusable components.
3. Identify existing API integrations.
4. Identify existing map functionality.
5. Identify existing styles.
6. Create a reusable design system.
7. Redesign Home/Search.
8. Redesign Ride Card.
9. Redesign Ride Details.
10. Redesign Dashboard.
11. Redesign Create Ride.
12. Redesign Profile/Vehicle pages.
13. Improve responsive behavior.
14. Test all existing functionality.
15. Fix UI regressions.

After each major page, ensure the existing functionality still works.

27. MOST IMPORTANT VISUAL GOAL

The application should NOT look like:
"An Ant Design CRUD project."

It should look like:
"A production-ready modern ride-sharing platform."

Prioritize:
MAP + LOCATION + RIDES + PEOPLE + ROUTES

These are the core visual elements of BikeRide.

Make the UI visually impressive enough for a professional project demonstration while keeping it practical and usable.
