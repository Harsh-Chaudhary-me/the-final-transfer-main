import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import TrustedInvite from './components/TrustedInvite';

// Supabase
import { supabase } from './supabase';

// Components
import SplashScreen from './components/SplashScreen';
import AdminClaims from './components/AdminClaims';
import NomineeClaim from './components/NomineeClaim';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import TrustedPortal from './components/TrustedPortal';
import DeathClaimSupport from './components/DeathClaimSupport';
import LegalUploadPage from './components/LegalUploadPage';
import AuthModal from './components/AuthModal';
import SetPasswordModal from './components/SetPasswordModal';
import TrustedVotePage from './components/TrustedVotePage';
import NomineeDownloadPage from './components/NomineeDownloadPage';
import Notifications from './components/Notifications';

// --- MOCK DATA (kept for LegalUploadPage demo use) ---
const MOCK_PACKETS = [
  { id: 1, name: "Financial Vault", status: "Active", type: "Created" },
  { id: 2, name: "Social Credentials", status: "Active", type: "Created" },
];

const MOCK_ASSIGNED = [
  { id: 101, ownerName: "John Doe", name: "Emergency Instructions", status: "Pending Verification" },
  { id: 102, ownerName: "Jane Smith", name: "Life Insurance", status: "Emergency Verified", timerStart: Date.now() },
  { id: 103, ownerName: "Robert C.", name: "Digital Memories", status: "Deceased Verified" },
];

/**
 * Map current URL pathname to a view name.
 * Handles deep links from email (nominee/download, trusted/vote, notifications).
 */
function resolveViewFromPath(pathname, hasUser) {
  if (pathname === '/trusted/invite') return 'trusted_invite';
if (pathname === '/nominee/claim') return 'nominee_claim';
  if (pathname === '/nominee/download') return 'nominee_download';
  if (pathname === '/support/death-claim') return 'death_claim_support';
  if (pathname === '/admin/claims') return 'admin_claims';
  if (pathname === '/trusted/vote') return 'trusted_vote';
  if (pathname === '/notifications') return 'notifications';
  if (pathname === '/trusted') return 'trusted_portal';
  if (pathname === '/dashboard' || hasUser) return 'dashboard';
  return null;
}

export default function App() {
  const [currentView, setCurrentView] = useState('splash');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  // For dashboard prototype
  const [assignedPackets, setAssignedPackets] = useState(MOCK_ASSIGNED);

  // ---- Initial session check + deep-link detection ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      const viewFromUrl = resolveViewFromPath(window.location.pathname, !!currentUser);
      if (viewFromUrl) setCurrentView(viewFromUrl);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'PASSWORD_RECOVERY') {
        setIsSetPasswordModalOpen(true);
      }

      setCurrentView((prev) => {
        const viewFromUrl = resolveViewFromPath(window.location.pathname, !!currentUser);
        if (viewFromUrl) return viewFromUrl;
        if (currentUser && prev !== 'dashboard') return 'dashboard';
        if (!currentUser && prev === 'dashboard') return 'landing';
        return prev;
      });

      if (currentUser) {
        setIsLoginModalOpen(false);
        setIsSignUpModalOpen(false);
      }
    });

    // Listen for popstate (browser back/forward) so URL changes still work
    const onPopState = () => {
      const viewFromUrl = resolveViewFromPath(window.location.pathname, !!user);
      if (viewFromUrl) setCurrentView(viewFromUrl);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // ---- Splash screen auto-advance ----
  useEffect(() => {
    if (currentView === 'splash') {
      const timer = setTimeout(() => {
        const viewFromUrl = resolveViewFromPath(window.location.pathname, !!user);
        if (viewFromUrl) {
          setCurrentView(viewFromUrl);
        } else if (user) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('landing');
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentView, user]);

  // ---- Navigation helper ----
  const navigateTo = (view, path = null) => {
    setCurrentView(view);
    const url =
      path ||
      (view === 'dashboard' ? '/dashboard'
        : view === 'notifications' ? '/notifications'
        : view === 'trusted_portal' ? '/trusted'
        : view === 'trusted_vote' ? '/trusted/vote'
        : view === 'nominee_download' ? '/nominee/download'
        : view === 'nominee_claim' ? '/nominee/claim'
        : view === 'legal' ? '/legal'
        : '/');
    window.history.pushState({}, '', url);
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentView('landing');
      window.history.pushState({}, '', '/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF9F1] text-gray-800 font-sans selection:bg-[#FF8C00] selection:text-white">
      <AnimatePresence mode="wait">
        {currentView === 'splash' && <SplashScreen key="splash" />}
            {currentView === 'trusted_invite' && (
  <TrustedInvite key="trusted_invite" />
)}
        {currentView === 'landing' && (
          <LandingPage
            key="landing"
            onLoginClick={() => setIsLoginModalOpen(true)}
            onSignUpClick={() => setIsSignUpModalOpen(true)}
          />
        )}

        {currentView === 'dashboard' && (
  <Dashboard
    key="dashboard"
    user={user}
    onLogout={handleLogout}
    onNavigate={(view) => navigateTo(view)}
  />
)}

        {currentView === 'trusted_portal' && (
          <TrustedPortal
            key="trusted_portal"
            user={user}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'trusted_vote' && (
          <TrustedVotePage
            key="trusted_vote"
            user={user}
            onBack={() => navigateTo('dashboard')}
            onLoginClick={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentView === 'nominee_download' && (
          <NomineeDownloadPage
            key="nominee_download"
            user={user}
            onBack={() => navigateTo('dashboard')}
            onLoginClick={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentView === 'notifications' && (
          <Notifications
            key="notifications"
            user={user}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'legal' && (
          <LegalUploadPage
            key="legal"
            onBack={() => navigateTo('landing')}
          />
        )}
        {currentView === 'nominee_claim' && <NomineeClaim key="nominee_claim" />}
        {currentView === 'death_claim_support' && (
  <DeathClaimSupport key="death_claim_support" />
)}
{currentView === 'admin_claims' && <AdminClaims key="admin_claims" />}
      </AnimatePresence>

      {/* Auth Modals */}
      <AuthModal
        isOpen={isLoginModalOpen || isSignUpModalOpen}
        isSignUpMode={isSignUpModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setIsSignUpModalOpen(false);
        }}
      />

      <SetPasswordModal
        isOpen={isSetPasswordModalOpen}
        onClose={() => setIsSetPasswordModalOpen(false)}
      />
    </div>
  );
}