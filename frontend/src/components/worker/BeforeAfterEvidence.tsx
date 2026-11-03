import { formatTime } from '../../utils/dateFormat.js';
import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Eye,
  Check
} from 'lucide-react';
import { WorkAssignment, WorkEvidence, WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';
import { api } from '../../services/api.js';

interface BeforeAfterEvidenceProps {
  assignments: WorkAssignment[];
  initialTaskId?: string;
  profile: WorkerProfile | null;
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const BeforeAfterEvidence: React.FC<BeforeAfterEvidenceProps> = ({
  assignments,
  initialTaskId,
  profile,
  onNavigateTab,
  lang
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    initialTaskId || assignments[0]?.id || ''
  );
  const [evidenceList, setEvidenceList] = useState<WorkEvidence[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload Form State
  const [stage, setStage] = useState<'before' | 'during' | 'after'>('before');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTask = assignments.find(a => a.id === selectedTaskId) || assignments[0];

  const loadEvidence = async () => {
    if (!selectedTaskId) return;
    setLoading(true);
    try {
      const res = await api.getWorkEvidence(selectedTaskId);
      if (res.data) {
        setEvidenceList(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load evidence from server:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [selectedTaskId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !photoPreview) {
      alert('Please select or capture a photo first.');
      return;
    }

    setUploading(true);
    try {
      // Fetch device location for audit validation
      let lat: number | undefined = undefined;
      let lon: number | undefined = undefined;
      let accuracy: number | undefined = undefined;

      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lon = pos.coords.longitude;
              accuracy = Math.round(pos.coords.accuracy);
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }

      const res = await api.uploadWorkEvidence(selectedTaskId, {
        stage,
        photo_url: photoPreview,
        description: description.trim() || `${stage.toUpperCase()} photographic evidence`,
        latitude: lat,
        longitude: lon,
        gps_accuracy: accuracy
      });

      setUploadSuccess(`${stage.toUpperCase()} photograph uploaded successfully with location audit.`);
      setPhotoPreview(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadEvidence();

      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const beforeItems = evidenceList.filter(e => e.evidence_type === 'before');
  const duringItems = evidenceList.filter(e => e.evidence_type === 'during');
  const afterItems = evidenceList.filter(e => e.evidence_type === 'after');

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#0f2925] flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#095c54]" />
            <span>Before & After Photographic Evidence</span>
          </h2>
          <p className="text-xs text-[#64748b] mt-1">
            Navsari Municipal Corporation · Verifiable Field Audit Trail with GPS Timestamping
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="text-xs px-3.5 py-2 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl font-bold text-[#0f2925] focus:ring-2 focus:ring-[#095c54] outline-none"
          >
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.task_code} - {a.location_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Photo Capture / Upload Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-black text-[#0f2925] flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#095c54]" />
            <span>Capture Worksite Evidence</span>
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Stage Selector Tabs */}
            <div>
              <label className="text-xs font-black text-[#0f2925] uppercase tracking-wider block mb-1.5">
                Work Stage:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['before', 'during', 'after'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className={`py-2 text-xs font-black rounded-2xl capitalize transition-all border ${
                      stage === s
                        ? 'bg-[#095c54] text-white border-[#095c54] shadow-xs'
                        : 'bg-[#f8faf9] text-[#64748b] border-[#e2e8f0] hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture Area */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Take Photo or Upload Image:
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="camera-input"
              />

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={photoPreview} alt="Preview" className="w-full h-52 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <label
                      htmlFor="camera-input"
                      className="px-3 py-1.5 bg-white text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Retake
                    </label>
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="camera-input"
                  className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-slate-500"
                >
                  <Camera className="w-10 h-10 text-emerald-600 mb-2" />
                  <span className="font-bold text-xs text-slate-800">Tap to Capture with Camera</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">or browse photo from gallery</span>
                </label>
              )}
            </div>

            {/* Note Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Description / Landmark Note:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Silt removed from main junction drain cover..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !photoPreview}
              className="w-full py-3 bg-[#095c54] hover:bg-[#06423c] disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading with GPS Audit Trail...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Submit {stage.toUpperCase()} Photo</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 3. Side-by-Side Comparison & Audit Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Before & After Verification Gallery</span>
            </h3>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                Loading evidence photos...
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No photos uploaded yet for this task</p>
                <p className="text-[11px] text-slate-500 mt-1">Capture a 'Before' photo before starting work on site.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto">
                {evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div className="relative h-32 bg-slate-200">
                      <img src={ev.storage_path} alt={ev.description} className="w-full h-full object-cover" />
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow ${
                        ev.evidence_type === 'before' ? 'bg-amber-500 text-white' :
                        ev.evidence_type === 'during' ? 'bg-blue-500 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {ev.evidence_type}
                      </span>
                    </div>

                    <div className="p-2.5 text-xs space-y-1">
                      <p className="font-semibold text-slate-800 line-clamp-1">{ev.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{formatTime(ev.created_at)}</span>
                        <span className={`font-semibold ${
                          ev.location_validation_status === 'location_matched' ? 'text-emerald-700' : 'text-slate-600'
                        }`}>
                          {ev.location_validation_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

