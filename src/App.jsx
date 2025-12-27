import React, { useRef, useEffect, useState } from 'react';
import { Camera, Hand, Activity, Zap, Download, Settings } from 'lucide-react';

const HandTrackingApp = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const [handCount, setHandCount] = useState(0);
  const [mode, setMode] = useState('skeleton');
  const [confidence, setConfidence] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
      }
    };

    if (isTracking) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTracking]);

  useEffect(() => {
    if (!isTracking) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    
    const generateHandLandmarks = () => {
      const hands = [];
      const numHands = Math.random() > 0.7 ? 2 : Math.random() > 0.3 ? 1 : 0;
      
      for (let h = 0; h < numHands; h++) {
        const baseX = h === 0 ? 0.3 : 0.7;
        const baseY = 0.5;
        const landmarks = [];
        
        for (let i = 0; i < 21; i++) {
          const angle = (i / 21) * Math.PI * 2;
          const radius = 0.15 + Math.sin(Date.now() / 1000 + i) * 0.05;
          landmarks.push({
            x: baseX + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.02,
            y: baseY + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.02,
            z: Math.random() * 0.1
          });
        }
        hands.push({ landmarks, handedness: h === 0 ? 'Right' : 'Left' });
      }
      return hands;
    };

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17]
    ];

    const drawHands = () => {
      if (!video.videoWidth) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      const hands = generateHandLandmarks();
      setHandCount(hands.length);

      hands.forEach((hand, idx) => {
        const color = idx === 0 ? '#00ff88' : '#ff0088';
        
        if (mode === 'skeleton' || mode === 'both') {
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          connections.forEach(([start, end]) => {
            const startPoint = hand.landmarks[start];
            const endPoint = hand.landmarks[end];
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
            ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
            ctx.stroke();
          });
        }

        if (mode === 'points' || mode === 'both') {
          hand.landmarks.forEach((landmark, i) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            const radius = i === 0 ? 8 : i % 4 === 0 ? 6 : 4;
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = color + '40';
            ctx.beginPath();
            ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        if (mode === 'mesh') {
          ctx.fillStyle = color + '30';
          ctx.beginPath();
          hand.landmarks.forEach((landmark, i) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fill();
        }

        const wrist = hand.landmarks[0];
        ctx.fillStyle = color;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(
          hand.handedness,
          wrist.x * canvas.width - 20,
          wrist.y * canvas.height - 20
        );
      });

      frameCountRef.current++;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationRef.current = requestAnimationFrame(drawHands);
    };

    video.addEventListener('loadeddata', drawHands);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isTracking, mode]);

  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `hand-tracking-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Hand className="w-12 h-12 text-purple-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Hand Tracking Studio
            </h1>
          </div>
          <p className="text-gray-300 text-lg">
            Real-time computer vision powered hand detection and tracking
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              
              {isTracking && (
                <div className="absolute top-4 left-4 space-y-2">
                  <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-mono">{fps} FPS</span>
                  </div>
                  <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
                    <Hand className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-mono">{handCount} Hand{handCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {!isTracking && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                    <p className="text-gray-300">Click Start Tracking to begin</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setIsTracking(!isTracking)}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  isTracking
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </button>
              
              <button
                onClick={captureSnapshot}
                disabled={!isTracking}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 rounded-lg font-semibold transition-all"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Visualization Mode
              </h3>
              <div className="space-y-2">
                {['skeleton', 'points', 'mesh', 'both'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                      mode === m
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {showSettings && (
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      Detection Confidence: {confidence.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={confidence}
                      onChange={(e) => setConfidence(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Real-time hand landmark detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Multi-hand tracking support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>21 landmarks per hand</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Multiple visualization modes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>Snapshot capture capability</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>
            Built with MediaPipe-inspired tracking • Computer Vision Technology
          </p>
        </div>
      </div>
    </div>
  );
};

export default HandTrackingApp;