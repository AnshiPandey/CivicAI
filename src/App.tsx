import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  FileText, 
  LayoutDashboard, 
  Map, 
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle
} from 'lucide-react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Report from './pages/Report';
import Dashboard from './pages/Dashboard';
import InteractiveMap from './pages/InteractiveMap';
import Authority from './pages/Authority';
import { db } from './lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('g-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  // Dark Mode side effects
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('g-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('g-theme', 'light');
    }
  }, [isDarkMode]);

  // Keep a global real-time listener on statistics so pages can show authentic dynamic counters
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'complaints'), (snapshot) => {
      let total = 0;
      let pending = 0;
      let inProgress = 0;
      let resolved = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.status === 'pending') pending++;
        else if (data.status === 'in-progress') inProgress++;
        else if (data.status === 'resolved') resolved++;
      });

      setStats({ total, pending, inProgress, resolved });
    }, (error) => {
      console.error('Error calculating global statistics:', error);
    });

    return () => unsubscribe();
  }, []);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setIsFabOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    showToast(`Switched to ${!isDarkMode ? 'Dark' : 'Light'} Mode`, 'info');
  };

  const handleComplaintCreated = () => {
    showToast('Civic report submitted successfully!', 'success');
    setCurrentPage('dashboard');
  };

  // Speed Dial actions for Material 3 FAB
  const fabActions = [
    { id: 'report', label: 'Report New Issue', icon: FileText, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { id: 'dashboard', label: 'Citizen Dashboard', icon: LayoutDashboard, color: 'bg-green-600 hover:bg-green-700 text-white' },
    { id: 'map', label: 'Interactive Grid', icon: Map, color: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
    { id: 'authority', label: 'Authority Console', icon: ShieldCheck, color: 'bg-red-500 hover:bg-red-600 text-white' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col text-slate-800 dark:text-neutral-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-300">
      {/* Dynamic Header & Auth Actions */}
      <Navbar 
        currentPage={currentPage} 
        onPageChange={handlePageChange} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
      />

      {/* Main Content Area with Page transition animation */}
      <main className="flex-grow relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full h-full pb-20"
          >
            {currentPage === 'home' && (
              <Home onPageChange={handlePageChange} stats={stats} />
            )}
            {currentPage === 'report' && (
              <Report onPageChange={handlePageChange} onComplaintCreated={handleComplaintCreated} showToast={showToast} />
            )}
            {currentPage === 'dashboard' && (
              <Dashboard showToast={showToast} />
            )}
            {currentPage === 'map' && (
              <InteractiveMap showToast={showToast} />
            )}
            {currentPage === 'authority' && (
              <Authority showToast={showToast} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* TOAST SYSTEM CONTAINER */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = {
              success: CheckCircle,
              error: XCircle,
              warning: AlertTriangle,
              info: Info
            }[toast.type];

            const colors = {
              success: 'bg-white/90 dark:bg-neutral-900/90 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50',
              error: 'bg-white/90 dark:bg-neutral-900/90 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50',
              warning: 'bg-white/90 dark:bg-neutral-900/90 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
              info: 'bg-white/90 dark:bg-neutral-900/90 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
            }[toast.type];

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`p-4 rounded-2xl border backdrop-blur-md shadow-xl flex items-center justify-between gap-3 pointer-events-auto ${colors}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 shrink-0" />
                  <p className="text-xs font-semibold leading-snug">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* FLOATING ACTION BUTTON (FAB) SPEED DIAL */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Speed Dial Menu items */}
        <AnimatePresence>
          {isFabOpen && (
            <div className="flex flex-col items-end gap-2.5 mb-2">
              {fabActions.map((action, idx) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.8, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 15 }}
                  transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 28 }}
                  onClick={() => handlePageChange(action.id)}
                  className="flex items-center gap-3 group pointer-events-auto cursor-pointer"
                >
                  {/* Label */}
                  <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/95 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 shadow-md border border-neutral-100 dark:border-neutral-800 backdrop-blur-xs group-hover:scale-105 transition-transform">
                    {action.label}
                  </span>
                  {/* Button Icon */}
                  <div className={`h-11 w-11 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-95 border border-white/10 ${action.color}`}>
                    <action.icon className="h-4.5 w-4.5" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Master FAB Trigger */}
        <motion.button
          onClick={() => setIsFabOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`h-14 w-14 rounded-3xl flex items-center justify-center shadow-xl border border-white/20 dark:border-neutral-800 cursor-pointer transition-colors duration-300 ${
            isFabOpen 
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' 
              : 'bg-blue-600 text-white dark:bg-blue-500'
          }`}
          aria-label="Quick Actions"
          id="main-fab"
        >
          <motion.div
            animate={{ rotate: isFabOpen ? 135 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Plus className="h-6 w-6" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}

