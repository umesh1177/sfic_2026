import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
  Wrench,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Eye,
  Camera,
  Layers,
  Phone,
  Mail,
  Send,
  Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../services/api.js';
import { ActivityRegistration, ActivityEvidence } from '../../types/index.js';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface DriveInspectViewProps {
  activity: any;
  onBack: () => void;
  onActionCompleted: () => void;
}

export const DriveInspectView: React.FC<DriveInspectViewProps> = ({
  activity,
  onBack,
  onActionCompleted
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'map' | 'volunteers' | 'evidence' | 'qa'>('info');
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [evidenceList, setEvidenceList] = useState<ActivityEvidence[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Decision Modal State
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'changes_requested' | null>(null);
  const [actionComment, setActionComment] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const coords: [number, number] = [
    parseFloat(activity.latitude) || 20.9470,
    parseFloat(activity.longitude) || 72.9280
  ];

  const fetchDriveDetails = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch Registrations
      const regRes = await api.getActivityRegistrations(activity.id);
      if (regRes.success && regRes.data?.registrations) {
        setRegistrations(regRes.data.registrations);
      }

      // 2. Fetch Evidence
      const evRes = await api.getActivityEvidence(activity.id);
      if (evRes.success && evRes.data) {
        setEvidenceList(evRes.data);
      }

      // 3. Fetch Questions
      const qRes = await api.getCommunityQuestions({ activity_id: activity.id });
      if (qRes.success && qRes.data) {
        setQuestions(qRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load drive inspection data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDriveDetails();
  }, [activity.id]);

  const handleExecuteAction = async () => {
    if (!actionType) return;
    if ((actionType === 'reject' || actionType === 'changes_requested') && !actionComment.trim()) {
      alert('Please provide a specific reason or required adjustment for the Community Head.');
      return;
    }

    setProcessingAction(true);
    try {
      const res = await api.reviewWardApproval(activity.id, actionType, actionComment.trim());
      setActionMsg({
        type: 'success',
        text: res.message || `Drive successfully marked as ${actionType}.`
      });
      setActionType(null);
      setActionComment('');
      setTimeout(() => {
        onActionCompleted();
      }, 1500);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to review drive' });
    } finally {
      setProcessingAction(false);
    }
  };

  const presentVolunteers = registrations.filter(r => r.attendance_status === 'present').length;
  const beforeEvidence = evidenceList.filter(e => e.stage === 'before');
  const afterEvidence = evidenceList.filter(e => e.stage === 'after');

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Breadcrumb & Action Ribbon */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-[#095c54] bg-[#e6f4f1] hover:bg-[#d0ece6] transition py-2 px-3.5 rounded-2xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Drives Queue</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black text-[#095c54] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {activity.activity_category || 'Cleanliness Drive'}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-100 text-slate-800">
                Ward {activity.ward_number || 3}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#0f2925] mt-0.5">
              {activity.title}
            </h1>
          </div>
        </div>

        {/* Quick Review Decisions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActionType('approve')}
            className="px-4 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-sm transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Approve Drive</span>
          </button>

          <button
            onClick={() => setActionType('changes_requested')}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition"
          >
            Request Changes
          </button>

          <button
            onClick={() => setActionType('reject')}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
          >
            Reject
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Horizontal Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'info' ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Specifications & Kit</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'map' ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Location & Geofence Map</span>
        </button>

        <button
          onClick={() => setActiveTab('volunteers')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'volunteers' ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Volunteers ({registrations.length}) & Attendance ({presentVolunteers})</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'evidence' ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Field Evidence ({evidenceList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('qa')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'qa' ? 'bg-[#095c54] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Citizen Q&A ({questions.length})</span>
        </button>
      </div>

      {/* TAB 1: Specifications & Kit */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Drive Information & Plan
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {activity.detailed_description || activity.short_description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-slate-200 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Organizing Group</span>
                <p className="font-extrabold text-[#0f2925]">{activity.community_name || 'Navsari Youth Green Brigade'}</p>
                <p className="text-slate-500 text-[11px]">{activity.address || 'Navsari Municipal Area'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-slate-200 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Schedule & Timings</span>
                <p className="font-bold text-slate-700">
                  Starts: {new Date(activity.proposed_start_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="font-bold text-slate-700">
                  Ends: {new Date(activity.proposed_end_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faf9] border border-slate-200 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Volunteer Quota</span>
                <p className="font-extrabold text-[#095c54]">
                  Max Capacity: {activity.maximum_participants || 50} Volunteers
                </p>
                <p className="text-slate-500 text-[11px]">
                  Registered So Far: {registrations.length}
                </p>
              </div>
            </div>

            {/* Equipment Requirements */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Tools & Safety Equipment:
              </span>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(activity.equipment_requirements)
                  ? activity.equipment_requirements
                  : ['Protective Gloves', 'Biodegradable Trash Bags', 'Heavy Duty Brooms', 'Reflective Vests']
                ).map((eq: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Location & Geofence Map */}
      {activeTab === 'map' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#0f2925]">
                Geographic Venue & GPS Attendance Geofence
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volunteers must be within the 150-meter perimeter circle to mark verified attendance on event day.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              Lat: {coords[0].toFixed(5)}, Lng: {coords[1].toFixed(5)}
            </span>
          </div>

          <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <MapContainer center={coords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={coords} icon={markerIcon}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-xs text-[#095c54]">{activity.title}</p>
                    <p className="text-[11px] text-slate-600">{activity.location_name || activity.address}</p>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={coords}
                radius={150}
                pathOptions={{
                  color: '#095c54',
                  fillColor: '#095c54',
                  fillOpacity: 0.15
                }}
              />
            </MapContainer>
          </div>
        </div>
      )}

      {/* TAB 3: Volunteers & Attendance */}
      {activeTab === 'volunteers' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-[#0f2925]">
                Enrolled Volunteers & Live Attendance Roster
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time volunteer registration and GPS check-in verification records.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
              {presentVolunteers} Present / {registrations.length} Registered
            </span>
          </div>

          {registrations.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
              No citizen volunteers have registered for this drive yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Volunteer Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Registration ID</th>
                    <th className="p-3">Registered At</th>
                    <th className="p-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map(reg => (
                    <tr key={reg.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{reg.citizen_name || 'Anonymous Citizen'}</td>
                      <td className="p-3 text-slate-600">{reg.citizen_phone || 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{reg.registration_number}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(reg.registered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            reg.attendance_status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {reg.attendance_status || 'Unmarked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Field Evidence */}
      {activeTab === 'evidence' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#0f2925]">
              Field Evidence & Documentation Gallery
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Before, during, and after photographs submitted by the Community Head.
            </p>
          </div>

          {evidenceList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
              No field evidence has been uploaded by the community head yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {evidenceList.map(ev => (
                <div key={ev.id} className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="relative aspect-video bg-slate-100">
                    <img src={ev.image_url} alt={ev.caption || 'Evidence'} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#095c54] text-white">
                      {ev.stage}
                    </span>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-800">{ev.caption || 'Sanitation documentation'}</p>
                    <p className="text-[10px] text-slate-400">
                      Uploaded by {(ev as any).uploaded_by_name || ev.uploaded_by || 'Community Head'} · {new Date(ev.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Citizen Q&A */}
      {activeTab === 'qa' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-[#0f2925]">
              Citizen Questions & Community Inquiries
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inquiries raised by ward residents regarding event logistics and safety.
            </p>
          </div>

          {questions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
              No citizen questions have been raised for this drive.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Q: {q.question_text}</span>
                    <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                  {q.answer_text ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-medium">
                      <strong>Answer:</strong> {q.answer_text}
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-700 italic">Awaiting response from Community Head</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision Review Modal */}
      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeInBackdrop">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#0f2925]">
                {actionType === 'approve'
                  ? 'Confirm Cleanliness Drive Approval'
                  : actionType === 'changes_requested'
                  ? 'Request Changes from Community Head'
                  : 'Reject Cleanliness Drive Proposal'}
              </h3>
              <button onClick={() => setActionType(null)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {actionType === 'approve'
                ? 'Approving this drive publishes it to all Citizen Dashboards across Ward 3 and allows citizen volunteer enrollment.'
                : 'Please provide feedback to the Community Head explaining why adjustments or rejection are necessary.'}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Officer Comments</label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={e => setActionComment(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'e.g. Approved. Municipal sanitation truck and bins coordinated for post-drive pickup.'
                    : 'Specify required adjustments (e.g. Change meeting time to avoid market congestion)...'
                }
                className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#095c54]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleExecuteAction}
                className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow transition disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-[#095c54] hover:bg-[#074741]'
                    : actionType === 'changes_requested'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processingAction ? 'Saving Decision...' : `Confirm ${actionType.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
