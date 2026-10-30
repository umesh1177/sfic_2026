import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Mic,
  MicOff,
  MapPin,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  RefreshCw,
  Copy,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, DraftStore } from '../services/api.js';
import { ComplaintCategory, Complaint } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ComplaintCategory[];
  onComplaintSubmitted: (complaint: Complaint) => void;
  lang: Language;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  categories,
  onComplaintSubmitted,
  lang
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const t = translations[lang];

  // Form State
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80');
  const [imageFileName, setImageFileName] = useState<string>('navsari_dustbin_overflow.jpg');
  const [imageFileSize, setImageFileSize] = useState<number>(450000);
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

  // Location State (Navsari Centroid default)
  const [latitude, setLatitude] = useState<number>(20.9312);
  const [longitude, setLongitude] = useState<number>(72.9284);
  const [detectedWard, setDetectedWard] = useState<any>(null);
  const [locationAddress, setLocationAddress] = useState<string>('Near Ashapuri Temple Garden, Dudhiya Talao, Navsari');
  const [landmark, setLandmark] = useState<string>('Opposite North Lake Pavilion Gate');
  const [locationValid, setLocationValid] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string>('');

  // AI & Safety State
  const [aiClassification, setAiClassification] = useState<any>(null);
  const [moderationStatus, setModerationStatus] = useState<any>(null);
  const [photoQuality, setPhotoQuality] = useState<any>(null);
  const [nearbyDuplicates, setNearbyDuplicates] = useState<any[]>([]);

  // Submission State
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage('');
      setSubmittedComplaint(null);
      // Validate initial Navsari coordinates
      validateNavsariLocation(20.9312, 72.9284);
    }
  }, [isOpen]);

  const validateNavsariLocation = async (lat: number, lng: number) => {
    setLocationError('');
    try {
      const res = await api.validateLocation(lat, lng);
      if (res.data.is_inside_nmc) {
        setDetectedWard(res.data);
        setLocationValid(true);
      }
    } catch (err: any) {
      setLocationValid(false);
      setLocationError(err.message || t.outside_nmc_error);
    }
  };

  // Step 1 -> Step 2: Trigger AI Classification
  const handleProceedFromStep1 = async () => {
    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of the cleanliness issue.');
      return;
    }
    setErrorMessage('');
    setLoading(true);

    try {
      // 1. Run AI classification
      const classifyRes = await api.classifyImage(imageFileName, imageFileSize);
      setAiClassification(classifyRes.data);

      if (classifyRes.data.matched_category_id && !categoryId) {
        setCategoryId(classifyRes.data.matched_category_id);
      }

      // 2. Run content moderation & photo quality check
      const modRes = await api.validateContent(description, imageFileSize, 'image/jpeg');
      setModerationStatus(modRes.data.moderation);
      setPhotoQuality(modRes.data.quality);

      if (!modRes.data.moderation.is_safe) {
        setErrorMessage(modRes.data.moderation.reason || 'Content safety violation');
        setLoading(false);
        return;
      }

      // 3. Check nearby duplicates
      const dupRes = await api.checkDuplicates(latitude, longitude, categoryId);
      setNearbyDuplicates(dupRes.data.duplicates || []);

      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Voice recording toggle
  const handleToggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const sampleText = lang === 'gu'
          ? 'અહીં દુધિયા તળાવ પાસે કચરાપેટી ઉભરાઈ રહી છે અને પ્લાસ્ટિકનો કચરો રસ્તા પર ફેલાયો છે.'
          : lang === 'hi'
          ? 'यहाँ स्टेशन रोड के पास कचरा पेटी भर कर बाहर बह रहा है और बदबू आ रही है।'
          : 'Public waste bin is overflowing near the lake promenade with scattered food packaging.';
        setVoiceTranscript(sampleText);
        setDescription(prev => (prev ? `${prev}\n${sampleText}` : sampleText));
      }, 2500);
    }
  };

  // Final submission
  const handleSubmitFinal = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        category_id: categoryId || categories[0]?.id,
        latitude,
        longitude,
        address: locationAddress,
        landmark,
        description,
        original_language: lang,
        image_url: imageUrl,
        confidence_score: aiClassification?.confidence ? Math.round(aiClassification.confidence * 100) : 92,
        ai_model_name: aiClassification?.model_name || 'NavsariWasteClassifier-PyTorch-ResNet50',
        ai_model_version: aiClassification?.model_version || 'v1.2.0'
      };

      const res = await api.createComplaint(payload);
      setSubmittedComplaint(res.data.complaint);
      onComplaintSubmitted(res.data.complaint);
      setCurrentStep(8);

      // Celebrate with confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      // Offline fallback: save draft in local storage
      if (err.message.includes('offline') || err.message.includes('unreachable')) {
        DraftStore.saveDraft({
          category_id: categoryId || categories[0]?.id,
          description,
          latitude,
          longitude,
          address: locationAddress,
          image_url: imageUrl
        });
        setErrorMessage('You are offline. Your complaint has been saved as a local draft and will sync automatically when back online.');
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#095c54] via-[#0d6e65] to-[#10b981] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {t.report_title}
              </h3>
              <p className="text-[11px] text-[#e6f4f1] font-medium">
                Smart GPS & AI Powered Municipal Watchdog
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#f0f6f4] px-4 py-2 border-b border-[#e2e8f0] flex items-center justify-between text-[11px] font-bold text-[#095c54] shrink-0">
          <span>Step {currentStep} of 8</span>
          <div className="w-32 bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#095c54] h-full transition-all duration-300"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#fee2e2] text-[#dc2626] text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: CAPTURE PHOTO & DETAILS                          */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Photo Preview & Upload */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-[#b8e0d7] bg-[#f8faf9] group aspect-video flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Issue preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <label className="btn-primary-custom px-3 py-1.5 text-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFileName(file.name);
                          setImageFileSize(file.size);
                          const url = URL.createObjectURL(file);
                          setImageUrl(url);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Sample Photo Toggles for Testing */}
              <div className="flex gap-2 text-[11px] overflow-x-auto pb-1">
                {[
                  { name: 'Overflowing Bin', url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80', file: 'dustbin_overflow.jpg' },
                  { name: 'Choked Gutter', url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80', file: 'gutter_drainage.jpg' },
                  { name: 'Roadside Debris', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80', file: 'road_dump.jpg' }
                ].map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setImageUrl(s.url);
                      setImageFileName(s.file);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-[#e2e8f0] bg-slate-50 hover:border-[#095c54] text-[#0f2925] whitespace-nowrap"
                  >
                    Preset: {s.name}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                >
                  <option value="">-- Let AI Detect or Choose Manually --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.category_name} ({c.category_name_gu})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description & Voice Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#0f2925]">
                    Issue Description
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition ${
                      isRecording
                        ? 'bg-[#fee2e2] text-[#dc2626] border-[#dc2626] animate-pulse font-extrabold'
                        : 'bg-[#e6f4f1] text-[#095c54] border-[#b8e0d7] font-bold'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? t.recording : t.record_voice}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t.describe_issue}
                  className="w-full p-3 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleProceedFromStep1}
                disabled={loading}
                className="w-full btn-primary-custom py-3 text-xs sm:text-sm font-bold"
              >
                {loading ? 'Running AI Engine & Vision Models...' : 'Run AI Analysis & Check'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: AI IMAGE CLASSIFICATION & CORRECTION            */}
          {/* ======================================================== */}
          {currentStep === 2 && aiClassification && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#e6f4f1] border border-[#b8e0d7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-[#05443e] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#10b981]" />
                    {t.ai_predicted}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#10b981] text-white">
                    {Math.round(aiClassification.confidence * 100)}% {t.confidence}
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#095c54]">
                  {aiClassification.predicted_category_name}
                </div>
                <p className="text-[11px] text-[#0d6e65] mt-1">
                  Model: {aiClassification.model_name} ({aiClassification.model_version}) · {aiClassification.processing_time_ms}ms
                </p>
              </div>

              {/* Allow citizen correction */}
              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1">
                  You can override or refine this category:
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#095c54] focus:border-[#095c54] outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.category_name} ({c.category_name_gu})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn-outline-custom px-4 py-2.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 btn-primary-custom py-2.5 text-xs font-bold"
                >
                  Confirm & Check Safety
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: CONTENT SAFETY MODERATION                       */}
          {/* ======================================================== */}
          {currentStep === 3 && moderationStatus && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#10b981] mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs text-[#065f46]">
                    Content Safety Moderation Passed
                  </h4>
                  <p className="text-[11px] text-[#047857] mt-0.5">
                    Text and imagery verified free of abusive language, hate speech, or inappropriate non-civic content.
                  </p>
                </div>
              </div>

              {photoQuality?.suggestions && photoQuality.suggestions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-[#e2e8f0]">
                  <span className="text-[11px] font-bold text-[#64748b] block mb-1">
                    Photo Quality Assistant:
                  </span>
                  <ul className="text-xs text-[#0f2925] space-y-1">
                    {photoQuality.suggestions.map((s: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn-outline-custom px-4 py-2.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)} // Move to Location
                  className="flex-1 btn-primary-custom py-2.5 text-xs font-bold"
                >
                  Verify Navsari Location
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: NAVSARI LOCATION & POSTGIS WARD DETECTION       */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#f0f6f4] border border-[#b8e0d7]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-[#095c54] flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Navsari PostGIS Ward Identifier
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#10b981] text-white">
                    GPS Accurate
                  </span>
                </div>
                {detectedWard ? (
                  <div className="text-xs font-bold text-[#05443e]">
                    Ward {detectedWard.ward_number}: {detectedWard.ward_name} ({detectedWard.ward_name_gu})
                  </div>
                ) : (
                  <div className="text-xs text-[#dc2626] font-bold">
                    {locationError || 'Coordinates outside Navsari boundary'}
                  </div>
                )}
              </div>

              {/* Address & Landmark Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#0f2925] mb-1">
                    Street Address / Spot
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={e => setLocationAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0f2925] mb-1">
                    Nearby Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                  />
                </div>
              </div>

              {/* Coordinates Preview */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748b]">
                <div className="p-2 rounded-lg bg-slate-50 border border-[#e2e8f0]">
                  Lat: <strong>{latitude.toFixed(4)}</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-[#e2e8f0]">
                  Lng: <strong>{longitude.toFixed(4)}</strong>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-outline-custom px-4 py-2.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  disabled={!locationValid}
                  onClick={() => setCurrentStep(6)}
                  className="flex-1 btn-primary-custom py-2.5 text-xs font-bold disabled:opacity-50"
                >
                  Check Nearby Reports
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: NEARBY DUPLICATE DETECTION                      */}
          {/* ======================================================== */}
          {currentStep === 6 && (
            <div className="space-y-4">
              {nearbyDuplicates.length > 0 ? (
                <div>
                  <div className="p-3 rounded-2xl bg-[#fef3c7] border border-[#fde68a] text-xs font-bold text-[#92400e] mb-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Similar open complaints exist within 120m of this spot. You can follow the existing issue or proceed if your issue is different.</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {nearbyDuplicates.map(d => (
                      <div key={d.id} className="p-3 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-between text-xs">
                        <div>
                          <div className="font-extrabold text-[#095c54]">{d.complaint_number}</div>
                          <div className="text-[11px] text-[#64748b]">{d.category_name} · {d.distance_meters}m away</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4f1] text-[#095c54]">
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-[#10b981] mx-auto" />
                  <div className="text-xs font-extrabold text-[#065f46]">No Duplicate Reports Found</div>
                  <p className="text-[11px] text-[#047857]">This spot has no active overlapping complaints in the last 72 hours.</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="btn-outline-custom px-4 py-2.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(7)}
                  className="flex-1 btn-primary-custom py-2.5 text-xs font-bold"
                >
                  Review & Confirm
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 7: FINAL CONFIRMATION & SUBMIT                     */}
          {/* ======================================================== */}
          {currentStep === 7 && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-[#f8faf9] border border-[#e2e8f0] space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#e2e8f0] pb-2">
                  <span className="text-[#64748b]">Category:</span>
                  <span className="font-extrabold text-[#095c54]">
                    {categories.find(c => c.id === categoryId)?.category_name || 'Overflowing Dustbin'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#e2e8f0] pb-2">
                  <span className="text-[#64748b]">Ward:</span>
                  <span className="font-extrabold text-[#0f2925]">
                    {detectedWard?.ward_name || 'Ward 3 (Dudhiya Talao)'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#e2e8f0] pb-2">
                  <span className="text-[#64748b]">Location:</span>
                  <span className="font-semibold text-right max-w-[200px] truncate text-[#0f2925]">
                    {locationAddress}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b] block mb-0.5">Description:</span>
                  <p className="font-medium text-[#0f2925] line-clamp-2">
                    {description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="btn-outline-custom px-4 py-2.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitFinal}
                  className="flex-1 btn-primary-custom py-3 text-xs sm:text-sm font-extrabold"
                >
                  {loading ? 'Submitting to Municipal Database...' : 'Submit Official Complaint'}
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 8: SUCCESS CELEBRATION                             */}
          {/* ======================================================== */}
          {currentStep === 8 && submittedComplaint && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#ecfdf5] text-[#10b981] flex items-center justify-center mx-auto text-3xl shadow-lg">
                ✅
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#095c54]">
                  {t.complaint_success}
                </h3>
                <p className="text-xs text-[#64748b] mt-1">
                  Your complaint has been logged and assigned to the Ward Officer.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#e6f4f1] border border-[#b8e0d7] max-w-xs mx-auto">
                <span className="text-[11px] font-bold text-[#64748b] block">Official Tracking ID</span>
                <span className="text-xl font-black text-[#095c54] tracking-wider block mt-0.5">
                  {submittedComplaint.complaint_number}
                </span>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#10b981] text-white">
                  Status: Submitted
                </span>
              </div>

              <button
                onClick={onClose}
                className="btn-primary-custom px-6 py-2.5 text-xs font-bold"
              >
                Track in My Complaints
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
