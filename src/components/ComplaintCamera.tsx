import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface ComplaintCameraProps {
  onPhotoCaptured: (base64Photo: string) => void;
}

export default function ComplaintCamera({ onPhotoCaptured }: ComplaintCameraProps) {
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    setIsActive(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Default to rear camera on mobile
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please check browser permissions.');
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Set canvas to match video stream size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert to compressed jpeg base64
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onPhotoCaptured(photoDataUrl);
      stopCamera();
    }
  };

  return (
    <div className="space-y-3">
      {!isActive ? (
        <button
          type="button"
          onClick={startCamera}
          className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 px-4.5 py-3 rounded-2xl text-xs font-black cursor-pointer transition-all hover:scale-102"
          id="btn-open-camera"
        >
          <Camera className="h-4.5 w-4.5 text-blue-500" />
          Capture Live Photo
        </button>
      ) : (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden max-w-md w-full relative shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-800/80 flex justify-between items-center bg-neutral-950">
              <span className="text-xs font-black text-neutral-350 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-blue-500" />
                Live Camera Feed
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="text-neutral-450 hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-800/80 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Box */}
            <div className="relative bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="p-5 bg-neutral-950 flex justify-around items-center">
              <button
                type="button"
                onClick={stopCamera}
                className="bg-neutral-800 hover:bg-neutral-750 text-neutral-300 px-5 py-2.5 rounded-full text-xs font-black cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="bg-blue-600 hover:bg-blue-550 text-white h-16 w-16 rounded-full flex items-center justify-center shadow-lg border-4 border-neutral-900 cursor-pointer focus:outline-hidden transition-all hover:scale-105"
                id="btn-shutter-click"
                title="Capture Photo"
              >
                <div className="h-7 w-7 rounded-full bg-white animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-bold shadow-xs">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
