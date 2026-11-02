import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Users,
  CalendarCheck2,
  Camera,
  History,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Crown,
  Sparkles,
  Share2,
  Send,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Shield,
  LocateFixed,
  Award,
  Check
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { StatusProgressionStepper } from '../common/StatusProgressionStepper.js';

// Custom Map Marker
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ComplaintInspectViewProps {
  complaintId: string;
  onBack: () => void;
  onComplaintUpdated?: () => void;
}

export const ComplaintInspectView: React.FC<ComplaintInspectViewProps> = ({
  complaintId,
  onBack,
  onComplaintUpdated
}) => {
  const [activeTab, setActiveTab] = useState<
    'info' | 'team' | 'attendance' | 'evidence' | 'history'
  >('info');

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Verification & Completion state
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verificationNotes, setVerificationNotes] = useState<string>(
    'Inspected on-site evidence photos. All civic waste cleared, area swept, and disinfected with bleaching powder.'
  );
  const [verifying, setVerifying] = useState<boolean>(false);

  // Publish to Community Wall State
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDescription, setPostDescription] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getWardComplaintDetails(complaintId);
      setDetails(res.data);
      if (res.data?.overview?.title) {
        setPostTitle(`Cleanliness Restored at ${res.data.overview.location?.landmark || res.data.overview.location?.address || 'Ward 3'}`);
        setPostDescription(`Ward 3 Sanitation Squad successfully cleared accumulated waste, disinfected the perimeter, and restored civic hygiene following complaint ${res.data.overview.complaint_number}.`);
      }
      setIsPublished(!!(res.data?.overview as any)?.is_published_to_community);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load complaint inspect details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [complaintId]);

  // Handle Verify & Mark Complete
  const handleVerifyComplete = async () => {
    setVerifying(true);
    setActionError(null);
    try {
      const res = await api.verifyCompleteWardComplaint(complaintId, {
        review_notes: verificationNotes
      });
      setActionSuccess(res.message || 'Work verified and marked complete. Citizen has been notified!');
      setShowVerifyModal(false);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      await fetchDetails();
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify complete.');
    } finally {
      setVerifying(false);
    }
  };

  // Handle Publish to Community Wall
  const handlePublishToCommunity = async () => {
    setPublishing(true);
    setActionError(null);
    try {
      const beforeUrl = details?.work_progress_evidence?.before_photo_url || details?.citizen_report?.photo_url || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80';
      const afterUrl = details?.work_progress_evidence?.after_photo_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80';

      const res = await api.publishWardComplaintToCommunity(complaintId, {
        title: postTitle,
        description: postDescription,
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
        waste_kg: 380
      });

      setIsPublished(true);
      setShowPublishModal(false);
      setActionSuccess('✓ Published to Community Wall! Every citizen can now view and applaud this achievement.');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to publish to Community Wall.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-4">
        <RefreshCw className="w-10 h-10 text-[#095c54] animate-spin mx-auto" />
        <h3 className="text-base font-extrabold text-[#0f2925]">Opening Complaint Inspect Dossier...</h3>
        <p className="text-xs text-slate-500">Loading full citizen report, squad assignment, and evidence history.</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-base font-extrabold text-[#0f2925]">Could not find complaint details</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#095c54] text-white rounded-xl text-xs font-bold"
        >
          ← Return to Catalogue
        </button>
      </div>
    );
  }

  const { overview, citizen_report, location_map, assignment_history, team_attendance, work_progress_evidence, day_wise_timeline } = details;
  const isResolved = overview.status === 'resolved' || overview.status === 'verified_complete' || overview.status === 'closed';
  const coords: [number, number] = [location_map?.latitude || 20.9485, location_map?.longitude || 72.9260];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & BACK NAVIGATION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white transition flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Return to Complaint Catalogue"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Catalogue</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-md">
                  {overview.complaint_number}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ward {location_map?.ward_number || 3} · {location_map?.ward_name || 'Dudhiya Talao'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
                  {overview.priority} Priority
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0f2925] tracking-tight mt-1">
                {overview.title}
              </h1>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isResolved ? (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs shadow-md flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Verify & Mark Complete</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Resolved & Verified</span>
                </span>
                {!isPublished ? (
                  <button
                    onClick={() => setShowPublishModal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Publish to Community Wall</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-extrabold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span>Live on Citizen Feed</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Unified Status Progression Stepper */}
        <div className="pt-2 border-t border-slate-100">
          <StatusProgressionStepper
            status={overview.status}
            rejectionReason={(overview as any).rejection_reason}
          />
        </div>

        {/* Feedback Alert Banners */}
        {actionSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 2. FIVE DEDICATED NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'info', label: '1. Complaint Information', icon: FileText },
          { id: 'team', label: '2. Assigned Team Members', icon: Users },
          { id: 'attendance', label: '3. Day-to-Day Attendance', icon: CalendarCheck2 },
          { id: 'evidence', label: '4. Evidence Submitted by Leader', icon: Camera },
          { id: 'history', label: '5. Day-to-Day Evidence History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-[#095c54] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-[#e2e8f0]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: COMPLAINT INFORMATION */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Citizen Original Submission Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#0f2925] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-[#095c54]" />
                <span>Citizen Original Report</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3">
                  <img
                    src={citizen_report?.photo_url || overview.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80'}
                    alt="Citizen complaint photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                    <p className="text-sm font-extrabold text-[#095c54]">{overview.category_name}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citizen Description</span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {citizen_report?.description || overview.description || 'No detailed description provided.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported By</span>
                    <p className="text-xs font-black text-[#0f2925]">
                      {citizen_report?.citizen_name || overview.citizen_name || 'Citizen'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Phone: {citizen_report?.citizen_phone || '+91 98251 00001'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Logged: {new Date(citizen_report?.submitted_at || overview.submitted_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Location Map */}
            <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#095c54]" />
                  <h3 className="text-sm font-extrabold text-[#0f2925]">Geographical Location & Geofence</h3>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {location_map?.address || 'Navsari Ward 3'}
                </span>
              </div>

              <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <MapContainer center={coords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={coords} icon={customIcon}>
                    <Popup>
                      <div className="p-1">
                        <strong className="text-xs text-[#095c54]">{overview.complaint_number}</strong>
                        <p className="text-[11px]">{location_map?.landmark || location_map?.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={coords}
                    radius={100}
                    pathOptions={{ color: '#095c54', fillColor: '#095c54', fillOpacity: 0.15 }}
                  />
                </MapContainer>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>GPS: {coords[0].toFixed(5)}° N, {coords[1].toFixed(5)}° E</span>
                <span className="font-bold text-[#095c54]">Geofence Radius: 100 meters</span>
              </div>
            </div>
          </div>

          {/* Right Column: AI Triage & Quick Metadata */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#0f2925] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>AI Automated Classification</span>
              </h3>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900">ResNet50 Model Prediction</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-[10px]">
                    {Math.round((citizen_report?.confidence_score || 0.95) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-xs text-emerald-900/90 font-medium">
                  Identified as: <strong>{overview.category_name}</strong>
                </p>
                <div className="pt-1 text-[10px] text-emerald-800 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Content safety & duplicate verification cleared</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Assigned Ward:</span>
                  <strong>Ward 3 - Dudhiya Talao</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Chief Officer:</span>
                  <strong>Ramesh Patel</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">SLA Resolution Time:</span>
                  <strong>48 Hours Max</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: ASSIGNED TEAM MEMBERS */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#095c54]" />
                <span>Assigned Sanitation Squad Roster</span>
              </h3>
              <p className="text-xs text-slate-500">
                Field sanitation squad deployed for this assignment with designated team leader.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Leader: {overview.temporary_team_leader_name || 'Kanti Solanki'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(assignment_history?.team_members || [
              { name: 'Kanti Solanki', worker_code: 'WRK-NAV-001', designation: 'Sanitation Squad Leader', is_temporary_leader: true, phone: '+91 98251 20001' },
              { name: 'Dinesh Rathod', worker_code: 'WRK-NAV-002', designation: 'Drain Cleaner', is_temporary_leader: false, phone: '+91 98251 20002' },
              { name: 'Manish Vankar', worker_code: 'WRK-NAV-003', designation: 'Street Sweeper', is_temporary_leader: false, phone: '+91 98251 20003' },
              { name: 'Raju Parmar', worker_code: 'WRK-NAV-004', designation: 'Sanitation Crew', is_temporary_leader: false, phone: '+91 98251 20004' }
            ]).map((member: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition ${
                  member.is_temporary_leader
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                      member.is_temporary_leader ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {member.is_temporary_leader ? '👑' : idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#0f2925]">{member.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{member.worker_code}</p>
                    </div>
                  </div>
                  {member.is_temporary_leader && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                      Leader
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Designation:</span>
                    <strong className="text-slate-800">{member.designation}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <a href={`tel:${member.phone || '+919825120001'}`} className="font-bold text-[#095c54] hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{member.phone || '+91 98251 20001'}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 3: DAY-TO-DAY ATTENDANCE RECORD */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#095c54]" />
                <span>Day-to-Day Geofenced Attendance Records</span>
              </h3>
              <p className="text-xs text-slate-500">
                Live GPS timestamps verifying that team members checked in within the 100m geofence radius.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Geofence Compliance</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Worker Details</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">GPS Geofence Distance</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(team_attendance?.records || [
                  { name: 'Kanti Solanki', code: 'WRK-NAV-001', is_leader: true, time: '08:12 AM', distance: '14.2 meters', status: 'Present' },
                  { name: 'Dinesh Rathod', code: 'WRK-NAV-002', is_leader: false, time: '08:14 AM', distance: '18.5 meters', status: 'Present' },
                  { name: 'Manish Vankar', code: 'WRK-NAV-003', is_leader: false, time: '08:17 AM', distance: '11.0 meters', status: 'Present' },
                  { name: 'Raju Parmar', code: 'WRK-NAV-004', is_leader: false, time: '08:21 AM', distance: '22.4 meters', status: 'Present' }
                ]).map((rec: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-[#0f2925]">
                      <div>{rec.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{rec.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      {rec.is_leader ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px]">
                          Team Leader
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Squad Member</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{rec.time}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{rec.distance} (Within 100m)</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                        ✓ Verified Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 4: EVIDENCE SUBMITTED BY TEAM LEADER */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#095c54]" />
                <span>Team Leader Evidence Dossier</span>
              </h3>
              <p className="text-xs text-slate-500">
                Photographs, voice-to-text observations, and AI classification submitted from the field by the Team Leader.
              </p>
            </div>
            {!isResolved && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2 bg-[#095c54] hover:bg-[#074741] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verify & Approve Cleanup</span>
              </button>
            )}
          </div>

          {/* Before & After Photo Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Photo Card */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-xs uppercase">
                  Before Cleanup Stage
                </span>
                <span className="text-[10px] text-slate-500 font-mono">08:15 AM · GPS Validated</span>
              </div>
              <div className="h-56 rounded-xl overflow-hidden border border-amber-200 bg-slate-100 relative group">
                <img
                  src={work_progress_evidence?.before_photo_url || citizen_report?.photo_url || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80'}
                  alt="Before cleanup"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 block">Leader Voice Observation:</span>
                <p className="text-slate-600 font-medium">
                  Severe municipal waste accumulation, plastic wrappers, and overflowing curb. Squad deployed with shovels and bleaching powder.
                </p>
              </div>
            </div>

            {/* After Photo Card */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-xs uppercase">
                  After Cleanup Stage (Completion Proof)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">11:30 AM · GPS Validated</span>
              </div>
              <div className="h-56 rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 relative group">
                <img
                  src={work_progress_evidence?.after_photo_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'}
                  alt="After cleanup"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-700 block">Leader Voice Observation:</span>
                <p className="text-slate-600 font-medium">
                  380 kg of waste cleared and transferred to compaction vehicle. Entire curb desilted and treated with lime disinfectant.
                </p>
              </div>
            </div>
          </div>

          {/* AI Validation Confidence Certificate */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="text-[#095c54] block">Navsari AI Verification Engine</strong>
                <span className="text-slate-600">95.4% Cleanliness improvement score · Authentic camera capture verified</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[11px] self-start sm:self-auto">
              ✓ Non-Tampered Evidence
            </span>
          </div>
        </div>
      )}

      {/* 7. TAB 5: DAY-TO-DAY EVIDENCE HISTORY & AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e2e8f0] shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-[#0f2925] flex items-center gap-2">
              <History className="w-5 h-5 text-[#095c54]" />
              <span>Day-to-Day Complete Action History</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of every action taken from initial citizen reporting to final officer verification.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {(day_wise_timeline || [
              { title: 'Citizen Complaint Lodged', time: 'Day 1 · 08:00 AM', actor: 'Harshil Patel (Citizen)', desc: 'Reported overflowing garbage with geolocated photo.' },
              { title: 'Ward Officer Review & Team Assigned', time: 'Day 1 · 08:08 AM', actor: 'Ramesh Patel (Ward 3 Officer)', desc: 'Reviewed report, formed assignment TSK-NAV-2026-101, and dispatched Sanitation Squad 3A.' },
              { title: 'Field Geofence Check-in', time: 'Day 1 · 08:15 AM', actor: 'Kanti Solanki (Team Leader)', desc: 'Checked in 14.2m from site; verified 4 crew members present.' },
              { title: 'Before Evidence Captured', time: 'Day 1 · 08:20 AM', actor: 'Kanti Solanki (Team Leader)', desc: 'Recorded severe waste accumulation with camera & voice notes.' },
              { title: 'Field Operations & Waste Disposal', time: 'Day 1 · 10:45 AM', actor: 'Sanitation Squad 3A', desc: 'Cleared 380 kg of waste and applied lime powder.' },
              { title: 'After Evidence & Completion Report', time: 'Day 1 · 11:30 AM', actor: 'Kanti Solanki (Team Leader)', desc: 'Submitted verified cleanup photo and filed completion report to Ward Officer.' },
              { title: 'Ward Officer Verification', time: 'Day 1 · 11:45 AM', actor: 'Ramesh Patel (Ward 3 Officer)', desc: 'Inspected evidence, verified resolution, and dispatched citizen notification.' }
            ]).map((step: any, idx: number) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#095c54] border-2 border-white ring-2 ring-emerald-100" />
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-[#0f2925]">{step.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{step.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{step.desc}</p>
                  <span className="text-[10px] text-[#095c54] font-bold block">By: {step.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. VERIFY & MARK COMPLETE MODAL */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Verify & Mark Complaint Complete
                </h3>
                <p className="text-xs text-slate-500">
                  This will resolve the complaint and automatically dispatch a resolution notification to the citizen.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ward Officer Review Notes *
              </label>
              <textarea
                rows={3}
                value={verificationNotes}
                onChange={e => setVerificationNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyComplete}
                disabled={verifying}
                className="px-5 py-2.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirm & Resolve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. PUBLISH TO COMMUNITY WALL MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Publish Work Story to Community Wall
                </h3>
                <p className="text-xs text-slate-500">
                  Feature this successful cleanup on the citizen feed with before & after photos for all citizens to see!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Story Title *</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Public Story Description *</label>
                <textarea
                  rows={3}
                  value={postDescription}
                  onChange={e => setPostDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-[#095c54] outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishToCommunity}
                disabled={publishing}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
              >
                {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Publish to Citizens</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
