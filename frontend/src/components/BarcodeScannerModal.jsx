import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, Barcode, Volume2, VolumeX, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { playBarcodeBeep } from '../utils/soundHelper';
import { toast } from 'sonner';

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Product Barcode",
  subtitle = "Align product barcode within frame or type barcode manually"
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);

  const scannerRef = useRef(null);
  const containerId = "barcode-scanner-video-region";

  // Enumerate cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    Html5Qrcode.getCameras()
      .then(devices => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError("No cameras detected on this device. You can type the barcode below.");
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn("Camera enumeration error:", err);
        setCameraError("Camera access denied or unavailable. You can type or paste barcode below.");
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Start scanner when camera is selected
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 260, height: 160 },
      aspectRatio: 1.3333
    };

    html5QrCode.start(
      selectedCameraId,
      config,
      (decodedText) => {
        const cleanText = decodedText.trim();
        if (cleanText) {
          if (soundEnabled) playBarcodeBeep('success');
          setLastScanned(cleanText);
          onScan(cleanText);

          if (!continuousMode) {
            // Stop and close
            try {
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
                onClose();
              }).catch(() => onClose());
            } catch (e) {
              onClose();
            }
          } else {
            toast.success(`Scanned: ${cleanText}`);
          }
        }
      },
      (errorMessage) => {
        // Continuous decoding attempts, no need to spam logs
      }
    )
    .then(() => {
      setIsScanning(true);
      setCameraError('');
    })
    .catch(err => {
      console.error("Scanner start error:", err);
      setIsScanning(false);
      setCameraError("Could not start camera feed. Please check browser permissions or use manual entry.");
    });

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch (e) {}
        scannerRef.current = null;
      }
      setIsScanning(false);
    };
  }, [isOpen, selectedCameraId, continuousMode, soundEnabled]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    if (soundEnabled) playBarcodeBeep('success');
    setLastScanned(clean);
    onScan(clean);
    setManualCode('');
    if (!continuousMode) {
      onClose();
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden z-10 mx-auto flex flex-col text-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight uppercase">{title}</h3>
              <p className="text-[10.5px] text-slate-400 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Area */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[260px] overflow-hidden">
          <div id={containerId} className="w-full max-h-[300px] overflow-hidden flex items-center justify-center" />

          {/* Animated laser line overlay when scanning */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-[260px] h-[160px] border-2 border-emerald-500/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] overflow-hidden">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] animate-bounce duration-1000 absolute top-1/2" />
                <div className="absolute top-1 left-2 text-[9px] font-black tracking-widest text-emerald-300 uppercase opacity-75">
                  ALIGN BARCODE
                </div>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-6 text-center space-y-2 max-w-xs">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-amber-200 font-bold">{cameraError}</p>
            </div>
          )}

          {/* Controls Bar over Camera */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                title="Switch Camera"
                className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-200 backdrop-blur-md border border-slate-600 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute Beep" : "Enable Beep"}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-200 backdrop-blur-md border border-slate-600 shadow-md cursor-pointer transition-all active:scale-95"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Last Scanned Status Badge */}
        {lastScanned && (
          <div className="bg-emerald-950/60 border-y border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Last Scanned:</span>
              <span className="font-mono font-black text-white">{lastScanned}</span>
            </span>
          </div>
        )}

        {/* Footer & Manual Input Option */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700/80 space-y-3">
          {/* Continuous Scan Checkbox */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Continuous Scan (Keep modal open):</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={e => setContinuousMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* Manual Input or Handheld Laser Scanner input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Or enter barcode number..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 shadow-md cursor-pointer"
            >
              <span>Submit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default BarcodeScannerModal;
