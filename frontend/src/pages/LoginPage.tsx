/**
 * LoginPage — ISRGAPIT System
 * Government of India · Department of School Education & Literacy
 * Ministry of Education
 *
 * TODO (before production):
 *  1. Replace HERO_IMAGE_URL with an official ministry-approved photo asset.
 *  2. Replace MinistryEmblem SVG with the actual ministry-approved emblem
 *     (NOT the State Emblem of India — that is a protected national symbol).
 *  3. Use httpOnly cookies or an encrypted store for JWT — not localStorage.
 *  4. Wire registration / helpdesk links to real routes.
 */

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ChevronDown,
  Eye, EyeOff, Globe, Lock,
  MinusCircle, PlusCircle, ShieldCheck, User,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useAppContext } from '../context/AppContext';
import { apiMode } from '../api/client';
import type { Role } from '../types';
import { MinistryEmblem, TricolorRule } from '../components/GovUI';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** TODO: Replace with officially approved classroom/school photo.
 *  License: Unsplash free-to-use (https://unsplash.com/license) — placeholder only. */
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1400&q=80';

const PORTAL_FULL_NAME =
  'Intelligent Science Resource Gap Assessment, Prioritization and Intervention Tracking System';

const PORTAL_SHORT = 'ISRGAPIT System';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const T = {
  en: {
    skipNav: 'Skip to main content',
    langToggle: 'हिन्दी',
    ministry: 'Department of School Education & Literacy',
    ministrySub: 'Ministry of Education, Government of India',
    portalTitle: PORTAL_FULL_NAME,
    portalShort: PORTAL_SHORT,
    missionHeading: 'Bridging the Science Resource Divide',
    missionBody: 'A unified digital platform to assess, prioritize, and track science resource gaps across government schools — district by district, school by school.',
    feat1: 'Real-time gap analysis across all districts',
    feat2: 'Priority-driven allocation and intervention tracking',
    feat3: 'Multi-role coordination: Schools, NGOs, Coordinators',
    verificationNotice: 'Access is restricted to authorised users. All sessions are monitored and logged in accordance with the Information Technology Act, 2000.',
    signIn: 'Sign in to your account',
    signInSub: 'Use your authorised government or organisation credentials.',
    role: 'Select your role',
    roleSchool: 'School Official',
    roleNgo: 'NGO / Organisation',
    roleAdmin: 'Administrator',
    roleCoordinator: 'Field Coordinator',
    identifierSchool: 'UDISE+ Code or Email address',
    identifierOther: 'Email address',
    identifierPlaceholderSchool: 'e.g. 09040204601 or user@gov.in',
    identifierPlaceholderOther: 'e.g. user@gov.in',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    registerSchool: 'Register as School',
    registerNgo: 'Register as NGO / CSR Organisation',
    forgotPassword: 'Forgot Password / Helpdesk',
    restrictedNotice: 'Unauthorised access is a punishable offence under the IT Act.',
    demoMode: 'Demonstration mode — changes are not saved to the backend.',
    footerNic: 'Designed and Developed for Ministry of Education | Hosted by National Informatics Centre (NIC)',
    footerCopyright: `© ${new Date().getFullYear()} Ministry of Education, Government of India. All rights reserved.`,
    securityAudit: 'Security Audit Passed',
    errorDefault: 'Sign-in could not be completed. Please try again.',
    fontDecrease: 'Decrease text size',
    fontReset: 'Reset text size',
    fontIncrease: 'Increase text size',
  },
  hi: {
    skipNav: 'मुख्य सामग्री पर जाएं',
    langToggle: 'English',
    ministry: 'स्कूली शिक्षा और साक्षरता विभाग',
    ministrySub: 'शिक्षा मंत्रालय, भारत सरकार',
    portalTitle: 'बुद्धिमान विज्ञान संसाधन अंतराल मूल्यांकन, प्राथमिकता और हस्तक्षेप ट्रैकिंग प्रणाली',
    portalShort: 'ISRGAPIT प्रणाली',
    missionHeading: 'विज्ञान संसाधन अंतराल को पाटना',
    missionBody: 'सरकारी विद्यालयों में विज्ञान संसाधनों की कमी का आकलन, प्राथमिकता और ट्रैकिंग के लिए एकीकृत डिजिटल मंच।',
    feat1: 'सभी जिलों में रीयल-टाइम अंतराल विश्लेषण',
    feat2: 'प्राथमिकता-आधारित आवंटन और हस्तक्षेप ट्रैकिंग',
    feat3: 'बहु-भूमिका समन्वय: विद्यालय, NGO, समन्वयक',
    verificationNotice: 'केवल अधिकृत उपयोगकर्ताओं के लिए। सभी सत्र सूचना प्रौद्योगिकी अधिनियम, 2000 के अनुसार निगरानी में हैं।',
    signIn: 'अपने खाते में साइन इन करें',
    signInSub: 'अपने अधिकृत सरकारी या संगठन क्रेडेंशियल का उपयोग करें।',
    role: 'अपनी भूमिका चुनें',
    roleSchool: 'विद्यालय अधिकारी',
    roleNgo: 'NGO / संगठन',
    roleAdmin: 'प्रशासक',
    roleCoordinator: 'फील्ड समन्वयक',
    identifierSchool: 'UDISE+ कोड या ईमेल पता',
    identifierOther: 'ईमेल पता',
    identifierPlaceholderSchool: 'जैसे 09040204601 या user@gov.in',
    identifierPlaceholderOther: 'जैसे user@gov.in',
    password: 'पासवर्ड',
    showPassword: 'पासवर्ड दिखाएं',
    hidePassword: 'पासवर्ड छुपाएं',
    submit: 'साइन इन करें',
    submitting: 'साइन इन हो रहा है…',
    registerSchool: 'विद्यालय के रूप में पंजीकरण करें',
    registerNgo: 'NGO / CSR संगठन के रूप में पंजीकरण करें',
    forgotPassword: 'पासवर्ड भूल गए / सहायता',
    restrictedNotice: 'अनधिकृत पहुँच IT अधिनियम के तहत दंडनीय है।',
    demoMode: 'डेमो मोड — परिवर्तन बैकएंड में सहेजे नहीं जाते।',
    footerNic: 'शिक्षा मंत्रालय के लिए डिज़ाइन और विकसित | राष्ट्रीय सूचना विज्ञान केंद्र (NIC) द्वारा होस्ट',
    footerCopyright: `© ${new Date().getFullYear()} शिक्षा मंत्रालय, भारत सरकार। सर्वाधिकार सुरक्षित।`,
    securityAudit: 'सुरक्षा ऑडिट पास',
    errorDefault: 'साइन इन पूरा नहीं हो सका। कृपया पुनः प्रयास करें।',
    fontDecrease: 'टेक्स्ट आकार घटाएं',
    fontReset: 'टेक्स्ट आकार रीसेट करें',
    fontIncrease: 'टेक्स्ट आकार बढ़ाएं',
  },
} as const;

// ---------------------------------------------------------------------------
// Live IST clock
// ---------------------------------------------------------------------------
function useISTClock() {
  const fmt = () =>
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit',
      month: 'short', year: 'numeric', hour: '2-digit',
      minute: '2-digit', second: '2-digit', hour12: false,
    });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LoginPage() {
  const { user, signIn } = useAuth();
  const { lang, setLang, decreaseFont, resetFont, increaseFont, atMinFont, atMaxFont } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const t = T[lang];
  const istTime = useISTClock();

  const [role, setRole] = useState<Role>('SCHOOL');
  const [identifier, setIdentifier] = useState(apiMode === 'mock' ? 'district.office@gov.example' : '');
  const [password, setPassword] = useState(apiMode === 'mock' ? 'Demonstration2026' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { document.documentElement.lang = lang === 'hi' ? 'hi' : 'en'; }, [lang]);

  const isSchool = role === 'SCHOOL';

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = await signIn(identifier, password, role);
      const from = (location.state as { from?: string } | null)?.from;
      const landing = session.role === 'NGO' ? '/priorities'
        : session.role === 'SCHOOL' ? '/schools'
        : session.role === 'FIELD_COORDINATOR' ? '/assessments'
        : '/dashboard';
      navigate(from ?? landing, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorDefault);
    } finally {
      setBusy(false);
    }
  }, [identifier, password, role, signIn, navigate, location.state, t.errorDefault]);

  if (user) return <Navigate to="/dashboard" replace />;

  const ribbonBtn = `w-6 h-6 flex items-center justify-center rounded hover:bg-white/10
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9933]
    disabled:opacity-40 disabled:cursor-not-allowed transition-colors`;

  const inputCls = `w-full border border-[#9ca3af] rounded-sm bg-white text-[#1e3a5f] text-sm
    px-3 py-2.5 placeholder:text-[#9ca3af]
    focus:outline-none focus:ring-2 focus:ring-[#0f3460] focus:border-[#0f3460]
    transition-colors`;

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f4f6f9] text-[#0f2540]"
      style={{ fontFamily: lang === 'hi' ? "'Noto Sans Devanagari','Noto Sans',sans-serif" : "'Inter','Noto Sans',sans-serif" }}
    >
      {/* ── 1. UTILITY RIBBON ──────────────────────────────────────────── */}
      <div className="bg-[#0f3460] text-white text-xs" role="navigation" aria-label="Utility navigation">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-9 gap-4">
          <a href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-1 focus:bg-[#FF9933] focus:text-[#0f2540] focus:font-semibold focus:rounded focus:outline-none focus:ring-2 focus:ring-white">
            {t.skipNav}
          </a>
          <time className="hidden sm:block text-[#b8cce4] tabular-nums text-[11px] tracking-wide"
            aria-live="polite" aria-atomic="true">{istTime} IST</time>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1" role="group" aria-label="Text size controls">
              <button onClick={decreaseFont} disabled={atMinFont} aria-label={t.fontDecrease} className={ribbonBtn}><MinusCircle size={13} /></button>
              <button onClick={resetFont} aria-label={t.fontReset}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9933] transition-colors">A</button>
              <button onClick={increaseFont} disabled={atMaxFont} aria-label={t.fontIncrease} className={ribbonBtn}><PlusCircle size={13} /></button>
            </div>
            <span className="h-4 border-l border-white/20" aria-hidden="true" />
            <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide hover:text-[#FF9933] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9933] rounded transition-colors px-1"
              aria-label={`Switch language to ${t.langToggle}`}>
              <Globe size={13} aria-hidden="true" />{t.langToggle}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN HEADER ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#d1d5db]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0"><MinistryEmblem size={72} /></div>
            <div className="min-w-0">
              <p className="text-[#0f3460] font-bold text-base sm:text-lg leading-snug">{t.ministry}</p>
              <p className="text-[#4b6077] text-sm sm:text-base leading-snug">{t.ministrySub}</p>
            </div>
          </div>
          <div className="sm:text-right text-center flex-shrink-0 max-w-sm">
            <p className="text-[11px] uppercase tracking-widest text-[#6b7c93] font-semibold mb-0.5">{t.portalShort}</p>
            <p className="text-[#0f3460] font-semibold text-[13px] leading-snug hidden lg:block">{t.portalTitle}</p>
          </div>
        </div>
      </header>

      {/* ── 3. TRICOLOR RULE ───────────────────────────────────────────── */}
      <TricolorRule />

      {/* ── 4+5. HERO + TWO-COLUMN CONTENT ────────────────────────────── */}
      <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
        <div className="flex flex-col lg:flex-row flex-1">

          {/* LEFT — hero image panel */}
          <div className="relative lg:flex-1 flex flex-col justify-end min-h-[300px] lg:min-h-0"
            style={{
              backgroundImage: `linear-gradient(135deg,rgba(15,52,96,0.92) 0%,rgba(15,52,96,0.80) 45%,rgba(15,52,96,0.55) 100%),url('${HERO_IMAGE_URL}')`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
            <div aria-hidden="true" className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="relative z-10 p-8 sm:p-12 lg:p-14">
              <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight mb-4">{t.missionHeading}</h1>
              <p className="text-[#c8dcf0] text-sm sm:text-base leading-relaxed mb-8 max-w-lg">{t.missionBody}</p>
              <ul className="space-y-3 mb-8" role="list">
                {[t.feat1, t.feat2, t.feat3].map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#4ade80] flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-[#dcedf9] text-sm leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
              <div className="border border-[#3a6fa3] bg-[rgba(15,52,96,0.55)] rounded-sm p-4 flex items-start gap-3 max-w-lg">
                <ShieldCheck size={18} className="text-[#FF9933] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[#b8cfe8] text-xs leading-relaxed">{t.verificationNotice}</p>
              </div>
              {apiMode === 'mock' && (
                <div className="mt-4 border border-[#FF9933]/40 bg-[rgba(255,153,51,0.12)] rounded-sm p-3 max-w-lg">
                  <p className="text-[#FFD580] text-xs">{t.demoMode}</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — login card */}
          <div className="bg-[#f4f6f9] lg:w-[480px] xl:w-[520px] flex-shrink-0 flex items-start lg:items-center justify-center p-6 sm:p-10 lg:p-12">
            <section className="w-full max-w-[420px] bg-white border border-[#d1d5db] rounded-sm" aria-labelledby="login-heading">
              {/* Card header */}
              <div className="bg-[#0f3460] rounded-t-sm px-6 py-4">
                <h2 id="login-heading" className="text-white font-bold text-lg leading-snug">{t.signIn}</h2>
                <p className="text-[#b8cce4] text-xs mt-0.5">{t.signInSub}</p>
              </div>

              <div className="px-6 py-6 space-y-5">
                {/* Error banner */}
                {error && (
                  <div ref={errorRef} role="alert" aria-live="assertive" tabIndex={-1}
                    className="border border-[#e5b6b2] border-l-4 border-l-[#dc2626] bg-[#fef2f2] text-[#7f1d1d] text-sm px-4 py-3 rounded-sm flex items-start gap-3 outline-none">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-[#dc2626]" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <label htmlFor="role-select" className="block text-sm font-semibold text-[#1e3a5f]">{t.role}</label>
                    <div className="relative">
                      <select id="role-select" value={role}
                        onChange={(e) => { setRole(e.target.value as Role); setIdentifier(''); }}
                        className={`${inputCls} appearance-none pr-9`}>
                        <option value="SCHOOL">{t.roleSchool}</option>
                        <option value="NGO">{t.roleNgo}</option>
                        <option value="ADMIN">{t.roleAdmin}</option>
                        <option value="FIELD_COORDINATOR">{t.roleCoordinator}</option>
                      </select>
                      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7c93] pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Identifier */}
                  <div className="space-y-1.5">
                    <label htmlFor="identifier" className="block text-sm font-semibold text-[#1e3a5f]">
                      {isSchool ? t.identifierSchool : t.identifierOther}
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7c93] pointer-events-none" aria-hidden="true" />
                      <input id="identifier" type={isSchool ? 'text' : 'email'}
                        autoComplete={isSchool ? 'username' : 'email'} required
                        value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={isSchool ? t.identifierPlaceholderSchool : t.identifierPlaceholderOther}
                        aria-invalid={!!error}
                        className={`${inputCls} pl-9`} />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-semibold text-[#1e3a5f]">{t.password}</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7c93] pointer-events-none" aria-hidden="true" />
                      <input id="password" type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password" required
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••" aria-invalid={!!error}
                        className={`${inputCls} pl-9 pr-11 placeholder:tracking-widest`} />
                      <button type="button" onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t.hidePassword : t.showPassword}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7c93] hover:text-[#0f3460] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] rounded-sm p-0.5">
                        {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={busy}
                    className="w-full bg-[#0f3460] hover:bg-[#1b3f73] active:bg-[#0a2548] text-white font-semibold text-sm rounded-sm py-2.5 px-4 mt-1 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF9933] disabled:opacity-60 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none">
                    {busy && (
                      <svg className="animate-spin h-4 w-4 text-white motion-reduce:animate-none"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {busy ? t.submitting : t.submit}
                  </button>
                </form>

                {/* Inline links */}
                <div className="border-t border-[#e5e7eb] pt-4 flex flex-col gap-2">
                  {[
                    { label: t.registerSchool, href: '#register-school' },
                    { label: t.registerNgo, href: '#register-ngo' },
                    { label: t.forgotPassword, href: '#helpdesk' },
                  ].map(({ label, href }) => (
                    <a key={href} href={href}
                      onClick={(e) => e.preventDefault()}
                      className="text-xs text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] rounded-sm">
                      {label}
                    </a>
                  ))}
                </div>

                <p className="text-[11px] text-[#6b7c93] text-center leading-snug border-t border-[#e5e7eb] pt-4">
                  {t.restrictedNotice}
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ── TRICOLOR (above footer) ─────────────────────────────────────── */}
      <TricolorRule />

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="bg-[#0f3460] text-[#b8cce4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-center sm:text-left leading-snug">{t.footerNic}</p>
          <div className="flex flex-col items-center sm:items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 bg-[#1b3f73] border border-[#3a6fa3] rounded-sm px-3 py-1 text-[11px] font-semibold text-[#4ade80]">
              <CheckCircle2 size={12} aria-hidden="true" />{t.securityAudit}
            </span>
            <p className="text-[10px] text-[#8aa6c1] text-center sm:text-right">{t.footerCopyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
