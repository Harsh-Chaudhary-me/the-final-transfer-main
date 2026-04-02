import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

// Firebase
import { auth } from './firebase';
import { onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

// Components
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import TrustedPortal from './components/TrustedPortal';
import LegalUploadPage from './components/LegalUploadPage';
import AuthModal from './components/AuthModal';
import SetPasswordModal from './components/SetPasswordModal';

// --- MOCK DATA ---
const MOCK_PACKETS = [
  { id: 1, name: "Financial Vault", status: "Active", type: "Created" },
  { id: 2, name: "Crypto Keys", status: "Active", type: "Created" },
];

const MOCK_ASSIGNED = [
  { id: 101, ownerName: "John Doe", name: "Emergency Instructions", status: "Pending Verification" },
  { id: 102, ownerName: "Jane Smith", name: "Life Insurance", status: "Emergency Verified", timerStart: Date.now() },
  { id: 103, ownerName: "Robert C.", name: "Digital Memories", status: "Deceased Verified" },
];

export default function App() {
  const [currentView, setCurrentView] = useState('splash'); // splash, landing, dashboard, trusted, legal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  // For dashboard prototype
  const [assignedPackets, setAssignedPackets] = useState(MOCK_ASSIGNED);
  const magicLinkHandled = useRef(false);

  useEffect(() => {
    // Handle Magic Link sign-in
    if (isSignInWithEmailLink(auth, window.location.href) && !magicLinkHandled.current) {
      magicLinkHandled.current = true;
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // User opened the link on a different device. To prevent session fixation
        // attacks, ask the user to provide the associated email again.
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            // Remove the magic link query params from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // In our flow, a user logging in via Magic Link is always a new signup
            // who needs to set a password. We force the Set Password modal open.
            setIsSetPasswordModalOpen(true);
          })
          .catch((error) => {
            console.error("Error signing in with email link", error);
            alert("This link is invalid or has expired.");
          });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      setCurrentView((prev) => {
        if (currentUser && prev !== 'dashboard') return 'dashboard';
        if (!currentUser && prev === 'dashboard') return 'landing';
        return prev;
      });

      if (currentUser) {
        setIsLoginModalOpen(false);
        setIsSignUpModalOpen(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentView === 'splash') {
      const timer = setTimeout(() => {
        if (user) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('landing');
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentView, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[#FDF9F1] text-gray-800 font-sans selection:bg-[#FF8C00] selection:text-white">
      <AnimatePresence mode="wait">
        {currentView === 'splash' && <SplashScreen key="splash" />}
        
        {currentView === 'landing' && (
          <LandingPage 
            key="landing" 
            onLoginClick={() => setIsLoginModalOpen(true)}
            onSignUpClick={() => setIsSignUpModalOpen(true)}
            onDemoTrusted={() => navigateTo('trusted')}
          />
        )}
        
        {currentView === 'dashboard' && (
           <Dashboard 
             key="dashboard" 
             user={user} 
             packets={MOCK_PACKETS}
             assigned={assignedPackets}
             onLogout={handleLogout}
           />
        )}
        
        {currentView === 'trusted' && (
           <TrustedPortal 
             key="trusted" 
             onProceedToLegal={() => navigateTo('legal')}
             onBack={() => navigateTo('landing')}
           />
        )}
        
        {currentView === 'legal' && (
           <LegalUploadPage 
             key="legal" 
             onBack={() => navigateTo('landing')}
           />
        )}
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
