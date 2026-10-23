#!/usr/bin/env python3
"""Hooks the new features (web check-in, cafe, billing, locations, leadership, volunteer form) into the existing project.
Run from the project root (the folder that has client/ and server/). Safe to run twice."""
import re, sys, pathlib

root = pathlib.Path('.')
problems = []

def patch(path, label, anchor, new, after=True, regex=False, marker=None):
    p = root / path
    if not p.exists():
        problems.append(f'{path}: file not found'); return
    s = p.read_text()
    if (marker or new.strip().splitlines()[0].strip()) in s:
        print(f'= {path}: {label} already done'); return
    if regex:
        m = re.search(anchor, s)
        if not m: problems.append(f'{path}: could not find place for "{label}"'); return
        i = m.end() if after else m.start()
    else:
        i = s.find(anchor)
        if i < 0: problems.append(f'{path}: could not find place for "{label}"'); return
        i = i + len(anchor) if after else i
    p.write_text(s[:i] + new + s[i:])
    print(f'+ {path}: {label}')

# 1. server routes
patch('server/server.js', 'new API routes', r"app\.use\('/api/reviews'[^\n]*\n",
"""app.use('/api/locations', require('./routes/locations'));
app.use('/api/team', require('./routes/team'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/cafe', require('./routes/cafe'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/billing', require('./routes/billing'));
""", regex=True, marker="'/api/billing'")

# 2. server npm script
patch('server/package.json', 'seed:extras script', '"seed:food": "node seed-food.js"', ',\n    "seed:extras": "node seed-extras.js"', marker='seed:extras')

# 3. client routes
patch('client/src/App.jsx', 'page imports', "import Invoice from './pages/Invoice';\n",
"""import Cafe from './pages/Cafe';
import CafeBill from './pages/CafeBill';
import CheckIn from './pages/CheckIn';
import Locations from './pages/Locations';
import Leadership from './pages/Leadership';
import Volunteer from './pages/Volunteer';
""", marker="import Cafe from")
patch('client/src/App.jsx', 'admin imports', "const FoodAdmin = lazy(() => import('./admin/FoodAdmin'));\n",
"""const CafeOrdersAdmin = lazy(() => import('./admin/CafeOrdersAdmin'));
const BillingAdmin = lazy(() => import('./admin/BillingAdmin'));
const CheckInsAdmin = lazy(() => import('./admin/CheckInsAdmin'));
const VolunteersAdmin = lazy(() => import('./admin/VolunteersAdmin'));
const LocationsAdmin = lazy(() => import('./admin/LocationsAdmin'));
const TeamAdmin = lazy(() => import('./admin/TeamAdmin'));
""", marker="const CafeOrdersAdmin")
patch('client/src/App.jsx', 'public routes', '<Route path="/account" element={<Account />} />\n',
"""            <Route path="/cafe" element={<Cafe />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/leadership" element={<Leadership />} />
            <Route path="/volunteer" element={<Volunteer />} />
""", marker='path="/cafe"')
patch('client/src/App.jsx', 'cafe bill route', '<Route path="/invoice/:id" element={<Invoice />} />\n',
'          <Route path="/cafe-bill/:orderNo" element={<CafeBill />} />\n', marker='path="/cafe-bill/')
patch('client/src/App.jsx', 'admin routes', '<Route path="food" element={<FoodAdmin />} />\n',
"""            <Route path="cafe" element={<CafeOrdersAdmin />} />
            <Route path="billing" element={<BillingAdmin />} />
            <Route path="checkins" element={<CheckInsAdmin />} />
            <Route path="volunteers" element={<VolunteersAdmin />} />
            <Route path="locations" element={<LocationsAdmin />} />
            <Route path="team" element={<TeamAdmin />} />
""", marker='path="billing"')

# 4. admin menu
patch('client/src/admin/AdminLayout.jsx', 'admin menu', "['/admin/food', 'Food menu'],\n",
"""  ['/admin/cafe', 'Cafe orders'],
  ['/admin/billing', 'Billing'],
  ['/admin/checkins', 'Web check-ins'],
  ['/admin/volunteers', 'Collab requests'],
  ['/admin/locations', 'Locations'],
  ['/admin/team', 'Leadership'],
""", marker="'/admin/billing'")

# 5. website menu (desktop + mobile) and footer
p = root / 'client/src/components/Navbar.jsx'
if p.exists():
    s = p.read_text()
    if "'/cafe'" not in s:
        if "  ['/contact', 'Contact']," in s:
            s = s.replace("  ['/contact', 'Contact'],", "  ['/cafe', 'Cafe'],\n  ['/locations', 'Locations', false, true],\n  ['/contact', 'Contact'],", 1)
            print('+ Navbar.jsx: Cafe and Locations links')
        else:
            problems.append('Navbar.jsx: could not find the LINKS list')
    else:
        print('= Navbar.jsx: top menu already done')
    mob = '<NavLink to="/booking" className="border-b border-white/10 py-4 font-serif text-3xl">Find booking</NavLink>'
    if 'to="/checkin"' not in s:
        if mob in s:
            extra = ''.join(f'\n            <NavLink to="{to}" className="border-b border-white/10 py-4 font-serif text-3xl">{lab}</NavLink>' for to, lab in [('/checkin', 'Web check-in'), ('/leadership', 'Leadership'), ('/volunteer', 'Volunteer')])
            s = s.replace(mob, mob + extra, 1)
            print('+ Navbar.jsx: mobile links')
        else:
            problems.append('Navbar.jsx: could not find the mobile "Find booking" link')
    p.write_text(s)
else:
    problems.append('Navbar.jsx not found')

patch('client/src/components/Footer.jsx', 'footer links', '<Link className={lk} to="/booking">Find my booking</Link>\n',
"""          <Link className={lk} to="/checkin">Web check-in</Link>
          <Link className={lk} to="/cafe">Hi Strangers Cafe</Link>
          <Link className={lk} to="/locations">Our locations</Link>
          <Link className={lk} to="/leadership">Leadership and contact</Link>
          <Link className={lk} to="/volunteer">Volunteer and collaborate</Link>
""", marker='to="/checkin"')

# 6. let the admin open any room invoice from Billing
p = root / 'client/src/pages/Invoice.jsx'
if p.exists():
    s = p.read_text()
    old = "api.get(`/bookings/mine/${id}`)"
    new = "api.get(user.role === 'admin' ? `/billing/booking/${id}` : `/bookings/mine/${id}`)"
    if new in s: print('= Invoice.jsx: admin access already done')
    elif old in s:
        p.write_text(s.replace(old, new, 1)); print('+ Invoice.jsx: admin can open any invoice')
    else: problems.append('Invoice.jsx: could not find the invoice request')
else:
    problems.append('Invoice.jsx not found')

if problems:
    print('\nCould not place everything automatically:')
    for x in problems: print(' -', x)
    sys.exit(1)
print('\nAll done.')
