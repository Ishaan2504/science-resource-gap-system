/**
 * AppShell — Single shared layout shell for all logged-in views in ISRGAPIT System
 * Department of School Education & Literacy, Ministry of Education, Government of India
 *
 * Renders uniformly:
 * 1. Top Utility Ribbon — Live IST clock, Skip link, A-/A/A+ font controls, Language toggle
 * 2. Condensed Main Header — Ministry emblem + 2-line ministry title + ISRGAPIT System + User role & bordered Sign Out
 * 3. 3-Bar Tricolor Rule — Directly under every header (#FF9933 / #ffffff / #128807)
 * 4. Sub-header Breadcrumb Bar — Structured breadcrumb navigation
 * 5. Demonstration Mode Alert — Restyled in caution/amber variant of login error alert
 * 6. Left Sidebar — Defined right border, left-edge government blue accent bar on active items
 * 7. Content Slot (<Outlet />)
 * 8. Tricolor Rule (above footer)
 * 9. Official Government Footer — NIC crediting, Security Audit Passed badge, Copyright
 */

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Globe,
  Home,
  LayoutDashboard,
  Menu,
  MinusCircle,
  PlusCircle,
  School as SchoolIcon,
  ShieldAlert,
  TrendingUp,
  UserCog,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useAppContext } from '../context/AppContext';
import type { Role } from '../types';
import { GovButton, MinistryEmblem, TricolorRule } from './GovUI';

const roleLabels: Record<Role, { en: string; hi: string }> = {
  SCHOOL: { en: 'School Official', hi: 'विद्यालय अधिकारी' },
  NGO: { en: 'NGO / Organisation', hi: 'NGO / संगठन' },
  ADMIN: { en: 'Administrator', hi: 'प्रशासक' },
  FIELD_COORDINATOR: { en: 'Field Coordinator', hi: 'फील्ड समन्वयक' },
};

type NavItem = {
  label: { en: string; hi: string };
  path: string;
  roles: Role[];
  Icon: typeof Home;
};

const navItems: NavItem[] = [
  {
    label: { en: 'Dashboard', hi: 'डैशबोर्ड' },
    path: '/dashboard',
    roles: ['SCHOOL', 'NGO', 'ADMIN', 'FIELD_COORDINATOR'],
    Icon: LayoutDashboard,
  },
  {
    label: { en: 'Schools', hi: 'विद्यालय' },
    path: '/schools',
    roles: ['SCHOOL', 'ADMIN', 'FIELD_COORDINATOR'],
    Icon: SchoolIcon,
  },
  {
    label: { en: 'Resource Assessments', hi: 'संसाधन मूल्यांकन' },
    path: '/assessments',
    roles: ['SCHOOL', 'ADMIN', 'FIELD_COORDINATOR'],
    Icon: ClipboardList,
  },
  {
    label: { en: 'Requirements', hi: 'आवश्यकताएं' },
    path: '/requirements',
    roles: ['SCHOOL', 'NGO', 'ADMIN', 'FIELD_COORDINATOR'],
    Icon: ShieldAlert,
  },
  {
    label: { en: 'Gap Analysis', hi: 'अंतराल विश्लेषण' },
    path: '/gap-analysis',
    roles: ['SCHOOL', 'ADMIN'],
    Icon: TrendingUp,
  },
  {
    label: { en: 'Priority Rankings', hi: 'प्राथमिकता रैंकिंग' },
    path: '/priorities',
    roles: ['NGO', 'ADMIN', 'FIELD_COORDINATOR'],
    Icon: BarChart2,
  },
  {
    label: { en: 'Reports', hi: 'रिपोर्ट्स' },
    path: '/reports',
    roles: ['SCHOOL', 'NGO', 'ADMIN'],
    Icon: BarChart2,
  },
  {
    label: { en: 'User Management', hi: 'उपयोगकर्ता प्रबंधन' },
    path: '/users',
    roles: ['ADMIN'],
    Icon: UserCog,
  },
];

function labelForPath(pathname: string, lang: 'en' | 'hi') {
  if (pathname.includes('/schools/new'))
    return lang === 'hi' ? 'विद्यालय पंजीकरण' : 'Register School Profile';
  if (pathname.includes('/edit'))
    return lang === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit School Profile';
  if (pathname.startsWith('/schools/'))
    return lang === 'hi' ? 'विद्यालय प्रोफ़ाइल' : 'School Profile';
  if (pathname.includes('/assessments/new'))
    return lang === 'hi' ? 'मूल्यांकन दर्ज करें' : 'Record Assessment';
  if (pathname.startsWith('/requirements/'))
    return lang === 'hi' ? 'आवश्यकता विवरण' : 'Requirement Details';

  const match = navItems.find((n) => n.path === pathname);
  if (match) return match.label[lang];
  return lang === 'hi' ? 'डैशबोर्ड' : 'Dashboard';
}

