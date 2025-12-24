import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, MediaDeviceState, CanvasElement, PDFState } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { ScriptPanel } from './components/ScriptPanel';
import { CanvasArea } from './components/CanvasArea';
import { setupCanvasRecorder } from './utils/recorder';
import { Play, Square, Pause, ChevronRight, ChevronLeft } from 'lucide-react';

const INITIAL_CONFIG: AppConfig = {
  bgColor: '#fdf5f2', // Warm white from example
  slideRoundness: 35,
  cameraRoundness: 40,
  shadowIntensity: 60, // Default shadow
  showGizmos: true,
  scriptHeight: 30,
  
  // Lower Thirds - Visuals
  lowerThirdBgColor1: '#f19b7c', // Gradient Start
  lowerThirdBgColor2: '#d96d4e', // Gradient End

  // Lower Thirds - Title
  lowerThirdTitle: 'Module 1: Introduction to Ayurveda',
  lowerThirdTitleSize: 42,
  lowerThirdTitleColor: '#2c0e04',
  lowerThirdTitleFont: 'Playfair Display',

  // Lower Thirds - Subtitle
  lowerThirdSubtitle: 'ஆயுர்வேத அறிமுகம்: நோக்கங்கள் மற்றும் தத்துவங்கள்',
  lowerThirdSubtitleSize: 24,
  lowerThirdSubtitleColor: '#ffffff',
  lowerThirdSubtitleFont: 'Noto Sans Tamil',

  teleprompterFontSize: 32,
  teleprompterSpeed: 1.2,
  
  transitionSpeed: 800
};

