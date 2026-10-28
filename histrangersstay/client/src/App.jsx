import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, Link, Navigate } from 'react-router-dom';
import { PropertyProvider } from './PropertyContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppFab from './components/WhatsAppFab';
import StickyCta from './components/StickyCta';
import WelcomePopup from './components/WelcomePopup';
import Spatial from './components/Spatial';
import Home from './pages/Home';
import Stay from './pages/Stay';
import Experiences from './pages/Experiences';
import GalleryPage from './pages/Gallery';
import InstagramGallery from './pages/InstagramGallery';
import YouTubeGallery from './pages/YouTubeGallery';
import Offers from './pages/Offers';
import About from './pages/About';
import Facilities from './pages/Facilities';
import Reviews from './pages/Reviews';
import Nearby from './pages/Nearby';
import Events from './pages/Events';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import ManageBooking from './pages/ManageBooking';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Invoice from './pages/Invoice';
import Cafe from './pages/Cafe';
import CafeBill from './pages/CafeBill';
import CheckIn from './pages/CheckIn';
import Leadership from './pages/Leadership';
import Volunteer from './pages/Volunteer';

// The admin panel (and its own stylesheet) only loads when /admin is opened
const AdminLogin = lazy(() => import('./admin/AdminLogin'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const HotelsAdmin = lazy(() => import('./admin/HotelsAdmin'));
const OffersAdmin = lazy(() => import('./admin/OffersAdmin'));
const BookingsAdmin = lazy(() => import('./admin/BookingsAdmin'));
const AdminSettings = lazy(() => import('./admin/AdminSettings'));
const GalleryAdmin = lazy(() => import('./admin/GalleryAdmin'));
const VideosAdmin = lazy(() => import('./admin/VideosAdmin'));
const ReviewsAdmin = lazy(() => import('./admin/ReviewsAdmin'));
const FoodAdmin = lazy(() => import('./admin/FoodAdmin'));
const CafeOrdersAdmin = lazy(() => import('./admin/CafeOrdersAdmin'));
const CafeQrAdmin = lazy(() => import('./admin/CafeQrAdmin'));
const BillingAdmin = lazy(() => import('./admin/BillingAdmin'));
const CheckInsAdmin = lazy(() => import('./admin/CheckInsAdmin'));
const VolunteersAdmin = lazy(() => import('./admin/VolunteersAdmin'));
const LocationsAdmin = lazy(() => import('./admin/LocationsAdmin'));
const TeamAdmin = lazy(() => import('./admin/TeamAdmin'));

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// Old /menu links open the cafe page, keeping things like ?cat=Breakfast
function RedirectKeepQuery({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function PublicLayout() {
  return (
    <PropertyProvider>
      <Navbar />
      <main className="min-h-[60vh]"><Outlet /></main>
      <Footer />
      <WhatsAppFab />
      <StickyCta />
      <WelcomePopup />
      <Spatial />
    </PropertyProvider>
  );
}

function NotFound() {
  return (
    <div className="wrap max-w-xl pb-32 pt-48 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-6xl">Page not found</h1>
      <p className="mt-4 text-ink/78">The page you are looking for has moved or does not exist.</p>
      <Link className="bt-dark mt-8" to="/">Back to home</Link>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-ink/68">Loading…</div>}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/stay" element={<Stay />} />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/events" element={<Events />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/instagram-gallery" element={<InstagramGallery />} />
            <Route path="/youtube-gallery" element={<YouTubeGallery />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/about" element={<About />} />
            <Route path="/facilities" element={<Facilities />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/nearby" element={<Nearby />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/booking" element={<ManageBooking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<Account />} />
            {/* The menu now lives inside the Cafe page, and locations inside Contact */}
            <Route path="/menu" element={<RedirectKeepQuery to="/cafe" />} />
            <Route path="/cafe" element={<Cafe />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/locations" element={<Navigate to="/contact#locations" replace />} />
            <Route path="/leadership" element={<Leadership />} />
            <Route path="/volunteer" element={<Volunteer />} />
            {/* Old multi-hotel links now point to the single property */}
            <Route path="/hotels" element={<Navigate to="/stay" replace />} />
            <Route path="/hotels/:slug" element={<Navigate to="/stay" replace />} />
            <Route path="/destinations" element={<Navigate to="/nearby" replace />} />
            <Route path="/dining" element={<Navigate to="/experiences" replace />} />
            <Route path="/wellness" element={<Navigate to="/experiences" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Printable invoice: standalone page without the site header and footer */}
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route path="/cafe-bill/:orderNo" element={<CafeBill />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="hotels" element={<HotelsAdmin />} />
            <Route path="rooms" element={<Navigate to="/admin/hotels" replace />} />
            <Route path="bookings" element={<BookingsAdmin />} />
            <Route path="offers" element={<OffersAdmin />} />
            <Route path="food" element={<FoodAdmin />} />
            <Route path="cafe" element={<CafeOrdersAdmin />} />
            <Route path="cafe-qr" element={<CafeQrAdmin />} />
            <Route path="billing" element={<BillingAdmin />} />
            <Route path="checkins" element={<CheckInsAdmin />} />
            <Route path="volunteers" element={<VolunteersAdmin />} />
            <Route path="locations" element={<LocationsAdmin />} />
            <Route path="team" element={<TeamAdmin />} />
            <Route path="gallery" element={<GalleryAdmin />} />
            <Route path="videos" element={<VideosAdmin />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
