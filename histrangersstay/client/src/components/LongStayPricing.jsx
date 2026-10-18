import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Lock, Tag, Percent } from 'lucide-react';
import { useAuth } from '../AuthContext';
import Reveal from './Reveal';
import SectionHeading from './SectionHeading';

const ROOMS = [
  { name: 'Luxury 320° View (No Balcony)', night: 1700, d7: 10115, d14: 17850, d30: 30600, d60: 51000, icon: '🏔️' },
  { name: 'Luxury View + Balcony', night: 2000, d7: 11900, d14: 21000, d30: 36000, d60: 60000, icon: '🌅' },
  { name: 'Premium View + Balcony', night: 1800, d7: 10710, d14: 18900, d30: 32400, d60: 54000, icon: '🌄' },
  { name: 'Standard View (No Balcony)', night: 1600, d7: 9520, d14: 16800, d30: 28800, d60: 48000, icon: '🏞️' },
  { name: '2BHK Suite with Kitchen', night: 3700, d7: 22015, d14: 38850, d30: 66600, d60: 111000, icon: '🏠' },
  { name: 'Family Luxury Room', night: 2700, d7: 16065, d14: 28350, d30: 48600, d60: 81000, icon: '👨‍👩‍👧‍👦' },
  { name: '4-Bed Mixed Bunk Bed Dormitory', night: 500, d7: 2975, d14: 5250, d30: 9000, d60: 15000, icon: '🛏️' },
];

// Coupon codes for each long-stay duration
const COUPONS = {
  d7:  { code: 'STAY7SAVE15',  percent: 15, label: '7 Nights',  key: 'd7' },
  d14: { code: 'STAY14SAVE25', percent: 25, label: '14 Nights', key: 'd14' },
  d30: { code: 'STAY30SAVE40', percent: 40, label: '30 Nights', key: 'd30' },
  d60: { code: 'STAY60SAVE50', percent: 50, label: '60 Nights', key: 'd60' },
};

const fmt = (n) => '₹' + n.toLocaleString('en-IN');

function PriceCell({ value, show, applied, original }) {
  if (!show) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-ink/50">
        <Lock size={12} /> Login
      </span>
    );
  }
  if (applied && original) {
    return (
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-[0.7rem] text-ink/45 line-through tabular-nums">{fmt(original)}</span>
        <span className="font-semibold tabular-nums text-emerald-700">{fmt(value)}</span>
      </span>
    );
  }
  return <span className="tabular-nums font-medium text-ink/90">{fmt(value)}</span>;
}

function CouponButton({ coupon, applied, onApply, onCopy, canCopy, copied }) {
  if (!coupon) return null;
  return (
    <div className="mt-1.5 flex flex-col items-center gap-1">
      {applied ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-medium text-emerald-800">
          <Check size={11} /> Applied
        </span>
      ) : canCopy ? (
        <button
          type="button"
          onClick={() => onCopy(coupon.code)}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gold-500/60 bg-white/70 px-2 py-1 font-mono text-[0.65rem] tracking-wider text-gold-800 transition hover:bg-gold-50"
          title="Copy coupon code"
        >
          {copied === coupon.code ? <Check size={11} /> : <Copy size={11} />}
          {coupon.code}
        </button>
      ) : (
        <Link
          to="/login"
          state={{ from: '/' }}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-ink/20 px-2 py-1 text-[0.65rem] font-medium text-ink/60 transition hover:border-gold-400 hover:text-gold-700"
        >
          <Lock size={11} /> Use coupon
        </Link>
      )}
      {canCopy && !applied && (
        <button
          type="button"
          onClick={() => onApply(coupon.key)}
          className="text-[0.6rem] font-medium uppercase tracking-wider text-gold-700 hover:underline"
        >
          Apply
        </button>
      )}
    </div>
  );
}

