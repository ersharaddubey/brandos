# Hi Strangers Stay: single-property MERN website (React + Tailwind CSS)

Premium black, gold and cream design built with **Tailwind CSS**. One property, one booking flow.

## Pages

| Route | What it shows |
|-------|---------------|
| `/` | Hero slider, booking bar, trust strip, story, rooms, experiences, **YouTube / Instagram videos**, **offers slider**, why us, gallery, reviews, nearby, FAQ, CTA |
| `/stay` | Property details, room cards, included items, extra stay content, how to reach, house rules, booking form (`#book`) |
| `/experiences` | Experiences, breakfast options, things to do |
| `/events` | Events page: bonfire nights, live music, movie nights, rides (edit in Admin → Site settings → Events) |
| `/gallery` | Photo gallery with lightbox |
| `/offers` | All live offers with copy-code cards |
| `/about` `/facilities` `/reviews` `/nearby` `/faq` `/contact` | Content pages. Contact is focused on address, directions, enquiry form and map. Reviews page shows Google reviews (top) then admin reviews (bottom). |
| `/booking` `/login` `/register` | Find booking, customer auth (prices unlock after login) |
| `/admin` | Admin panel (unchanged layout) |

Old links `/hotels`, `/hotels/:slug`, `/destinations`, `/dining`, `/wellness` redirect to the new pages.

## Setup

```bash
cp server/.env.example server/.env
npm run install:all
npm run seed          # property + 3 rooms + 3 SAMPLE offers + admin user
npm run dev:server    # http://localhost:5001
npm run dev:client    # http://localhost:5173
```

Admin: `admin@hotel.com` / `Admin@123`. `npm run seed` wipes existing data. If you already have data, skip it and
add offers in **Admin → Offers**; new settings fields get their defaults automatically.

## Edit content without code (Admin → Site settings)

* **Home page slider and announcement**: hero slides (`Image URL | Headline | Sub-line`), top offer bar, pop-up on/off
* **Videos**: YouTube links and Instagram reel/post links (one per line). The section appears on the home page once a link is added
* **Photo gallery**, **Experiences**, **Events** (`Title | When | Description | Image URL`), **Why stay with us**
* **Stay page content**: included items, extra text, how to reach
* **Extra content blocks**: `page | Heading | Text` adds a content card to `home, stay, about, experiences, gallery, offers, reviews, contact` (use `||` for a new paragraph)
* All older fields (about, facilities, reviews, FAQ, contact...) work as before

## Retention features

Announcement bar, offer pop-up (once per visit, after 20 s or on exit intent), offers slider with copy-code,
offer-code field in the booking form (saved in the booking's special requests), sticky Call / WhatsApp / Book bar on mobile.

## Notes

* Tailwind config: `client/tailwind.config.js`; global styles and button/input classes (`bt-*`, `inp`, `surface`): `client/src/index.css`
* The admin panel keeps its own stylesheet `client/src/admin/admin.css`, loaded only on `/admin`
* Sample photos are from Unsplash; replace them from the admin panel. Sample offers and room prices are placeholders.

* If your database already has settings, the new Events field gets its default lines automatically. To use the new Google Maps link, paste it in Admin → Site settings → Google Maps link.


## Gallery and Cloudinary image uploads

**Admin → Gallery** manages the Gallery page (and the photo strip on the home page):

* Upload many photos at once (drag and drop or choose files), or add one by pasting an image link
* Choose a size for each photo: **Auto (mixed), Small, Wide, Tall or Large**. "Auto" repeats a varied pattern, so a bulk upload never looks like a uniform grid
* Drag photos (or use the arrows) to change the order; add a caption; delete (also removes it from Cloudinary)
* A live layout preview shows how the page will look

Until you add photos there, the Gallery page shows the property and room photos.

### Connect Cloudinary (free plan is enough to start)

1. Sign up at cloudinary.com. On the **Dashboard** copy the Cloud name, API Key and API Secret
2. Put them in `server/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   CLOUDINARY_FOLDER=histay
   ```
   (or a single `CLOUDINARY_URL=cloudinary://key:secret@cloud_name`)
3. Run `cd server && npm install` (adds the `cloudinary` package) and restart the server

Every image upload in the admin (gallery, hotels, rooms, offers, hero image) then goes to Cloudinary and is served in the best size and format for each visitor. Without these variables images are saved in `server/uploads`, so local development still works. Photos already uploaded to `server/uploads` keep working; they are just not moved to Cloudinary.


## Popup behavior and visual theme

The welcome offer appears only on the home page, 5 seconds after entry, and is suppressed for 24 hours after it is shown. This prevents it reopening on route changes or repeatedly interrupting visitors. Turn it off any time in **Admin → Settings → Show the offer pop-up**. The popup has a subtle holographic rim that complements the existing liquid-glass hotel design.

## Start a separate Git branch for the theme changes

From the project root (`histay/`), run:

```bash
git switch -c feat/holographic-hotel-ui
git status
git add client/src/components/WelcomePopup.jsx client/src/index.css README.md
git commit -m "Add holographic hotel UI and prevent repeated welcome popup"
```

Keep `server/.env` out of Git and never commit Cloudinary API secrets. If credentials were included in a shared ZIP or repository, rotate the Cloudinary API secret in the Cloudinary dashboard.

## Admin updates (single property, uploads, videos, liquid glass)

* **Property** (was Hotels): only one hotel. There is no "Add hotel" or Delete; use Edit. Rooms attach to it automatically.
* **Photos are uploaded, not linked.** Property, rooms, offers, hero image, hero slides, experiences and events all use an upload box. A dummy image shows until a photo is uploaded.
* **Admin → Home videos**: one YouTube link and one Instagram link per line, with a "Link OK" check and "Add another".
* **Liquid glass theme**: refractive glass panels, bright specular edges, glossy buttons (website and admin).


## Customer account, food menu, coupons and invoices (new)

**Customer login -> `/account` (My account)**

* Profile (name, email, phone, editable) and quick stats
* All bookings in tabs: Upcoming, Past, Cancelled, All. Each shows reference, status, check-in to check-out dates, nights, guests, food ordered and the full bill
* Bookings made earlier with the same email also show up automatically
* **Download invoice** opens `/invoice/:id`: print / save as PDF, or download as a file
* Add or change food on an active booking, and cancel before check-in

**Food menu**

* Admin -> **Food menu**: add dishes (category, price, veg / non-veg, photo, sort order, availability)
* The Stay page shows the menu right below the rooms (`/stay#menu`). Logged-in guests add dishes with quantity buttons while booking. The bill updates live and the food is saved with the booking
* Existing database: run `npm run seed:food` (adds a sample menu only if the menu is empty; `--force` replaces it). `npm run seed` also adds it, but wipes everything

**Coupon codes now work**

* Booking form has a coupon box with an **Apply** button. The server checks the code and the discount is taken off the room charges, the total and taxes update immediately
* "Use offer" on the Offers page opens the Stay page and applies the code by itself when the guest is logged in
* Extra rules per offer (Admin -> Offers): minimum nights, check-in Monday to Thursday only, maximum discount in INR
* Everything is calculated again on the server when the booking is saved, so totals cannot be edited from the browser
* Bill formula: `total = room charges - coupon discount + food + tax`, where tax % (Admin -> Site settings) is charged on (room - discount + food)

New API: `GET /api/food`, `POST /api/offers/validate`, `GET /api/bookings/mine`, `GET /api/bookings/mine/:id`, `PUT /api/bookings/mine/:id/food`, `PATCH /api/bookings/mine/:id/cancel`, `PUT /api/auth/me`.
