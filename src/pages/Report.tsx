import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { 
  AlertTriangle, 
  Upload, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Building, 
  Info, 
  Loader2,
  Camera,
  ArrowLeft
} from 'lucide-react';
import ComplaintMapSelection from '../components/ComplaintMapSelection';
import ComplaintCamera from '../components/ComplaintCamera';

interface ReportProps {
  onPageChange: (page: string) => void;
  onComplaintCreated: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Report({ onPageChange, onComplaintCreated, showToast }: ReportProps) {
  // Input fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Sanitation'); // Default, will be AI categorized
  const [location, setLocation] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    address: '',
  });

  // State for images
  const [images, setImages] = useState<string[]>([]); // base64 images
  const [dragActive, setDragActive] = useState(false);

  // Loading and result states
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compress image on the client to fit in Firestore (~100KB max per image)
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75)); // 75% quality JPEG
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  // Convert File object to base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (fileList: FileList) => {
    const newImages: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type.startsWith('image/')) {
        try {
          const base64Raw = await fileToBase64(file);
          const compressed = await compressImage(base64Raw);
          newImages.push(compressed);
        } catch (err) {
          console.error('Error processing image:', err);
        }
      }
    }
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      showToast(`Successfully added ${newImages.length} image(s) as evidence`, 'success');
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Evidence photo removed', 'info');
  };

  const handlePhotoCaptured = async (base64Photo: string) => {
    const compressed = await compressImage(base64Photo);
    setImages((prev) => [...prev, compressed]);
    showToast('Live site photo captured successfully', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.address) {
      setError('Please specify a location or landmark address.');
      showToast('Location is required', 'error');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Submit to Gemini backend proxy
      setSubmitStep('Analyzing with Google Gemini...');
      const response = await fetch('/api/analyze-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          images: images.slice(0, 3), // Limit to top 3 images for Gemini limits
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gemini AI was unable to parse this complaint.');
      }

      const aiAnalysis = await response.json();

      // Step 2: Store complaint in Firestore database
      setSubmitStep('Dispatching & saving to Firestore...');
      const currentUser = auth.currentUser;
      const reporterUid = currentUser?.uid || 'anonymous';
      const reporterName = currentUser?.isAnonymous 
        ? 'Anonymous' 
        : currentUser?.displayName || 'Anonymous Citizen';

      const complaintDoc = {
        title,
        description,
        department: aiAnalysis.department || department,
        severity: aiAnalysis.severity || 3,
        priority: aiAnalysis.priority || 'medium',
        status: 'pending',
        estimatedResolutionTime: aiAnalysis.estimatedResolutionTime || '3 days',
        estimatedRepairTime: aiAnalysis.estimatedRepairTime || '4 hours',
        suggestedAction: aiAnalysis.suggestedAction || 'Awaiting municipal inspection.',
        recommendedAction: aiAnalysis.recommendedAction || aiAnalysis.suggestedAction || 'Awaiting municipal inspection.',
        confidence: aiAnalysis.confidence || 90,
        citizenTips: aiAnalysis.citizenTips || 'Exercise caution when transiting the area.',
        fakeComplaintProbability: aiAnalysis.fakeComplaintProbability || 10,
        detectedIssues: aiAnalysis.detectedIssues || [],
        aiReasoning: aiAnalysis.aiReasoning || 'Text-based visual telemetry verification completed.',
        images,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        createdAt: new Date().toISOString(),
        reportedBy: reporterUid,
        reporterName,
        isFake: aiAnalysis.isFake || false,
      };

      await addDoc(collection(db, 'complaints'), complaintDoc);

      setAnalysisResult(complaintDoc);
      onComplaintCreated();
      showToast('Civic issue filed successfully!', 'success');
    } catch (err: any) {
      console.error('Submission failure:', err);
      const errMsg = err.message || 'An error occurred while filing your complaint. Please try again.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
      setSubmitStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <AnimatePresence mode="wait">
        {analysisResult ? (
          /* SUCCESS SUMMARY CARD */
          <motion.div 
            key="success-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-left"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-550/10 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight">
                Report Submitted!
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                CivicAI has successfully triaged your report using Google Gemini 3.5 Flash.
              </p>
            </div>

            <div className="bg-blue-50/40 dark:bg-neutral-950/50 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl p-5 space-y-5">
              <h3 className="text-xs uppercase font-black text-blue-750 dark:text-blue-300 tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                Gemini AI Diagnostics & Real-time Analysis
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Assigned Sector</span>
                  <span className="text-sm font-black text-neutral-900 dark:text-neutral-50">{analysisResult.department}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Severity Level</span>
                  <span className="text-sm font-black text-neutral-900 dark:text-neutral-50 flex items-center gap-1">
                    {analysisResult.severity} / 5
                    <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                      ({analysisResult.severity >= 4 ? 'Critical' : analysisResult.severity >= 3 ? 'High' : 'Medium'})
                    </span>
                  </span>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Triage Priority</span>
                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    analysisResult.priority === 'critical' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' :
                    analysisResult.priority === 'high' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-450'
                  }`}>
                    {analysisResult.priority}
                  </span>
                </div>
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Resolution SLA</span>
                  <span className="text-sm font-black text-neutral-900 dark:text-neutral-50">{analysisResult.estimatedResolutionTime}</span>
                </div>
              </div>

              {/* Extra Triage Fields (Confidence, Active Repair, Fake Probability) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">AI Confidence</span>
                    <span className="text-sm font-black text-neutral-900 dark:text-neutral-50">{analysisResult.confidence}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full" style={{ width: `${analysisResult.confidence}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Estimated Crew Repair Time</span>
                  <span className="text-sm font-black text-neutral-900 dark:text-neutral-50">{analysisResult.estimatedRepairTime}</span>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Fake Complaint Risk</span>
                    <span className="text-sm font-black text-neutral-900 dark:text-neutral-50">{analysisResult.fakeComplaintProbability}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${analysisResult.fakeComplaintProbability}%` }} />
                  </div>
                </div>
              </div>

              {/* Detected Issue Tags */}
              {analysisResult.detectedIssues && analysisResult.detectedIssues.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs space-y-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Detected Visual/Textual Issues</span>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.detectedIssues.map((issue: string, idx: number) => (
                      <span key={idx} className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-350 px-2.5 py-1 rounded-full text-[10px] font-black border border-blue-100/50 dark:border-blue-900/30 uppercase tracking-wider">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Action */}
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wide">Recommended Dispatch Action</span>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-bold">{analysisResult.recommendedAction}</p>
              </div>

              {/* Citizen Safety Tips */}
              {analysisResult.citizenTips && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-250/30 dark:border-amber-900/30 rounded-xl p-4 text-xs flex gap-2.5 text-neutral-850 dark:text-neutral-300">
                  <Info className="h-5 w-5 text-amber-600 dark:text-amber-455 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <strong className="text-amber-800 dark:text-amber-400 block font-black uppercase tracking-wider text-[10px]">Precautionary Citizen Tips</strong>
                    <span className="leading-relaxed font-semibold">{analysisResult.citizenTips}</span>
                  </div>
                </div>
              )}

              {/* AI Reasoning display */}
              {analysisResult.aiReasoning && (
                <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-150 dark:border-neutral-850 rounded-xl p-4 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-black text-neutral-500 dark:text-neutral-450 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    AI Reasoning & Visual Evidence Analysis
                  </span>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium whitespace-pre-line">{analysisResult.aiReasoning}</p>
                </div>
              )}

              {analysisResult.isFake && (
                <div className="bg-rose-50 border border-rose-200/50 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-xl p-3 text-rose-800 dark:text-rose-400 text-xs flex gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Note:</strong> Gemini flagged this report with high anomaly scores ({analysisResult.fakeComplaintProbability}%). Local moderators have been alerted for verification.
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setTitle('');
                  setDescription('');
                  setImages([]);
                }}
                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60 font-bold text-xs px-5 py-3 rounded-full cursor-pointer transition-all"
              >
                Report Another Issue
              </button>
              <button
                onClick={() => onPageChange('dashboard')}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-black text-xs px-5 py-3 rounded-full shadow-md cursor-pointer transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        ) : (
          /* FILE COMPLAINT FORM */
          <motion.form 
            key="report-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit} 
            className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-8 text-left"
          >
            <div className="border-b border-neutral-150 dark:border-neutral-800 pb-5">
              <h2 className="text-2xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                File a Civic Complaint
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Provide real-time photos and description. Our server-side AI analyzes and routes it to local departments.
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200/50 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-450 p-4 rounded-2xl text-xs flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: INCIDENT DETAILS */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-neutral-450 dark:text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-800 pb-1.5 flex items-center gap-2">
                <Building className="h-4 w-4" />
                1. Incident Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1.5">Brief Complaint Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Blocked sewer drainage line"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-2xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 font-bold transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                    required
                    id="complaint-title-input"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1.5">Detailed Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details of the hazard, scope of impact, and any notes on immediate safety risks..."
                    rows={4}
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 px-4 py-3 rounded-2xl focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/5 font-medium transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                    required
                    id="complaint-desc-input"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: EVIDENCE */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-neutral-450 dark:text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-800 pb-1.5 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                2. Capture or Upload Evidence
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Drag & Drop */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/5'
                      : 'border-neutral-250 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-neutral-50 dark:hover:bg-neutral-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="h-7 w-7 text-neutral-400 dark:text-neutral-600 mb-2.5" />
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Drag & drop photos here</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">or click to browse local storage</p>
                </div>

                {/* Live Camera Component */}
                <div className="bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/60 dark:border-neutral-850 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold text-center">Capture Live Scene Evidence</p>
                  <ComplaintCamera onPhotoCaptured={handlePhotoCaptured} />
                </div>
              </div>

              {/* Photos Preview Grid */}
              {images.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-350">Attached Previews ({images.length})</h4>
                  <div className="flex flex-wrap gap-3">
                    {images.map((base64Url, index) => (
                      <div key={index} className="relative h-20 w-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm group">
                        <img src={base64Url} alt={`Evidence preview ${index + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1.5 right-1.5 bg-neutral-900/80 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-xs cursor-pointer transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: MAP / LOCATION */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-neutral-450 dark:text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-800 pb-1.5 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                3. Pin Incident Coordinates
              </h3>
              <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <ComplaintMapSelection location={location} onChange={setLocation} />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="pt-6 border-t border-neutral-150 dark:border-neutral-800 flex flex-wrap gap-3 justify-between items-center">
              <button
                type="button"
                onClick={() => onPageChange('home')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-black text-xs px-6 py-3.5 rounded-full shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-submit-complaint"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing details...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze & Submit</span>
                  </>
                )}
              </button>
            </div>

            {/* INTERACTIVE FULLBACK MODAL LOADER */}
            {submitting && (
              <div className="fixed inset-0 z-[100] bg-neutral-950/65 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl p-8 max-w-sm w-full rounded-3xl text-center space-y-5"
                >
                  <div className="h-14 w-14 bg-blue-50 dark:bg-neutral-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-100">CivicAI Neural Triage</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold animate-pulse">{submitStep}</p>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 dark:bg-blue-500 h-full w-2/3 rounded-full animate-infinite-slide" />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

