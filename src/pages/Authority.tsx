import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Complaint } from '../types';
import { Shield, Users, CheckCircle, Clock, AlertTriangle, Trash, ArrowUpDown, ChevronDown, Check, Sparkles, Building, User, MapPin, Search, BarChart3, Edit3, X, HelpCircle } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function Authority({ showToast }: { showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected complaint for editing status/dispatching
  const [editingId, setEditingId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [notes, setNotes] = useState('');
  const [statusVal, setStatusVal] = useState<'pending' | 'in-progress' | 'resolved' | 'rejected'>('pending');
  const [isFakeVal, setIsFakeVal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Map state
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Load complaints
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
      console.error('Error fetching complaints:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const departments = ['All', 'Sanitation', 'Roads & Traffic', 'Water Supply', 'Public Safety', 'Health', 'Environment', 'Others'];

  // Apply Department and Search Filters
  const filteredComplaints = complaints.filter((c) => {
    const matchesDept = selectedDept === 'All' || c.department === selectedDept;
    const matchesSearch = 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Calculate dynamic stats based on filtered list
  const stats = {
    total: filteredComplaints.length,
    pending: filteredComplaints.filter((c) => c.status === 'pending' && !c.isFake).length,
    inProgress: filteredComplaints.filter((c) => c.status === 'in-progress' && !c.isFake).length,
    resolved: filteredComplaints.filter((c) => c.status === 'resolved' && !c.isFake).length,
    critical: filteredComplaints.filter((c) => c.priority === 'critical' && !c.isFake).length,
    fakeReports: filteredComplaints.filter((c) => c.isFake).length,
  };

  // Recharts Chart 1: Complaints by Department
  const getDeptChartData = () => {
    return departments.slice(1).map((dept) => ({
      name: dept,
      Complaints: filteredComplaints.filter((c) => c.department === dept).length,
    }));
  };

  // Recharts Chart 2: Complaints by Status
  const getStatusChartData = () => {
    return [
      { name: 'Pending', value: stats.pending, color: '#3b82f6' },
      { name: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
      { name: 'Resolved', value: stats.resolved, color: '#10b981' },
      { name: 'Spam/Fake', value: stats.fakeReports, color: '#f43f5e' },
    ].filter(item => item.value > 0);
  };

  const handleStartEdit = (c: Complaint) => {
    setEditingId(c.id);
    setOfficerName(c.assignedOfficer || '');
    setNotes(c.resolutionNotes || '');
    setStatusVal(c.status);
    setIsFakeVal(c.isFake || false);
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setSaving(true);
    try {
      const complaintRef = doc(db, 'complaints', editingId);
      await updateDoc(complaintRef, {
        status: statusVal,
        assignedOfficer: officerName,
        resolutionNotes: notes,
        isFake: isFakeVal,
      });
      setEditingId(null);
      if (showToast) {
        showToast('Complaint dispatch and status updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to update complaint audit:', err);
      if (showToast) {
        showToast('Error updating municipal database. Please try again.', 'error');
      } else {
        alert('Error updating database. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Assign Marker Color based on Status/Severity
  const getMarkerColor = (c: Complaint) => {
    if (c.isFake) return '#94a3b8'; // gray for fake
    if (c.status === 'resolved') return '#10b981'; // emerald green
    if (c.status === 'in-progress') return '#f59e0b'; // amber orange
    if (c.priority === 'critical') return '#f43f5e'; // deep red
    return '#3b82f6'; // blue for pending
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-rose-100/80 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/50';
      case 'high': return 'bg-amber-100/80 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900/50';
      case 'medium': return 'bg-blue-100/80 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-450 dark:border-blue-900/50';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  };

  const selectedComplaintForMarker = complaints.find(c => c.id === selectedMarkerId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-500 dark:text-blue-400" />
            Municipal Authority Panel
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Real-time control room for municipal routing, status resolution, and dispatcher dispatching.
          </p>
        </div>

        {/* Global Department Filter */}
        <div className="flex items-center gap-3 bg-white/75 dark:bg-neutral-900/75 border border-neutral-200/55 dark:border-neutral-800/55 rounded-2xl px-4 py-2.5 shadow-md shrink-0 backdrop-blur-md">
          <Building className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-350">Active Sector:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-transparent text-xs font-black text-blue-650 dark:text-blue-400 focus:outline-hidden cursor-pointer"
            id="auth-dept-filter"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept} className="bg-white dark:bg-neutral-900">{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-4 h-4.5 w-4.5 text-neutral-400 dark:text-neutral-600" />
        <input
          type="text"
          placeholder="Filter table or maps by description keywords, landmark coordinates, or reported titles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl text-xs font-bold text-neutral-800 dark:text-neutral-100 placeholder-neutral-450 dark:placeholder-neutral-550 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 transition-all shadow-xs"
          id="auth-search-input"
        />
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Cases', val: stats.total, color: 'text-neutral-850 dark:text-neutral-100' },
          { label: 'Pending Logs', val: stats.pending, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'In Progress', val: stats.inProgress, color: 'text-amber-550 dark:text-amber-400' },
          { label: 'Resolved', val: stats.resolved, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Critical Hazards', val: stats.critical, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Spam/Fake Logs', val: stats.fakeReports, color: 'text-neutral-500 dark:text-neutral-500' },
        ].map((s, idx) => (
          <div key={idx} className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-450 dark:text-neutral-400 tracking-wider">{s.label}</span>
            <span className={`text-2xl font-black mt-2 block ${s.color}`}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* CHARTS CONTAINER (Bar & Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department chart */}
        <div className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl p-5 shadow-md space-y-4">
          <h3 className="text-xs uppercase font-extrabold text-neutral-400 dark:text-neutral-450 tracking-wider flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-blue-500 dark:text-blue-450" />
            Complaint Volume by Sector Department
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDeptChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888888' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#888888' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(23, 23, 23, 0.9)', 
                    border: '1px solid rgba(63, 63, 63, 0.5)', 
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#ffffff'
                  }} 
                />
                <Bar dataKey="Complaints" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status pie chart */}
        <div className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl p-5 shadow-md space-y-4">
          <h3 className="text-xs uppercase font-extrabold text-neutral-400 dark:text-neutral-455 tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-450" />
            Active issue lifecycle statistics
          </h3>
          <div className="h-64 flex items-center justify-center">
            {getStatusChartData().length === 0 ? (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">No active complaints reported in selection</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {getStatusChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(23, 23, 23, 0.9)', 
                      border: '1px solid rgba(63, 63, 63, 0.5)', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#ffffff'
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10, fill: '#888888' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* AUTHORITY MAP MARKERS BOX */}
      <div className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl overflow-hidden shadow-md space-y-4 p-5">
        <h3 className="text-xs uppercase font-extrabold text-neutral-400 dark:text-neutral-450 tracking-wider flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-rose-500" />
          Interactive Dispatch Locator Map
        </h3>

        <div className="h-80 rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-850 relative">
          {hasValidKey ? (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
                defaultZoom={12}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                {filteredComplaints.map((c) => (
                  <AdvancedMarker
                    key={c.id}
                    position={{ lat: c.latitude, lng: c.longitude }}
                    onClick={() => setSelectedMarkerId(c.id)}
                  >
                    <Pin background={getMarkerColor(c)} glyphColor="#fff" scale={1.1} />
                  </AdvancedMarker>
                ))}

                {selectedMarkerId && selectedComplaintForMarker && (
                  <InfoWindow
                    position={{ lat: selectedComplaintForMarker.latitude, lng: selectedComplaintForMarker.longitude }}
                    onCloseClick={() => setSelectedMarkerId(null)}
                  >
                    <div className="p-1 space-y-1 max-w-[200px] text-left">
                      <strong className="text-xs block text-slate-800 font-display font-extrabold">{selectedComplaintForMarker.title}</strong>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">{selectedComplaintForMarker.department}</span>
                      <p className="text-[10px] text-slate-600 line-clamp-2">{selectedComplaintForMarker.description}</p>
                      <span className="text-[9px] font-bold block bg-blue-50 text-blue-600 px-1 py-0.5 rounded-sm uppercase text-center mt-1">
                        Severity: {selectedComplaintForMarker.severity}/5
                      </span>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            <div className="bg-neutral-50 dark:bg-neutral-950 h-full flex flex-col items-center justify-center p-6 text-center">
              <MapPin className="h-8 w-8 text-blue-500 mb-2 animate-bounce" />
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-350 block">Google Maps Controller Frame</span>
              <span className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-1 max-w-sm leading-relaxed">
                Map markers are inactive. Please configure <code>GOOGLE_MAPS_PLATFORM_KEY</code> in Secrets to track complaints on the physical grid.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* COMPLAINTS DATA TABLE */}
      <div className="bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl overflow-hidden shadow-md">
        <div className="px-6 py-5 border-b border-neutral-150 dark:border-neutral-800/80 flex justify-between items-center bg-white/50 dark:bg-neutral-950/30">
          <h3 className="text-xs uppercase font-black text-neutral-400 dark:text-neutral-400 tracking-wider">
            Complaint Records Ledger ({filteredComplaints.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-950/45 border-b border-neutral-200 dark:border-neutral-800 text-neutral-450 dark:text-neutral-400 text-[10px] uppercase font-black tracking-wider">
                <th className="px-6 py-4">Case Details</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 text-center">Risk Index</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Dispatch Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
              {filteredComplaints.map((c) => (
                <tr key={c.id} className={`hover:bg-neutral-50/40 dark:hover:bg-neutral-950/20 transition-colors ${c.isFake ? 'opacity-65 bg-neutral-100/20 dark:bg-neutral-800/10' : ''}`}>
                  {/* Case Details */}
                  <td className="px-6 py-5 max-w-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                        {c.isFake && (
                          <span className="bg-rose-100/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide">SPAM</span>
                        )}
                        <span className="truncate">{c.title}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-relaxed">{c.description}</p>
                      <div className="text-[9px] text-neutral-400 dark:text-neutral-500 flex items-center gap-2 mt-0.5 font-bold">
                        <span>Ref: {c.id.substring(0, 8)}</span>
                        <span>•</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-6 py-5 text-xs font-black text-neutral-700 dark:text-neutral-200">
                    {c.department}
                  </td>

                  {/* Severity */}
                  <td className="px-6 py-5 text-center">
                    <span className="bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 text-xs font-black px-2.5 py-1 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                      {c.severity} / 5
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase border px-2.5 py-1 rounded-full ${getPriorityStyle(c.priority)}`}>
                      {c.priority}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' :
                      c.status === 'in-progress' ? 'bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50' :
                      c.status === 'rejected' ? 'bg-rose-100/80 text-rose-700 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' :
                      'bg-blue-100/80 text-blue-700 border-blue-200/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50'
                    }`}>
                      {c.status}
                    </span>
                    {c.assignedOfficer && (
                      <span className="block text-[9px] text-neutral-450 dark:text-neutral-500 mt-1.5 font-bold">
                        Dispatcher: {c.assignedOfficer}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => handleStartEdit(c)}
                      className="bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-black text-xs px-3.5 py-2 rounded-full border border-blue-200/50 dark:border-blue-900/45 cursor-pointer inline-flex items-center gap-1 transition-all hover:scale-103 shadow-2xs"
                      id={`btn-edit-audit-${c.id}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Triage Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPLAINT AUDIT MODAL DIALOG */}
      <AnimatePresence>
        {editingId && (
          <div className="fixed inset-0 z-[120] bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleSaveAudit} 
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl p-6 max-w-md w-full space-y-5"
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-850 pb-3">
                <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
                  <Shield className="h-5 w-5 text-blue-550" />
                  Diagnostic Case Triage
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-neutral-450 hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Dispatch status */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-600 dark:text-neutral-400">Update Resolution Stage</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['pending', 'in-progress', 'resolved', 'rejected'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusVal(st)}
                        className={`py-2.5 px-3 border rounded-xl text-xs font-bold text-center capitalize cursor-pointer transition-all ${
                          statusVal === st
                            ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-sm'
                            : 'bg-neutral-50 dark:bg-neutral-950/50 text-neutral-600 dark:text-neutral-350 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                        }`}
                      >
                        {st === 'in-progress' ? 'Active Dispatch' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assign Officer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-neutral-600 dark:text-neutral-400 block">Dispatch Field Officer</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="e.g. Officer Mark Wilson"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-xl focus:outline-hidden focus:border-blue-500 text-neutral-800 dark:text-neutral-100"
                    id="auth-officer-input"
                  />
                </div>

                {/* Resolution Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-neutral-600 dark:text-neutral-400 block">Resolution notes & instructions</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Update closure notes, dispatch schedules, or verification details..."
                    rows={3}
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-xl focus:outline-hidden focus:border-blue-500 text-neutral-800 dark:text-neutral-100"
                    id="auth-notes-textarea"
                  />
                </div>

                {/* Mark as Spam / Fake */}
                <div className="flex items-center gap-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3.5 rounded-xl">
                  <input
                    type="checkbox"
                    id="auth-spam-checkbox"
                    checked={isFakeVal}
                    onChange={(e) => setIsFakeVal(e.target.checked)}
                    className="h-4.5 w-4.5 text-blue-600 dark:text-blue-500 border-neutral-350 dark:border-neutral-800 rounded-md focus:ring-blue-500"
                  />
                  <label htmlFor="auth-spam-checkbox" className="text-xs font-black text-neutral-750 dark:text-neutral-300 cursor-pointer select-none">
                    Flag as spam index / duplicate report
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-neutral-100 dark:border-neutral-850">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-350 border border-neutral-200 dark:border-neutral-800 px-4 py-2.5 rounded-full text-xs font-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-5 py-2.5 rounded-full text-xs font-black cursor-pointer transition-colors shadow-sm"
                  id="btn-save-audit"
                >
                  {saving ? 'Saving...' : 'Confirm Audit'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
