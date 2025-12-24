import React, { useEffect, useRef, useState } from 'react';
import { AppConfig, CanvasElement, Rect, PDFState } from '../types';
import { Upload } from 'lucide-react';

interface CanvasAreaProps {
  config: AppConfig;
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  isRecording: boolean;
  videoStream: MediaStream | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  pdfState: PDFState;
  setPdfState: React.Dispatch<React.SetStateAction<PDFState>>;
  onPDFUpload: (file: File) => void;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const TEXT_BAR_HEIGHT = 160;

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  config,
  elements,
  setElements,
  isRecording,
  videoStream,
  canvasRef,
  pdfState,
  setPdfState,
  onPDFUpload
}) => {
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<Rect | null>(null);
  
  const videoElementRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const currentSlideCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const transitionCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas')); 
  
  const transitionState = useRef({
      isTransitioning: false,
      progress: 1,
      startTime: 0
  });
  
  const lastRenderedPageRef = useRef<number>(0);

  // Initialize video
  useEffect(() => {
    const video = videoElementRef.current;
    video.muted = true; 
    video.playsInline = true;
    video.autoplay = true;

    if (videoStream) {
      video.srcObject = videoStream;
      video.play().catch(console.error);
    } else {
      video.srcObject = null;
    }
  }, [videoStream]);

  // PDF Rendering Logic
  useEffect(() => {
    const renderPDFPage = async () => {
      if (!pdfState.pdfDoc || pdfState.currentPage === lastRenderedPageRef.current) return;
      
      // Start Transition
      if (lastRenderedPageRef.current !== 0 && config.transitionSpeed > 0) {
          const transCtx = transitionCanvasRef.current.getContext('2d');
          transCtx?.clearRect(0, 0, transitionCanvasRef.current.width, transitionCanvasRef.current.height);
          transCtx?.drawImage(currentSlideCanvasRef.current, 0, 0);
          
          transitionState.current = {
              isTransitioning: true,
              progress: 0,
              startTime: performance.now()
          };
      }

      lastRenderedPageRef.current = pdfState.currentPage;

      try {
        const page = await pdfState.pdfDoc.getPage(pdfState.currentPage);
        const viewport = page.getViewport({ scale: 2.5 }); 
        const canvas = currentSlideCanvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          transitionCanvasRef.current.width = viewport.width;
          transitionCanvasRef.current.height = viewport.height;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
        }
      } catch (err) {
        console.error("Error rendering PDF page:", err);
      }
    };

    renderPDFPage();
  }, [pdfState.pdfDoc, pdfState.currentPage, config.transitionSpeed]);


  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const drawRoundedRectPath = (x: number, y: number, w: number, h: number, r: number) => {
        // Strict flooring prevents sub-pixel bleeding/lines
        x = Math.floor(x);
        y = Math.floor(y);
        w = Math.floor(w);
        h = Math.floor(h);
        r = Math.floor(r);

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    const drawGizmo = (rect: Rect, isSelected: boolean) => {
        if (isRecording) return;
        
        ctx.save();
        ctx.strokeStyle = isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.setLineDash(isSelected ? [] : [10, 10]);
        ctx.strokeRect(Math.floor(rect.x), Math.floor(rect.y), Math.floor(rect.w), Math.floor(rect.h));
        
        if (isSelected) {
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(Math.floor(rect.x + rect.w), Math.floor(rect.y + rect.h), 12, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    };

    const render = (time: number) => {
      // 0. Update Transition State
      if (transitionState.current.isTransitioning) {
          const elapsed = time - transitionState.current.startTime;
          const duration = config.transitionSpeed;
          const t = Math.min(1, elapsed / duration);
          transitionState.current.progress = t;
          if (t >= 1) {
              transitionState.current.isTransitioning = false;
          }
      }

      // 1. Background
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Elements (Sorted by Z-Index)
      const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

      sortedElements.forEach(el => {
        const { x, y, w, h } = el.rect;
        const fx = Math.floor(x);
        const fy = Math.floor(y);
        const fw = Math.floor(w);
        const fh = Math.floor(h);
        
        ctx.save();
        
        // --- SHADOW RENDERING ---
        // We draw the shadow path *before* clipping for content
        if (config.shadowIntensity > 0) {
            ctx.save();
            drawRoundedRectPath(fx, fy, fw, fh, el.id === 'slide' ? config.slideRoundness : config.cameraRoundness);
            ctx.shadowColor = "rgba(0,0,0,0.15)";
            // Map 0-100 intensity to reasonable blur/offset values
            const blur = 10 + (config.shadowIntensity * 0.5); 
            const offset = 5 + (config.shadowIntensity * 0.3);
            ctx.shadowBlur = blur;
            ctx.shadowOffsetY = offset;
            ctx.shadowOffsetX = 0;
            ctx.fillStyle = config.bgColor; // Fill needed to cast shadow
            ctx.fill();
            ctx.restore();
        }
        
        // --- CONTENT RENDERING ---
        const radius = el.id === 'slide' ? config.slideRoundness : config.cameraRoundness;
        drawRoundedRectPath(fx, fy, fw, fh, radius);
        ctx.clip(); // Clip everything inside to this shape

        if (el.id === 'slide') {
          // SLIDE RENDERING WITH FADE+BLUR TRANSITION
          if (pdfState.pdfDoc) {
             if (transitionState.current.isTransitioning) {
                 // Cross fade logic
                 const p = transitionState.current.progress;
                 
                 // 1. Draw Previous Slide
                 ctx.globalAlpha = 1 - p;
                 const blurAmount = p * 20; 
                 ctx.filter = `blur(${blurAmount}px)`;
                 ctx.drawImage(transitionCanvasRef.current, fx, fy, fw, fh);
                 
                 // 2. Draw Next Slide
                 ctx.globalAlpha = p;
                 const blurIn = (1 - p) * 20;
                 ctx.filter = `blur(${blurIn}px)`;
                 ctx.drawImage(currentSlideCanvasRef.current, fx, fy, fw, fh);
                 
                 ctx.filter = 'none';
                 ctx.globalAlpha = 1.0;

             } else {
                 ctx.drawImage(currentSlideCanvasRef.current, fx, fy, fw, fh);
             }

          } else {
             // Placeholder
             ctx.fillStyle = '#f1f5f9';
             ctx.fillRect(fx, fy, fw, fh);
             ctx.fillStyle = '#94a3b8';
             ctx.font = 'bold 80px sans-serif';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText('SLIDE', fx + fw/2, fy + fh/2);
             ctx.font = '30px sans-serif';
             ctx.fillText('Drag & Drop PDF', fx + fw/2, fy + fh/2 + 60);
          }
        } else if (el.id === 'camera') {
            const video = videoElementRef.current;
            if (video && video.readyState >= 2 && video.videoWidth > 0) {
                const vRatio = video.videoWidth / video.videoHeight;
                const eRatio = fw / fh;
                let sx, sy, sw, sh;

                if (vRatio > eRatio) {
                    sh = video.videoHeight;
                    sw = sh * eRatio;
                    sx = (video.videoWidth - sw) / 2;
                    sy = 0;
                } else {
                    sw = video.videoWidth;
                    sh = sw / eRatio;
                    sx = 0;
                    sy = (video.videoHeight - sh) / 2;
                }
                ctx.drawImage(video, sx, sy, sw, sh, fx, fy, fw, fh);
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillRect(fx, fy, fw, fh);
                ctx.fillStyle = '#ccc';
                ctx.font = 'bold 40px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('CAM', fx + fw/2, fy + fh/2);
            }
        }

        ctx.restore();

        // Gizmos
        drawGizmo(el.rect, activeElementId === el.id);
      });

      // 3. Lower Thirds (Attached to Bottom)
      if (config.lowerThirdTitle || config.lowerThirdSubtitle) {
          ctx.save();
          const barY = CANVAS_HEIGHT - TEXT_BAR_HEIGHT;
          const barHeight = TEXT_BAR_HEIGHT;
          
          // Gradient Background
          const grad = ctx.createLinearGradient(0, barY, CANVAS_WIDTH, barY);
          grad.addColorStop(0, config.lowerThirdBgColor1); 
          grad.addColorStop(1, config.lowerThirdBgColor2);
          
          // Shadow for the bar itself
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetY = -5;
          
          ctx.fillStyle = grad;
          ctx.fillRect(0, barY, CANVAS_WIDTH, barHeight);
          
          // Reset shadow for text
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          // Padding variables
          const paddingLeft = 60;
          const paddingTop = 40;

          // Render Title
          if (config.lowerThirdTitle) {
              ctx.fillStyle = config.lowerThirdTitleColor;
              ctx.font = `bold ${config.lowerThirdTitleSize}px "${config.lowerThirdTitleFont}", sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillText(config.lowerThirdTitle, paddingLeft, barY + paddingTop);
          }

          // Render Subtitle
          if (config.lowerThirdSubtitle) {
              ctx.fillStyle = config.lowerThirdSubtitleColor;
              ctx.font = `${config.lowerThirdSubtitleSize}px "${config.lowerThirdSubtitleFont}", sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              
              const titleHeight = config.lowerThirdTitle ? config.lowerThirdTitleSize * 1.2 : 0;
              ctx.fillText(config.lowerThirdSubtitle, paddingLeft, barY + paddingTop + titleHeight);
          }
          
          ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, [config, elements, activeElementId, isRecording, pdfState.currentPage, pdfState.pdfDoc]);

  // Event Handlers for Mouse Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
      if (isRecording) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const clickedResize = elements.find(el => {
          const r = el.rect;
          const dx = mouseX - (r.x + r.w);
          const dy = mouseY - (r.y + r.h);
          return Math.sqrt(dx*dx + dy*dy) < 30;
      });

      if (clickedResize) {
          setActiveElementId(clickedResize.id);
          setDragMode('resize');
          setDragStart({ x: mouseX, y: mouseY });
          setInitialRect(clickedResize.rect);
          return;
      }

      for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          const r = el.rect;
          if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
              setActiveElementId(el.id);
              setDragMode('move');
              setDragStart({ x: mouseX, y: mouseY });
              setInitialRect(r);
              return;
          }
      }

      setActiveElementId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragMode || !activeElementId || !initialRect || isRecording) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      const dx = mouseX - dragStart.x;
      const dy = mouseY - dragStart.y;

      setElements(prev => prev.map(el => {
          if (el.id !== activeElementId) return el;
          
          if (dragMode === 'move') {
              return {
                  ...el,
                  rect: {
                      ...el.rect,
                      x: initialRect.x + dx,
                      y: initialRect.y + dy
                  }
              };
          } else {
              return {
                  ...el,
                  rect: {
                      ...el.rect,
                      w: Math.max(100, initialRect.w + dx),
                      h: Math.max(100, initialRect.h + dy)
                  }
              };
          }
      }));
  };

  const handleMouseUp = () => {
      setDragMode(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isRecording) return;
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        onPDFUpload(files[0]);
    }
  };

  return (
    <div 
        className="flex-1 bg-black flex items-center justify-center p-8 relative overflow-hidden"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className={`shadow-2xl max-w-full max-h-full aspect-video bg-white object-contain ${isRecording ? 'cursor-none' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
             width: 'auto',
             height: 'auto',
        }}
      />
      {!pdfState.pdfDoc && !isRecording && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="bg-black/50 p-6 rounded-xl text-white text-center backdrop-blur-sm">
                <Upload className="mx-auto mb-2 opacity-80" size={48} />
                <p className="text-xl font-bold">Drag PDF Here</p>
                <p className="text-sm opacity-70">to load slides</p>
             </div>
          </div>
      )}
    </div>
  );
};