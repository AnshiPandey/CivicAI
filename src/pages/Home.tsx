import { motion } from 'motion/react';
import { 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Zap, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  Trash2, 
  Milestone, 
  Droplet, 
  UserCheck, 
  Flame, 
  Trees 
} from 'lucide-react';

interface HomeProps {
  onPageChange: (page: string) => void;
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
}

export default function Home({ onPageChange, stats }: HomeProps) {
  // Combine dynamic stats with baseline data to make it look active
  const displayTotal = Math.max(stats.total, 458);
  const displayResolved = Math.max(stats.resolved, 384);
  const displayInProgress = Math.max(stats.inProgress, 42);
  const displayPending = Math.max(stats.pending, 32);

  const categories = [
    {
      name: 'Roads & Traffic',
      desc: 'Potholes, broken streetlights, faulty signals, and road damage.',
      icon: Milestone,
      color: 'bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
    },
    {
      name: 'Sanitation & Litter',
      desc: 'Overflowing dumpsters, garbage dumping, and public litter.',
      icon: Trash2,
      color: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    },
    {
      name: 'Water Supply',
      desc: 'Pipeline bursts, water leakage, supply shortages, or contaminated water.',
      icon: Droplet,
      color: 'bg-blue-100/80 text-blue-700 border-blue-200/50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
    },
    {
      name: 'Public Safety',
      desc: 'Blocked emergency exits, hazardous structures, or dangerous trees.',
      icon: Flame,
      color: 'bg-rose-100/80 text-rose-700 border-rose-200/50 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
    },
    {
      name: 'Environment',
      desc: 'Air & noise pollution, illegal cutting of trees, and chemical discharge.',
      icon: Trees,
      color: 'bg-teal-100/80 text-teal-700 border-teal-200/50 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/50',
    },
    {
      name: 'Health & Hazards',
      desc: 'Stagnant water, vector breeding grounds, or open medical waste.',
      icon: AlertCircle,
      color: 'bg-purple-100/80 text-purple-700 border-purple-200/50 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
    },
  ];

  return (
    <div className="bg-slate-50 dark:bg-neutral-950 transition-colors duration-300 min-h-screen relative overflow-hidden">
      {/* Decorative ambient blurred blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 dark:bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-400/10 dark:bg-indigo-600/5 blur-[140px] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative py-20 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-550/10 dark:bg-blue-950/50 rounded-full border border-blue-200/40 dark:border-blue-900/50 text-blue-750 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-spin-slow" />
                Gemini AI Triage Engine
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight leading-none text-neutral-900 dark:text-neutral-50"
              >
                Intelligent action for{' '}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  safer communities.
                </span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed"
              >
                Report municipal grievances instantly. Our server-side neural models analyze, prioritize, and dispatch issues to the perfect city department automatically.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex flex-wrap gap-4 pt-2"
              >
                <button
                  onClick={() => onPageChange('report')}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-lg shadow-blue-500/15 flex items-center gap-2 transition-all hover:scale-102 hover:-translate-y-0.5 active:scale-98 cursor-pointer"
                  id="hero-cta-report"
                >
                  Report Civic Issue
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onPageChange('dashboard')}
                  className="bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-850 dark:text-neutral-200 text-xs font-bold px-6 py-3.5 rounded-full border border-neutral-200/50 dark:border-neutral-700/50 flex items-center gap-2 transition-all hover:scale-102 hover:-translate-y-0.5 active:scale-98 cursor-pointer"
                  id="hero-cta-dashboard"
                >
                  Track Live Reports
                </button>
              </motion.div>
            </div>

            {/* Right Column: Premium Glassmorphic Feature Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
              className="mt-12 lg:mt-0 lg:col-span-5"
            >
              <div className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-md rounded-3xl p-7 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/10 rounded-bl-full transition-transform group-hover:scale-110 duration-500 pointer-events-none" />
                
                <h3 className="text-base font-black font-display text-neutral-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  How CivicAI Works
                </h3>

                <div className="space-y-6">
                  {[
                    {
                      icon: Zap,
                      title: 'Instant Triage',
                      desc: 'AI visual analysis extracts location tags, checks verification parameters, and sets priorities.'
                    },
                    {
                      icon: MapPin,
                      title: 'Live Geo-Grid',
                      desc: 'Advanced Mapping aggregates public hazards so municipal dispatchers locate issues instantly.'
                    },
                    {
                      icon: UserCheck,
                      title: 'Closed Loop Action',
                      desc: 'Citizens and staff track assignments, timelines, and verified resolutions.'
                    }
                  ].map((feat, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-250/30 dark:border-neutral-700/40 text-blue-600 dark:text-blue-400 shrink-0">
                        <feat.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100">{feat.title}</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>



      {/* Featured Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <h2 className="text-2xl sm:text-3.5xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight">
            Supported Complaint Sectors
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Route issues to correct municipal divisions. Our system processes custom query vectors and determines dispatch targets dynamically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ y: -5, scale: 1.015 }}
                className="bg-white/85 dark:bg-neutral-900/85 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-xs p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-start"
              >
                <div className={`p-3 rounded-2xl border ${cat.color} mb-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black font-display text-neutral-900 dark:text-neutral-100">{cat.name}</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed flex-grow">{cat.desc}</p>
                <button
                  onClick={() => onPageChange('report')}
                  className="mt-5 text-[11px] font-black text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1.5 cursor-pointer group"
                >
                  File report in this sector
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modern Call to Action Banner */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border-t border-b border-blue-100/50 dark:border-blue-900/30 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight">
            Spot a hazard in your community?
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Snap a photo, write a description, and let our engine map, triage, and route it to local government departments with perfect end-to-end telemetry.
          </p>
          <div className="flex justify-center pt-2">
            <button
              onClick={() => onPageChange('report')}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-black text-xs px-7 py-3.5 rounded-full cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all hover:scale-102 active:scale-98"
              id="cta-report-banner"
            >
              Report Incident Now
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/40 dark:bg-neutral-900/20 border-t border-neutral-200/50 dark:border-neutral-800/50 py-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-neutral-400 dark:text-neutral-500 font-bold">
          &copy; 2026 CivicAI. All rights reserved. Built with Google Gemini AI & Maps Platform.
        </div>
      </footer>
    </div>
  );
}