const INITIAL_ELEMENTS: CanvasElement[] = [
    { id: 'slide', rect: { x: 80, y: 150, w: 1200, h: 675 }, zIndex: 1 }, // 16:9
    { id: 'camera', rect: { x: 1350, y: 300, w: 450, h: 450 }, zIndex: 2 }
];

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [elements, setElements] = useState<CanvasElement[]>(INITIAL_ELEMENTS);
  
  // Media State
  const [mediaState, setMediaState] = useState<MediaDeviceState>({
    audioInputId: '',
    videoInputId: '',
    devices: []
  });
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  // PDF State
  const [pdfState, setPdfState] = useState<PDFState>({
    file: null,
    numPages: 0,
    currentPage: 1,
    pdfDoc: null
  });

  // Recording State
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scriptContainerRef = useRef<HTMLDivElement>(null);

  // Script Content
  const [scriptContent, setScriptContent] = useState<string>(`# Welcome to Studio In A Box

\`\`\`speech
Hello everyone! Welcome to this comprehensive tutorial on Studio In A Box.
Today we are going to learn how to create amazing presentations directly from your browser.
\`\`\`

# Slide 2: Features

\`\`\`speech
This tool allows you to import PDFs, overlay your webcam, and read from a teleprompter simultaneously.
It's built for educators and content creators.
\`\`\`
`);

  // 1. Load Devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setMediaState(s => ({ ...s, devices }));
      const audio = devices.find(d => d.kind === 'audioinput');
      const video = devices.find(d => d.kind === 'videoinput');
      if (audio) setMediaState(s => ({ ...s, audioInputId: audio.deviceId }));
      if (video) setMediaState(s => ({ ...s, videoInputId: video.deviceId }));
    });
  }, []);

  // 2. Get Stream when IDs change
  useEffect(() => {
    if (!mediaState.videoInputId) return;

    const constraints = {
      video: { deviceId: mediaState.videoInputId ? { exact: mediaState.videoInputId } : undefined, width: 1280, height: 720 },
      audio: mediaState.audioInputId ? { deviceId: { exact: mediaState.audioInputId } } : false
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        setActiveStream(stream);
      })
      .catch(err => console.error("Error getting stream", err));
      
    return () => {
        if (activeStream) {
            activeStream.getTracks().forEach(t => t.stop());
        }
    }
  }, [mediaState.videoInputId, mediaState.audioInputId]);

  // 3. Load PDF
  const loadPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const loadingTask = window.pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    setPdfState({
        file,
        pdfDoc: pdf,
        numPages: pdf.numPages,
        currentPage: 1
    });
  };

  // 4. Auto Align Logic
  const handleAutoAlign = () => {
      const CANVAS_WIDTH = 1920;
      const CANVAS_HEIGHT = 1080;
      const slideEl = elements.find(e => e.id === 'slide')!;
      const camEl = elements.find(e => e.id === 'camera')!;
      
      const totalContentWidth = slideEl.rect.w + camEl.rect.w;
      const remainingSpace = CANVAS_WIDTH - totalContentWidth;
      const gap = remainingSpace / 3;

      setElements([
          { ...slideEl, rect: { ...slideEl.rect, x: gap, y: (CANVAS_HEIGHT - 160 - slideEl.rect.h) / 2 } }, // Account for lower third
          { ...camEl, rect: { ...camEl.rect, x: gap * 2 + slideEl.rect.w, y: (CANVAS_HEIGHT - 160 - camEl.rect.h) / 2 } }
      ]);
  };

  // 5. Recording Controls
  const toggleRecording = () => {
    if (recordingStatus === 'idle') {
        if (!canvasRef.current || !activeStream) return;
        try {
            const recorder = setupCanvasRecorder(canvasRef.current, activeStream);
            recorder.start();
            recorderRef.current = recorder;
            setRecordingStatus('recording');
        } catch (e) {
            alert(e);
        }
    } else {
        recorderRef.current?.stop();
        setRecordingStatus('idle');
    }
  };

  const togglePause = () => {
      if (recordingStatus === 'recording') {
          recorderRef.current?.pause();
          setRecordingStatus('paused');
      } else if (recordingStatus === 'paused') {
          recorderRef.current?.resume();
          setRecordingStatus('recording');
      }
  };

  // 6. Direct Scroll Logic (No Physics, No Smoothing, No Snap)
  useEffect(() => {
    // Only activate global scroll when in recording/paused mode
    if (recordingStatus === 'idle') {
        return;
    }

    const handleGlobalWheel = (e: WheelEvent) => {
        if (!scriptContainerRef.current) return;

        // Prevent default to capture the event fully and prevent body scroll
        e.preventDefault();
        
        // Direct, raw scroll mapping.
        // Multiply by speed config to allow sensitivity adjustment.
        // This manipulates scrollTop directly for instant 1:1 response.
        const scrollAmount = e.deltaY * config.teleprompterSpeed;
        
        scriptContainerRef.current.scrollTop += scrollAmount;
    };

    // { passive: false } is required to use preventDefault()
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    
    return () => {
        window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [recordingStatus, config.teleprompterSpeed]);


  // 7. Mouse Navigation
  useEffect(() => {
    if (recordingStatus === 'idle') return;

    const handleMouseClick = (e: MouseEvent) => {
        e.preventDefault();
        if (e.button === 0) {
             setPdfState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }));
        } else if (e.button === 2) {
             setPdfState(prev => ({ ...prev, currentPage: Math.min(prev.numPages, prev.currentPage + 1) }));
        }
    };
    window.addEventListener('mousedown', handleMouseClick);
    window.addEventListener('contextmenu', e => e.preventDefault());
    return () => {
        window.removeEventListener('mousedown', handleMouseClick);
        window.removeEventListener('contextmenu', e => e.preventDefault());
    };
  }, [recordingStatus, pdfState.numPages]);

  return (
    <div className="flex flex-col h-screen bg-studio-bg text-studio-text">
      
      <ScriptPanel 
        heightPercent={config.scriptHeight} 
        scriptContent={scriptContent}
        setScriptContent={setScriptContent}
        isRecording={recordingStatus !== 'idle'}
        scriptContainerRef={scriptContainerRef}
        fontSize={config.teleprompterFontSize}
      />

      <div className="flex flex-1 overflow-hidden" style={{ height: `${100 - config.scriptHeight}%` }}>
        
        <SettingsPanel 
          config={config} 
          setConfig={setConfig} 
          mediaState={mediaState}
          setMediaState={setMediaState}
          slideElement={elements.find(e => e.id === 'slide')!}
          cameraElement={elements.find(e => e.id === 'camera')!}
          onAutoAlign={handleAutoAlign}
          disabled={recordingStatus !== 'idle'}
        />

        <CanvasArea 
            config={config}
            elements={elements}
            setElements={setElements}
            isRecording={recordingStatus !== 'idle'}
            videoStream={activeStream}
            canvasRef={canvasRef}
            pdfState={pdfState}
            setPdfState={setPdfState}
            onPDFUpload={loadPDF}
        />

        <div className="w-20 bg-studio-panel border-l border-gray-700 flex flex-col items-center py-6 space-y-6 z-30">
             <button
                onClick={toggleRecording}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    recordingStatus === 'idle' 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50 shadow-lg' 
                    : 'bg-white hover:bg-gray-200'
                }`}
                title={recordingStatus === 'idle' ? "Start Recording" : "Stop Recording"}
             >
                {recordingStatus === 'idle' ? <Play fill="white" className="ml-1" /> : <Square fill="black" />}
             </button>

             {recordingStatus !== 'idle' && (
                 <button
                    onClick={togglePause}
                    className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                    title={recordingStatus === 'paused' ? "Resume" : "Pause"}
                 >
                     {recordingStatus === 'paused' ? <Play size={16} fill="white" className="ml-0.5"/> : <Pause size={16} fill="white" />}
                 </button>
             )}

             <div className="h-px w-8 bg-gray-700 my-2"></div>

             <div className="flex flex-col gap-2">
                <button 
                    onClick={() => setPdfState(p => ({...p, currentPage: Math.max(1, p.currentPage - 1)}))}
                    className="w-10 h-10 rounded bg-black/40 hover:bg-indigo-600/50 flex items-center justify-center"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center text-[10px] font-mono text-gray-400">
                    {pdfState.currentPage} / {pdfState.numPages || '-'}
                </div>
                <button 
                    onClick={() => setPdfState(p => ({...p, currentPage: Math.min(p.numPages, p.currentPage + 1)}))}
                    className="w-10 h-10 rounded bg-black/40 hover:bg-indigo-600/50 flex items-center justify-center"
                >
                    <ChevronRight size={20} />
                </button>
             </div>
        </div>

      </div>
    </div>
  );
};

export default App;