function useISTClock() {
  const fmt = () =>
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const { lang, setLang, decreaseFont, resetFont, increaseFont, atMinFont, atMaxFont } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const istTime = useISTClock();

  const visibleNav = navItems.filter((n) => user && n.roles.includes(user.role));
  const breadcrumb = labelForPath(location.pathname, lang);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // Close sidebar on mobile route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const ribbonBtn = `
    w-6 h-6 flex items-center justify-center rounded-sm hover:bg-white/10
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9933]
    disabled:opacity-40 disabled:cursor-not-allowed transition-colors
  `;

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f4f6f9] text-[#0f2540]"
      style={{
        fontFamily:
          lang === 'hi'
            ? "'Noto Sans Devanagari','Noto Sans',sans-serif"
            : "'Inter','Noto Sans','Roboto',sans-serif",
      }}
    >
      {/* ── Skip to Main Content Link ─────────────────────────────────── */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only focus:absolute focus:z-50
          focus:top-2 focus:left-2 focus:px-3 focus:py-1
          focus:bg-[#FF9933] focus:text-[#0f2540] focus:font-semibold
          focus:rounded-sm focus:outline-none focus:ring-2 focus:ring-white
        "
      >
        {lang === 'hi' ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content'}
      </a>

      {/* ================================================================
          1. TOP UTILITY RIBBON
      ================================================================ */}
      <div
        className="bg-[#0f3460] text-white text-xs"
        role="navigation"
        aria-label="Utility navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-9">
          <time
            className="text-[#b8cce4] tabular-nums text-[11px] tracking-wide"
            aria-live="polite"
            aria-atomic="true"
          >
            {istTime} IST
          </time>

          <div className="flex items-center gap-3">
            {/* Text size controls */}
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Text size controls"
            >
              <button
                onClick={decreaseFont}
                disabled={atMinFont}
                aria-label={lang === 'hi' ? 'टेक्स्ट आकार घटाएं' : 'Decrease text size'}
                className={ribbonBtn}
              >
                <MinusCircle size={13} />
              </button>
              <button
                onClick={resetFont}
                aria-label={lang === 'hi' ? 'टेक्स्ट आकार रीसेट करें' : 'Reset text size'}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9933] transition-colors"
              >
                A
              </button>
              <button
                onClick={increaseFont}
                disabled={atMaxFont}
                aria-label={lang === 'hi' ? 'टेक्स्ट आकार बढ़ाएं' : 'Increase text size'}
                className={ribbonBtn}
              >
                <PlusCircle size={13} />
              </button>
            </div>

            <span className="h-4 border-l border-white/20" aria-hidden="true" />

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide hover:text-[#FF9933] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF9933] rounded-sm transition-colors px-1 cursor-pointer"
              aria-label={lang === 'en' ? 'Switch language to हिन्दी' : 'Switch language to English'}
            >
              <Globe size={13} aria-hidden="true" />
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================
          2. MAIN HEADER (Condensed single row for internal pages)
      ================================================================ */}
      <header className="bg-white border-b border-[#d1d5db]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 min-h-[64px]">
          {/* Mobile menu trigger */}
          <button
            className="lg:hidden flex items-center justify-center w-8 h-8 border border-[#d1d5db] rounded-sm text-[#0f3460] hover:bg-[#f0f4f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] transition-colors flex-shrink-0 cursor-pointer"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Identity: Emblem + 2-line ministry title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <MinistryEmblem size={44} />
            </div>
            <div className="min-w-0">
              <p className="text-[#0f3460] font-bold text-xs sm:text-sm leading-tight truncate">
                {lang === 'hi'
                  ? 'स्कूली शिक्षा और साक्षरता विभाग'
                  : 'Department of School Education & Literacy'}
              </p>
              <p className="text-[#4b6077] text-[11px] sm:text-xs leading-tight truncate">
                {lang === 'hi'
                  ? 'शिक्षा मंत्रालय, भारत सरकार'
                  : 'Ministry of Education, Government of India'}
              </p>
            </div>
          </div>


          {/* Account info + Sign out button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user && (
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-[#0f2540] leading-tight truncate max-w-[160px]">
                  {user.full_name || user.email}
                </p>
                <p className="text-[11px] text-[#6b7c93] leading-tight">
                  {roleLabels[user.role][lang]}
                </p>
              </div>
            )}
            <GovButton
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              className="text-xs font-semibold"
            >
              {lang === 'hi' ? 'साइन आउट' : 'Sign out'}
            </GovButton>
          </div>
        </div>
      </header>

      {/* ================================================================
          3. TRICOLOR RULE (Directly under header)
      ================================================================ */}
      <TricolorRule />

      {/* ================================================================
          4. SUB-HEADER BREADCRUMB STRIP
      ================================================================ */}
      <div className="bg-[#f0f4f8] border-b border-[#d1d5db]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between text-xs">
          <nav className="flex items-center gap-1.5 text-[#4b6077]" aria-label="Breadcrumb">
            <Home size={12} className="text-[#0f3460]" aria-hidden="true" />
            <NavLink
              to="/dashboard"
              className="hover:text-[#0f3460] hover:underline"
            >
              {lang === 'hi' ? 'होम' : 'Home'}
            </NavLink>
            <ChevronRight size={12} className="text-[#9ca3af]" aria-hidden="true" />
            <span className="font-semibold text-[#0f2540]" aria-current="page">
              {breadcrumb}
            </span>
          </nav>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#6b7c93] flex items-center gap-2">
                <span className="font-semibold text-[#0f3460] bg-white border border-[#d1d5db] px-2 py-0.5 rounded-xs">
                  {roleLabels[user.role][lang]}
                </span>
                <span className="hidden sm:inline border-l border-[#d1d5db] pl-2">
                  {lang === 'hi' ? 'अधिकृत पोर्टल सत्र' : 'Authorised Portal Session'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>



      {/* ================================================================
          6. BODY ROW — Left Sidebar + Main Content Slot
      ================================================================ */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex min-h-0 relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left Sidebar ────────────────────────────────────────── */}
        <aside
          id="app-sidebar"
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:static top-0 left-0 bottom-0 z-40 lg:z-auto
            w-64 flex-shrink-0 flex flex-col
            bg-white border-r border-[#d1d5db]
            transition-transform duration-200 lg:transition-none
          `}
          aria-label="Main navigation"
        >
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-between items-center px-4 py-3 border-b border-[#e5e7eb] bg-[#f0f4f8]">
            <span className="text-xs font-bold text-[#0f3460] uppercase tracking-wider">
              {lang === 'hi' ? 'पोर्टल नेविगेशन' : 'Portal Navigation'}
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-[#6b7c93] hover:text-[#0f3460] p-1 cursor-pointer"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Section header */}
          <div className="px-5 pt-5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b7c93]">
              {lang === 'hi' ? 'मॉड्यूल' : 'MODULES'}
            </p>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
            {visibleNav.map(({ label, path, Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs sm:text-sm font-medium
                   border-l-[3px] transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460]
                   ${
                     isActive
                       ? 'border-l-[#0f3460] bg-[#edf4fb] text-[#0f3460] font-semibold'
                       : 'border-l-transparent text-[#374151] hover:bg-[#f0f4f8] hover:text-[#0f3460]'
                   }`
                }
              >
                <Icon size={16} aria-hidden="true" className="flex-shrink-0 text-[#0f3460]" />
                <span>{label[lang]}</span>
              </NavLink>
            ))}
          </nav>

          {/* Sidebar footer with user role */}
          {user && (
            <div className="px-5 py-4 border-t border-[#e5e7eb] bg-[#f8fafc]">
              <p className="text-[11px] text-[#6b7c93]">
                {lang === 'hi' ? 'के रूप में साइन इन हैं:' : 'Signed in as:'}
              </p>
              <p className="text-xs font-bold text-[#0f2540] mt-0.5 truncate">
                {roleLabels[user.role][lang]}
              </p>
            </div>
          )}
        </aside>

        {/* ── Main Content Slot ───────────────────────────────────── */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 px-4 sm:px-6 py-6 outline-none overflow-y-auto"
        >
          <Outlet />
        </main>
      </div>

      {/* ================================================================
          7. TRICOLOR RULE (Directly above footer)
      ================================================================ */}
      <TricolorRule />

      {/* ================================================================
          8. OFFICIAL GOVERNMENT FOOTER (Identical to LoginPage footer)
      ================================================================ */}
      <footer className="bg-[#0f3460] text-[#b8cce4] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-center sm:text-left leading-snug">
            {lang === 'hi'
              ? 'शिक्षा मंत्रालय के लिए डिज़ाइन और विकसित | राष्ट्रीय सूचना विज्ञान केंद्र (NIC) द्वारा होस्ट'
              : 'Designed and Developed for Ministry of Education | Hosted by National Informatics Centre (NIC)'}
          </p>
          <div className="flex flex-col items-center sm:items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 bg-[#1b3f73] border border-[#3a6fa3] rounded-sm px-3 py-1 text-[11px] font-semibold text-[#4ade80]">
              <CheckCircle2 size={12} aria-hidden="true" />
              {lang === 'hi' ? 'सुरक्षा ऑडिट पास' : 'Security Audit Passed'}
            </span>
            <p className="text-[10px] text-[#8aa6c1]">
              © {new Date().getFullYear()}{' '}
              {lang === 'hi'
                ? 'शिक्षा मंत्रालय, भारत सरकार। सर्वाधिकार सुरक्षित।'
                : 'Ministry of Education, Government of India. All rights reserved.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
