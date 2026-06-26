import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Complaint } from '../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  ArrowUpDown, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Eye, 
  Building, 
  Sparkles, 
  AlertOctagon, 
  X, 
  User, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function Dashboard({ showToast }: { showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'priority'>('date');

  // Expanded Map and Image Preview states
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeAiId, setActiveAiId] = useState<string | null>(null);

  // Fetch from Firestore
  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Complaint[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Complaint);
      });
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to complaints:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const departments = ['All', 'Sanitation', 'Roads & Traffic', 'Water Supply', 'Public Safety', 'Health', 'Environment', 'Others'];
  const statuses = ['All', 'pending', 'in-progress', 'resolved', 'rejected'];
  const priorities = ['All', 'low', 'medium', 'high', 'critical'];

  // Filter & Sort Logic
  const filteredComplaints = complaints
    .filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'All' || c.department === selectedDept;
      const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
      const matchesPriority = selectedPriority === 'All' || c.priority === selectedPriority;
      return matchesSearch && matchesDept && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        return b.severity - a.severity; // Highest severity first
      }
      if (sortBy === 'priority') {
        const pValues = { critical: 4, high: 3, medium: 2, low: 1 };
        return (pValues[b.priority] || 0) - (pValues[a.priority] || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Latest first
    });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-555/10 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'in-progress':
        return 'bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'rejected':
        return 'bg-rose-100/80 text-rose-700 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
      default:
        return 'bg-blue-100/80 text-blue-700 border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-100/80 text-rose-800 border-rose-200/55 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';
      case 'high':
        return 'bg-amber-100/80 text-amber-800 border-amber-200/55 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
      case 'medium':
        return 'bg-blue-100/80 text-blue-800 border-blue-200/55 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-250 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left">
      {/* Dashboard Title */}
      <div className="space-y-1 mb-8">
        <h1 className="text-3xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
          Citizen Complaint Ledger
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Browse, filter, and track public issues processed by Gemini.
        </p>
      </div>

      {/* Glassmorphic Search & Filter Panel */}
      <div className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-neutral-400 dark:text-neutral-600" />
            <input
              type="text"
              placeholder="Search reports by keyword, address, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950/50 text-xs font-bold border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 text-neutral-800 dark:text-neutral-150 placeholder-neutral-450 dark:placeholder-neutral-600 transition-all"
              id="search-complaints-input"
            />
          </div>

          {/* Sort bar */}
          <div className="flex items-center gap-2 shrink-0 bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-2.5">
            <ArrowUpDown className="h-4 w-4 text-neutral-500" />
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-black text-neutral-800 dark:text-neutral-100 focus:outline-hidden cursor-pointer"
              id="select-sort"
            >
              <option value="date" className="bg-white dark:bg-neutral-900">Reporting Date</option>
              <option value="severity" className="bg-white dark:bg-neutral-900">AI Severity</option>
              <option value="priority" className="bg-white dark:bg-neutral-900">Triage Priority</option>
            </select>
          </div>
        </div>

        {/* Dropdown selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Department */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-450 dark:text-neutral-400 tracking-wider">Sector Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-all"
              id="filter-dept"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-white dark:bg-neutral-900">{dept}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-450 dark:text-neutral-400 tracking-wider">Status Filter</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-all"
              id="filter-status"
            >
              {statuses.map((status) => (
                <option key={status} value={status} className="bg-white dark:bg-neutral-900">
                  {status === 'All' ? 'All Statuses' : status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-neutral-455 dark:text-neutral-400 tracking-wider">Priority Level</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs font-bold bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-all"
              id="filter-priority"
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority} className="bg-white dark:bg-neutral-900">
                  {priority === 'All' ? 'All Priorities' : priority.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PUBLIC COMPLAINTS CARD GRID */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white/80 dark:bg-neutral-900/80 h-52 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4"
        >
          <AlertOctagon className="h-10 w-10 text-neutral-350 dark:text-neutral-600 mx-auto" />
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">No active complaints found</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">No matching logs were found in our datastore. Try loosening your filter criteria or register a new complaint.</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredComplaints.map((c) => {
              const steps = [
                { label: 'Filed', done: true },
                { label: 'Audited', done: c.status !== 'pending' },
                { label: 'Active', done: c.status === 'in-progress' || c.status === 'resolved' },
                { label: 'Resolved', done: c.status === 'resolved' },
              ];

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 shadow-xs hover:shadow-md rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden transition-all group"
                  id={`complaint-card-${c.id}`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-2 flex-grow">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-blue-750 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100/50 dark:border-blue-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                          <Building className="h-3.5 w-3.5" />
                          {c.department}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusStyle(c.status)}`}>
                          {c.status}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${getPriorityStyle(c.priority)}`}>
                          {c.priority}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display mt-2">{c.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-3 text-neutral-450 dark:text-neutral-500 text-xs mt-1">
                        <span className="flex items-center gap-1 font-bold">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <User className="h-3.5 w-3.5" />
                          Reported by {c.reporterName}
                        </span>
                        {c.isFake && (
                          <span className="bg-rose-50/80 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/40 text-rose-800 dark:text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">Spam Indicator</span>
                        )}
                      </div>
                    </div>

                    {/* AI Severity Indicator */}
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2.5 flex items-center gap-1.5 shrink-0 self-start">
                      <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      <div className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Severity: <span className="text-neutral-900 dark:text-neutral-100 font-black">{c.severity}/5</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal whitespace-pre-wrap">{c.description}</p>

                  {/* Pipeline Stepper */}
                  <div className="bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-150 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                    <span className="text-[10px] uppercase font-black text-neutral-400 dark:text-neutral-550 block tracking-wider">Department SLA Progress Pipeline</span>
                    
                    <div className="flex justify-between items-center relative">
                      <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-neutral-200 dark:bg-neutral-800 -z-0" />
                      
                      {steps.map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center relative z-10">
                          <div className={`h-5 w-5 rounded-full border-4 flex items-center justify-center text-[8px] font-black ${
                            s.done 
                              ? 'bg-blue-600 border-blue-200 dark:bg-blue-500 dark:border-blue-950/80 text-white' 
                              : 'bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-400'
                          }`}>
                            {s.done && '✓'}
                          </div>
                          <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-450 mt-1">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-neutral-150 dark:border-neutral-800 flex flex-col sm:flex-row justify-between text-xs gap-2 font-bold">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Projected SLA window: <span className="text-neutral-800 dark:text-neutral-200">{c.estimatedResolutionTime}</span>
                      </span>
                      {c.assignedOfficer && (
                        <span className="text-neutral-500 dark:text-neutral-400">
                          Dispatched Dispatcher: <span className="text-neutral-800 dark:text-neutral-200">{c.assignedOfficer}</span>
                        </span>
                      )}
                    </div>

                    {c.resolutionNotes && (
                      <div className="bg-emerald-550/5 border border-emerald-100/50 dark:bg-emerald-950/15 dark:border-emerald-900/40 rounded-xl p-3.5 text-xs mt-2 text-left">
                        <strong className="text-emerald-800 dark:text-emerald-450 block mb-1">Resolution Officer Comments:</strong>
                        <span className="text-neutral-600 dark:text-neutral-350 leading-relaxed font-medium">{c.resolutionNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Action links & files attached */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {c.images && c.images.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-neutral-400 dark:text-neutral-500 mr-1 block">Attachments:</span>
                        {c.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setPreviewImage(img)}
                            className="h-10 w-12 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500 cursor-pointer shadow-xs transition-all hover:scale-105"
                          >
                            <img src={img} alt="Triage preview file" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="ml-auto flex items-center gap-3">
                      <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1 max-w-xs truncate" title={c.address}>
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        {c.address}
                      </span>
                      <button
                        onClick={() => setActiveAiId(activeAiId === c.id ? null : c.id)}
                        className="text-[11px] font-black text-blue-600 hover:text-blue-500 dark:text-blue-450 dark:hover:text-blue-400 border border-neutral-200 dark:border-neutral-850 rounded-full px-4 py-2 flex items-center gap-1 cursor-pointer bg-neutral-50 dark:bg-neutral-950 transition-all hover:scale-103 shadow-xs"
                        id={`btn-toggle-ai-${c.id}`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                        {activeAiId === c.id ? 'Hide AI Details' : 'View AI Diagnostics'}
                      </button>
                      <button
                        onClick={() => setActiveMapId(activeMapId === c.id ? null : c.id)}
                        className="text-[11px] font-black text-blue-600 hover:text-blue-500 dark:text-blue-450 dark:hover:text-blue-400 border border-neutral-200 dark:border-neutral-850 rounded-full px-4 py-2 flex items-center gap-1 cursor-pointer bg-neutral-50 dark:bg-neutral-950 transition-all hover:scale-103 shadow-xs"
                        id={`btn-toggle-map-${c.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {activeMapId === c.id ? 'Hide Pin' : 'Geolocate Pin'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable AI Diagnostics Panel */}
                  {activeAiId === c.id && (
                    <div className="border border-blue-100/50 dark:border-blue-900/30 bg-blue-50/20 dark:bg-neutral-950/40 rounded-2xl p-4 sm:p-5 space-y-4 text-xs animate-fade-in mt-4 text-left">
                      <h4 className="text-xs uppercase font-black text-blue-750 dark:text-blue-300 tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                        AI Telemetry & Forensic Triage Analysis
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Analysis Confidence</span>
                            <span className="text-sm font-black text-neutral-900 dark:text-neutral-50 mt-1 block">
                              {c.confidence !== undefined ? `${c.confidence}%` : '95%'}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full" style={{ width: `${c.confidence !== undefined ? c.confidence : 95}%` }} />
                          </div>
                        </div>

                        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Crew Repair Estimate</span>
                            <span className="text-sm font-black text-neutral-900 dark:text-neutral-50 mt-1 block">
                              {c.estimatedRepairTime || '4 hours'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Anomaly/Fake Risk</span>
                            <span className="text-sm font-black text-neutral-900 dark:text-neutral-50 mt-1 block">
                              {c.fakeComplaintProbability !== undefined ? `${c.fakeComplaintProbability}%` : '8%'}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${c.fakeComplaintProbability !== undefined ? c.fakeComplaintProbability : 8}%` }} />
                          </div>
                        </div>
                      </div>

                      {c.detectedIssues && c.detectedIssues.length > 0 && (
                        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Detected Issue Classifications</span>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {c.detectedIssues.map((issue, idx) => (
                              <span key={idx} className="bg-blue-50 dark:bg-blue-950/40 text-blue-750 dark:text-blue-300 px-2.5 py-1 rounded-full text-[9px] font-black border border-blue-100/50 dark:border-blue-900/30 uppercase tracking-wider">
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(c.recommendedAction || c.suggestedAction) && (
                        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Recommended Dispatch Action</span>
                          <p className="text-neutral-700 dark:text-neutral-300 font-bold leading-relaxed">{c.recommendedAction || c.suggestedAction}</p>
                        </div>
                      )}

                      {c.citizenTips && (
                        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/45 dark:border-amber-900/30 rounded-xl p-3.5 text-neutral-850 dark:text-neutral-300 flex gap-2.5">
                          <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <strong className="text-amber-800 dark:text-amber-400 block font-black uppercase tracking-wider text-[10px]">Citizen Safety Precautions</strong>
                            <span className="leading-relaxed font-semibold text-neutral-700 dark:text-neutral-300">{c.citizenTips}</span>
                          </div>
                        </div>
                      )}

                      {c.aiReasoning && (
                        <div className="bg-white/55 dark:bg-neutral-900/50 border border-neutral-150 dark:border-neutral-850 rounded-xl p-3.5 space-y-1.5">
                          <span className="text-[10px] uppercase font-black text-neutral-500 dark:text-neutral-400 tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                            AI Analysis Reasoning & Methodology
                          </span>
                          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium whitespace-pre-line">{c.aiReasoning}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expandable Google maps pin frame */}
                  {activeMapId === c.id && (
                    <div className="border border-neutral-200 dark:border-neutral-850 rounded-2xl overflow-hidden h-64 shadow-inner relative animate-fade-in mt-4">
                      {hasValidKey ? (
                        <APIProvider apiKey={API_KEY} version="weekly">
                          <Map
                            defaultCenter={{ lat: c.latitude, lng: c.longitude }}
                            defaultZoom={15}
                            mapId="DEMO_MAP_ID"
                            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                            style={{ width: '100%', height: '100%' }}
                          >
                            <AdvancedMarker position={{ lat: c.latitude, lng: c.longitude }}>
                              <Pin background="#f43f5e" glyphColor="#fff" />
                            </AdvancedMarker>
                          </Map>
                        </APIProvider>
                      ) : (
                        <div className="bg-neutral-50 dark:bg-neutral-950 h-full flex flex-col items-center justify-center p-4 text-center">
                          <MapPin className="h-8 w-8 text-rose-400 mb-2 animate-bounce" />
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">Google Maps Marker</span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Lat: {c.latitude} | Lng: {c.longitude}</span>
                          <span className="text-[10px] text-neutral-500 max-w-xs mt-1.5 leading-relaxed">Ensure a <code>GOOGLE_MAPS_PLATFORM_KEY</code> is enabled inside Settings secrets to load real map frames.</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative flex flex-col"
            >
              <div className="px-5 py-3.5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/60">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-wider">Citizen Evidence Attachment</span>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-neutral-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-3 bg-neutral-950 flex items-center justify-center max-h-[75vh]">
                <img src={previewImage} alt="Expanded evidence file" className="max-w-full max-h-[70vh] object-contain rounded-2xl" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
