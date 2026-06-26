import { useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInAnonymously, signOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Shield, 
  MapPin, 
  BarChart3, 
  AlertTriangle, 
  FileText, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Menu, 
  X,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Navbar({ currentPage, onPageChange, isDarkMode, toggleDarkMode }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in anonymously:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: FileText },
    { id: 'report', label: 'Report', icon: AlertTriangle },
    { id: 'dashboard', label: 'My Dashboard', icon: BarChart3 },
    { id: 'map', label: 'Interactive Map', icon: MapPin },
    { id: 'authority', label: 'Authority Panel', icon: Shield },
  ];

  return (
    <nav className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50 sticky top-0 z-50 transition-colors duration-300 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => { onPageChange('home'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2.5 text-blue-600 font-bold text-xl font-display tracking-tight cursor-pointer focus:outline-hidden group"
              id="brand-logo"
            >
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2 rounded-xl group-hover:scale-105 active:scale-95 transition-transform shadow-md shadow-blue-500/10">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-neutral-900 dark:text-neutral-50 font-black tracking-tight flex items-center">
                Civic
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent ml-0.5">
                  AI
                </span>
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                    id={`nav-item-${item.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Toggle & Auth Actions */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer focus:outline-hidden"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              id="theme-toggle"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {authLoading ? (
              <div className="h-9 w-24 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-full" />
            ) : user ? (
              <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-800/50 rounded-full py-1.5 pl-3 pr-2 shadow-xs">
                <div className="flex items-center gap-2">
                  {user.isAnonymous ? (
                    <div className="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 p-1 rounded-full">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  ) : user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-6 w-6 rounded-full border border-neutral-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1 rounded-full">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                    {user.isAnonymous ? 'Anonymous' : user.displayName}
                  </span>
                  {user.isAnonymous && (
                    <span className="bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      Guest
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 p-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 cursor-pointer transition-colors"
                  title="Sign Out"
                  id="btn-signout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAnonymousLogin}
                  className="bg-neutral-100/80 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50 px-4 py-2 rounded-full text-xs font-extrabold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  id="btn-anon-login"
                >
                  Report Guest
                </button>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  id="btn-google-login"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu and theme controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              id="mobile-theme-toggle"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 focus:outline-hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 pt-2 pb-4 space-y-1 shadow-inner transition-colors">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 w-full text-left px-4 py-3 rounded-2xl text-xs font-extrabold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                id={`mobile-nav-item-${item.id}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {authLoading ? (
              <div className="h-8 w-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3">
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 font-extrabold">
                    User: {user.isAnonymous ? 'Anonymous' : user.displayName}
                  </span>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-2xl text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  id="mobile-btn-signout"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2 px-1">
                <button
                  onClick={() => { handleAnonymousLogin(); setMobileMenuOpen(false); }}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-colors"
                  id="mobile-btn-anon-login"
                >
                  Report As Guest
                </button>
                <button
                  onClick={() => { handleGoogleLogin(); setMobileMenuOpen(false); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                  id="mobile-btn-google-login"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In with Google
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

