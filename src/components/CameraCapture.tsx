import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    // Prevent multiple camera instances
    if (streamRef.current) {
      console.log('🛑 Camera already running, stopping first');
      stopCamera();
      return;
    }

    try {
      console.log('🎥 Starting camera with facing mode:', facingMode);

      // Simple constraints that work on most devices
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

        // Show video once and for all
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

        // Set up single event listeners
        videoRef.current.onloadedmetadata = showVideo;
        videoRef.current.oncanplay = showVideo;

        // Show after a short delay
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
  }, [facingMode]); // Remove isStreaming dependency

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
    // Start camera once after component mount
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
  }, []); // Empty dependency array - run only once

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100); // Small delay before restarting
    }
  }, [facingMode, startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-card border-b border-border p-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={onClose} className="text-primary-foreground">
            <CameraOff className="mr-2 h-4 w-4" />
            Close Camera
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadPhoto}
              className="border-primary text-primary-foreground"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={switchCamera}
              className="border-primary text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {/* Always render video element so ref is available */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : ''}`}
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Show loading overlay when not streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-primary-foreground">Initializing camera...</p>
              <p className="text-primary-foreground text-sm mt-2">
                Debug: facingMode={facingMode}, isStreaming={String(isStreaming)}
              </p>
              {videoRef.current && (
                <p className="text-primary-foreground text-xs mt-1">
                  Video element ready
                </p>
              )}
            </div>
          </div>
        )}

        {/* Camera overlay effects when streaming */}
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-4 border-primary/20"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-64 h-48 border-2 border-primary rounded-lg"></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border-t border-border p-4">
        <div className="flex justify-center">
          <Button
            onClick={capturePhoto}
            disabled={!isStreaming}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4"
          >
            <Camera className="mr-2 h-6 w-6" />
            Capture Photo
          </Button>
        </div>
        <p className="text-center text-muted-foreground text-sm mt-2">
          Position the hand receipt within the frame
        </p>
      </div>
    </div>
  );
};