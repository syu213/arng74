import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CameraOff, RotateCcw, Download } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (photoUrl: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      console.log('🛑 Camera already running, stopping first');
      stopCamera();
      return;
    }

    try {
      console.log('🎥 Starting camera with facing mode:', facingMode);

      const constraints = {
        video: {
          facingMode: facingMode,
          width: 1280,
          height: 720
        }
      };

      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained');

      if (videoRef.current) {
        console.log('✅ Setting video srcObject');
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        const showVideo = () => {
          console.log('📺 Showing video');
          setIsStreaming(true);

          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('✅ Video playing successfully');
            }).catch(err => {
              console.log('⚠️ Video play failed, but continuing');
            });
          }
        };

        videoRef.current.onloadedmetadata = showVideo;
        videoRef.current.oncanplay = showVideo;
        setTimeout(showVideo, 100);

        console.log('Camera setup complete');
      } else {
        console.error('❌ videoRef.current is null!');
        alert('Video element not found. Please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Camera error:', error);
      setIsStreaming(false);
      alert(`Camera error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check camera permissions.`);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const photoUrl = URL.createObjectURL(blob);
            onCapture(photoUrl);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  }, [onCapture, stopCamera]);

  const switchCamera = useCallback(async () => {
    console.log('Switching camera from', facingMode, 'to', facingMode === 'user' ? 'environment' : 'user');
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera, facingMode]);

  const downloadPhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt-photo-${Date.now()}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && !streamRef.current) {
        console.log('🎬 Starting camera after component mount');
        startCamera();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [facingMode, startCamera, stopCamera]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header controls */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #666',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CameraOff size={16} />
          Close Camera
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={downloadPhoto}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #666',
              color: '#fff',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Download size={16} />
          </button>
          <button
            onClick={switchCamera}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #666',
              color: '#fff',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Camera view area */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Video element - always rendered */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isStreaming ? 'block' : 'none',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Loading overlay */}
        {!isStreaming && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            zIndex: 10
          }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #333',
                borderTop: '4px solid #dc2626',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p>Initializing camera...</p>
            </div>
          </div>
        )}

        {/* ALWAYS VISIBLE CAPTURE BUTTON - PURE HTML/CSS NO TAILWIND */}
        <button
          onClick={capturePhoto}
          disabled={!isStreaming}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isStreaming ? '#dc2626' : '#666',
            color: '#fff',
            padding: '16px 32px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: '3px solid #991b1b',
            cursor: isStreaming ? 'pointer' : 'not-allowed',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            minWidth: '300px',
            zIndex: 100,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (isStreaming) {
              e.currentTarget.style.backgroundColor = '#b91c1c';
              e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
            }
          }}
          onMouseOut={(e) => {
            if (isStreaming) {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            }
          }}
        >
          📸 {isStreaming ? 'Capture Photo' : 'Camera Loading...'}
        </button>

        {/* Camera overlay when streaming */}
        {isStreaming && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 5
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '4px solid rgba(220, 38, 38, 0.3)'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '256px',
              height: '192px',
              border: '2px solid #dc2626',
              borderRadius: '8px'
            }}></div>
          </div>
        )}
      </div>

      {/* Add CSS animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};