export default function LongStayPricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applied, setApplied] = useState(null); // 'd7' | 'd14' | 'd30' | 'd60'
  const [copied, setCopied] = useState(null);
  const [inputCode, setInputCode] = useState('');

  const isLoggedIn = !!user;

  const handleCopy = (code) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleApply = (key) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    setApplied(key);
  };

  const handleInputApply = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    const code = inputCode.trim().toUpperCase();
    const found = Object.values(COUPONS).find((c) => c.code === code);
    if (found) {
      setApplied(found.key);
      setInputCode('');
    }
  };

  // Original full price = night * nights (for strikethrough when coupon applied)
  const original = (room, nights) => room.night * nights;

  return (
    <section className="wrap section-y">
      <SectionHeading
        eyebrow="Long-stay value"
        title="Exclusive long-stay all-in-one pricing"
        text="Longer stays unlock deeper savings — up to 50% off for 60 nights. Log in to view prices and unlock coupon codes."
      />

      {/* Coupon input bar (visible when logged in) */}
      {isLoggedIn && (
        <Reveal>
          <form onSubmit={handleInputApply} className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white/70 px-4 py-2.5 shadow-sm">
              <Tag size={16} className="text-gold-600" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter coupon code"
                className="w-40 bg-transparent text-sm outline-none placeholder:text-ink/40 sm:w-52"
              />
            </div>
            <button type="submit" className="bt-dark bt-sm">
              Apply coupon
            </button>
            {applied && (
              <button
                type="button"
                onClick={() => setApplied(null)}
                className="text-sm text-ink/60 hover:text-ink hover:underline"
              >
                Clear
              </button>
            )}
          </form>
        </Reveal>
      )}

      {!isLoggedIn && (
        <Reveal>
          <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl border border-gold-400/30 bg-gold-50/50 px-5 py-3 text-sm text-ink/80">
            <Lock size={15} className="text-gold-700" />
            <span>
              Prices are hidden. <Link to="/login" state={{ from: '/' }} className="font-medium text-gold-800 underline">Log in</Link> to view rates and copy coupon codes.
            </span>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="overflow-x-auto rounded-3xl border border-ink/10 bg-white/60 shadow-lift backdrop-blur-md">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="bg-ink text-white">
                <th className="rounded-tl-3xl px-5 py-4 font-medium tracking-wide">Room type</th>
                <th className="px-3 py-4 text-center font-medium">1 Night</th>
                <th className="px-3 py-4 text-center font-medium">
                  7 Nights
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[0.65rem] font-normal text-gold-300">
                    <Percent size={10} /> 15% OFF
                  </span>
                </th>
                <th className="px-3 py-4 text-center font-medium">
                  14 Nights
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[0.65rem] font-normal text-gold-300">
                    <Percent size={10} /> 25% OFF
                  </span>
                </th>
                <th className="px-3 py-4 text-center font-medium">
                  30 Nights
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[0.65rem] font-normal text-gold-300">
                    <Percent size={10} /> 40% OFF
                  </span>
                </th>
                <th className="rounded-tr-3xl px-3 py-4 text-center font-medium">
                  60 Nights
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[0.65rem] font-normal text-gold-300">
                    <Percent size={10} /> 50% OFF
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROOMS.map((r, i) => (
                <tr
                  key={r.name}
                  className={`border-t border-ink/8 transition hover:bg-gold-50/40 ${i % 2 === 0 ? 'bg-white/40' : 'bg-cream/30'}`}
                >
                  <td className="px-5 py-3.5 font-medium text-ink">
                    <span className="mr-2">{r.icon}</span>
                    {r.name}
                  </td>

                  {/* 1 Night – no long-stay coupon */}
                  <td className="px-3 py-3.5 text-center">
                    <PriceCell value={r.night} show={isLoggedIn} />
                  </td>

                  {/* 7 Nights */}
                  <td className="px-3 py-3.5 text-center">
                    {isLoggedIn ? (
                      <>
                        <PriceCell
                          value={r.d7}
                          show
                          applied={applied === 'd7'}
                          original={original(r, 7)}
                        />
                        <CouponButton
                          coupon={COUPONS.d7}
                          applied={applied === 'd7'}
                          onApply={handleApply}
                          onCopy={handleCopy}
                          canCopy={isLoggedIn}
                          copied={copied}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-700">
                          15% OFF
                        </span>
                        <Link
                          to="/login"
                          state={{ from: '/' }}
                          className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-ink/55 hover:text-gold-700"
                        >
                          <Lock size={11} /> Use coupon
                        </Link>
                      </div>
                    )}
                  </td>

                  {/* 14 Nights */}
                  <td className="px-3 py-3.5 text-center">
                    {isLoggedIn ? (
                      <>
                        <PriceCell
                          value={r.d14}
                          show
                          applied={applied === 'd14'}
                          original={original(r, 14)}
                        />
                        <CouponButton
                          coupon={COUPONS.d14}
                          applied={applied === 'd14'}
                          onApply={handleApply}
                          onCopy={handleCopy}
                          canCopy={isLoggedIn}
                          copied={copied}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-700">
                          25% OFF
                        </span>
                        <Link
                          to="/login"
                          state={{ from: '/' }}
                          className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-ink/55 hover:text-gold-700"
                        >
                          <Lock size={11} /> Use coupon
                        </Link>
                      </div>
                    )}
                  </td>

                  {/* 30 Nights */}
                  <td className="px-3 py-3.5 text-center">
                    {isLoggedIn ? (
                      <>
                        <PriceCell
                          value={r.d30}
                          show
                          applied={applied === 'd30'}
                          original={original(r, 30)}
                        />
                        <CouponButton
                          coupon={COUPONS.d30}
                          applied={applied === 'd30'}
                          onApply={handleApply}
                          onCopy={handleCopy}
                          canCopy={isLoggedIn}
                          copied={copied}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[0.7rem] font-semibold text-blue-700">
                          40% OFF
                        </span>
                        <Link
                          to="/login"
                          state={{ from: '/' }}
                          className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-ink/55 hover:text-gold-700"
                        >
                          <Lock size={11} /> Use coupon
                        </Link>
                      </div>
                    )}
                  </td>

                  {/* 60 Nights */}
                  <td className="px-3 py-3.5 text-center">
                    {isLoggedIn ? (
                      <>
                        <PriceCell
                          value={r.d60}
                          show
                          applied={applied === 'd60'}
                          original={original(r, 60)}
                        />
                        <CouponButton
                          coupon={COUPONS.d60}
                          applied={applied === 'd60'}
                          onApply={handleApply}
                          onCopy={handleCopy}
                          canCopy={isLoggedIn}
                          copied={copied}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[0.7rem] font-semibold text-amber-700">
                          50% OFF
                        </span>
                        <Link
                          to="/login"
                          state={{ from: '/' }}
                          className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-ink/55 hover:text-gold-700"
                        >
                          <Lock size={11} /> Use coupon
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* Coupon codes legend (logged in only) */}
      {isLoggedIn && (
        <Reveal delay={60}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-ink/70">
            <span className="font-medium text-ink/90">Coupon codes:</span>
            {Object.values(COUPONS).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCopy(c.code)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gold-400/50 bg-white/60 px-2.5 py-1 font-mono tracking-wider transition hover:bg-gold-50"
              >
                {copied === c.code ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {c.code}
                <span className="text-ink/50">({c.percent}% off)</span>
              </button>
            ))}
          </div>
        </Reveal>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Reveal delay={80} className="surface flex items-start gap-4 p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-2xl">🌿</span>
          <div>
            <p className="font-medium text-ink">Vegetarian meal plan</p>
            <p className="mt-1 text-[0.95rem] text-ink/75">₹330 per person per day — rotational menu with fresh local ingredients.</p>
          </div>
        </Reveal>
        <Reveal delay={120} className="surface flex items-start gap-4 p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-2xl">🐟</span>
          <div>
            <p className="font-medium text-ink">Non-vegetarian meal plan</p>
            <p className="mt-1 text-[0.95rem] text-ink/75">₹380 per person per day — rotational menu including non-veg specialties.</p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={160} className="mt-6 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-50/60 px-5 py-4 text-sm text-ink/85">
        <Check size={18} className="mt-0.5 shrink-0 text-gold-700" />
        <p>
          <strong className="font-medium text-ink">Best value:</strong> the 60-night plan saves 50%. All long-stay plans (7 / 14 / 30 / 60 nights) require 100% advance payment before check-in. Single-night stays can be settled on arrival. Coupon codes are only available after login.
        </p>
      </Reveal>
    </section>
  );
}
