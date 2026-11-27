import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Sparkles, ShieldCheck, X } from 'lucide-react';

interface DigitalSignaturePadProps {
  initialSignature?: string;
  onSaveSignature: (signatureDataUrl: string) => void;
  officerName?: string;
  wardNumber?: number;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  initialSignature,
  onSaveSignature,
  officerName = 'Ward Officer',
  wardNumber = 3
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<string | null>(initialSignature || null);
  const [isPadOpen, setIsPadOpen] = useState(false);

  useEffect(() => {
    if (initialSignature) {
      setCurrentSignature(initialSignature);
    }
  }, [initialSignature]);

  // Canvas drawing coordinate helpers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#095c54'; // Official Navsari Municipal teal
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleApplySignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setCurrentSignature(dataUrl);
    onSaveSignature(dataUrl);
    setIsPadOpen(false);
  };

  // Generates an official calligraphic municipal signature template
  const handleGenerateSampleSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw realistic cursive signature path
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#095c54';

    ctx.beginPath();
    // Flowing first letter
    ctx.moveTo(40, 80);
    ctx.bezierCurveTo(60, 30, 80, 40, 95, 85);
    ctx.bezierCurveTo(110, 110, 130, 60, 150, 75);
    ctx.bezierCurveTo(170, 90, 185, 70, 210, 75);
    ctx.bezierCurveTo(230, 80, 250, 65, 275, 72);
    // Flourish loop
    ctx.bezierCurveTo(310, 80, 330, 45, 300, 40);
    ctx.bezierCurveTo(260, 35, 240, 100, 340, 95);
    ctx.stroke();

    // Under-swirl underline
    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.moveTo(50, 105);
    ctx.bezierCurveTo(120, 100, 220, 115, 320, 102);
    ctx.stroke();

    // Two official dots
    ctx.beginPath();
    ctx.arc(335, 102, 2.5, 0, Math.PI * 2);
    ctx.arc(345, 102, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#095c54';
    ctx.fill();

    setHasDrawn(true);
  };

  return (
    <div className="bg-[#f7fbf9] rounded-2xl border border-[#cde6df] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#095c54] flex items-center justify-center shrink-0">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-[#0f2925] flex items-center gap-1.5">
              <span>Ward Officer Digital Signature</span>
              {currentSignature && (
                <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1 border border-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Signature Applied</span>
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-500">
              Draw and apply your official digital signature to be rendered on all issued certificates.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsPadOpen(prev => !prev);
            if (!isPadOpen && !currentSignature) {
              setTimeout(handleGenerateSampleSignature, 150);
            }
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto ${
            isPadOpen
              ? 'bg-slate-200 text-slate-700'
              : currentSignature
              ? 'bg-emerald-50 hover:bg-emerald-100 text-[#095c54] border border-emerald-300'
              : 'bg-[#095c54] hover:bg-[#074741] text-white'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>{currentSignature ? 'Change / Re-Draw Signature' : 'Draw Digital Signature'}</span>
        </button>
      </div>

      {/* Signature Preview Card (When Applied) */}
      {currentSignature && !isPadOpen && (
        <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 shrink-0">
              <img
                src={currentSignature}
                alt="Applied Officer Signature"
                className="h-9 max-w-[130px] object-contain"
              />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-[#0f2925] block">
                {officerName} · Ward {wardNumber} Officer
              </span>
              <span className="text-[10px] text-emerald-700 font-bold block">
                ✓ Ready: This signature will be permanently applied to all certificates.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsPadOpen(true);
              setTimeout(handleGenerateSampleSignature, 100);
            }}
            className="text-[11px] text-[#095c54] hover:underline font-bold shrink-0"
          >
            Edit Signature
          </button>
        </div>
      )}

      {/* Interactive Signature Canvas Drawer */}
      {isPadOpen && (
        <div className="p-4 bg-white rounded-2xl border-2 border-[#095c54]/30 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
            <span className="font-extrabold text-[#0f2925] flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-[#095c54]" />
              <span>Draw Signature with Mouse or Touch Screen</span>
            </span>
            <button
              type="button"
              onClick={() => setIsPadOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={480}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-32 touch-none block"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
                ✍️ Draw your signature here using mouse, finger, or stylus
              </div>
            )}
            <div className="absolute bottom-1 right-2 text-[9px] text-slate-400 font-mono pointer-events-none">
              Navsari Municipal Corporation · Ward {wardNumber}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateSampleSignature}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#095c54] border border-teal-200 text-xs font-bold flex items-center gap-1 transition"
                title="Generate an official calligraphic signature"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Sample Signature</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPadOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySignature}
                disabled={!hasDrawn}
                className="px-4 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Certificates</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
