import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCw,
  Flame,
  ArrowRight,
  CheckCircle2,
  Building,
  HeartHandshake,
  Clock,
  Send,
  X,
  FileText,
  Wrench,
  Check,
  Plus,
  Phone
} from 'lucide-react';

const PRESET_GEAR_OPTIONS = [
  '🧤 Heavy-Duty Rubber Gloves',
  '😷 N95 / Dust Mask',
  '🥾 Boots / Sturdy Shoes',
  '🦺 Reflective Safety Vest',
  '🚰 Personal Water Bottle',
  '🧢 Sun Cap / Hat',
  '🧹 Heavy Yard Broom',
  '🗑️ Trash Grabber / Tongs',
  '🩹 Pocket First Aid Kit',
  '🎒 Lightweight Backpack'
];
import { CommunityProblem, Community, CommunityDriveRequest } from '../../types/index.js';
import { api } from '../../services/api.js';
import { Language } from '../../i18n/translations.js';
import { DriveOperationsTabs } from './DriveOperationsTabs.js';

interface CommunityWardProblemsViewProps {
  community: Community | null;
  lang: Language;
  onPlanDriveForProblem?: (problem: CommunityProblem) => void;
}

export const CommunityWardProblemsView: React.FC<CommunityWardProblemsViewProps> = ({
  community
}) => {
  const [problems, setProblems] = useState<CommunityProblem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Proposal Request Modal State
  const [modalProblem, setModalProblem] = useState<CommunityProblem | null>(null);
  const [volunteersCount, setVolunteersCount] = useState<number>(20);
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [proposalNotes, setProposalNotes] = useState<string>('');
  const [customEquipment, setCustomEquipment] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Drive Planning & Citizen Instructions Modal State
  const [planningProblem, setPlanningProblem] = useState<CommunityProblem | null>(null);
  const [citizenInstructions, setCitizenInstructions] = useState<string>('');
  const [necessaryGears, setNecessaryGears] = useState<string[]>([]);
  const [customGear, setCustomGear] = useState<string>('');
  const [meetingPoint, setMeetingPoint] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [submittingPlan, setSubmittingPlan] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const openPlanModal = (prob: CommunityProblem) => {
    setPlanningProblem(prob);
    setPlanError(null);
    setCitizenInstructions(
      prob.citizen_instructions ||
      'Assemble at the designated meeting point on time. Wear sturdy closed-toe shoes and comfortable clothing. Safety briefing will be held 10 minutes prior to drive start. Waste disposal bags and safety equipment will be distributed.'
    );
    setNecessaryGears(
      prob.necessary_gears && prob.necessary_gears.length > 0
        ? prob.necessary_gears
        : (prob.suggested_equipment && prob.suggested_equipment.length > 0
          ? prob.suggested_equipment
          : ['🧤 Heavy-Duty Rubber Gloves', '😷 N95 / Dust Mask', '🚰 Personal Water Bottle'])
    );
    setMeetingPoint(prob.meeting_point || prob.location_name || prob.address || '');
    setEmergencyContact(prob.emergency_contact || (community as any)?.phone || community?.contact_phone || '');
  };

  const closePlanModal = () => {
    setPlanningProblem(null);
    setPlanError(null);
    setCustomGear('');
  };

  const toggleGear = (item: string) => {
    setNecessaryGears(prev =>
      prev.includes(item) ? prev.filter(g => g !== item) : [...prev, item]
    );
  };

  const handleAddCustomGear = () => {
    if (customGear.trim() && !necessaryGears.includes(customGear.trim())) {
      setNecessaryGears(prev => [...prev, customGear.trim()]);
      setCustomGear('');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planningProblem) return;
    if (!citizenInstructions.trim()) {
      setPlanError('Please enter instructions for the participating citizens.');
      return;
    }

    setSubmittingPlan(true);
    setPlanError(null);
    try {
      const res = await api.planDriveForProblem(planningProblem.id, {
        citizen_instructions: citizenInstructions.trim(),
        necessary_gears: necessaryGears,
        meeting_point: meetingPoint.trim(),
        emergency_contact: emergencyContact.trim()
      });

      if (res.success) {
        setSuccessBanner('Cleanliness Drive instructions and required gears published successfully! All citizens can now view these in the Cleanliness Drives portal.');
        setPlanningProblem(null);
        fetchProblems();
        setTimeout(() => setSuccessBanner(null), 6000);
      }
    } catch (err: any) {
      setPlanError(err.message || 'Failed to publish drive plan.');
    } finally {
      setSubmittingPlan(false);
    }
  };

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const targetWard = wardFilter === 'all' ? undefined : parseInt(wardFilter, 10);
      const res = await api.getCommunityWardProblems(targetWard);
      if (res.success && res.data) {
        setProblems(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load ward problems for community:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [wardFilter]);

  const openRequestModal = (prob: CommunityProblem) => {
    setModalProblem(prob);
    setRequestError(null);

    // Check if community has already submitted
    const existing = prob.drive_requests?.find(r => r.community_id === community?.id);
    if (existing) {
      setVolunteersCount(existing.proposed_volunteers_count || prob.estimated_volunteers_needed || 20);
      setEquipmentList(existing.equipment_available || prob.suggested_equipment || []);
      setProposalNotes(existing.notes || '');
    } else {
      setVolunteersCount(prob.estimated_volunteers_needed || 20);
      setEquipmentList(prob.suggested_equipment || []);
      setProposalNotes('');
    }
  };

  const closeRequestModal = () => {
    setModalProblem(null);
    setRequestError(null);
    setCustomEquipment('');
  };

  const toggleEquipment = (item: string) => {
    setEquipmentList(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const addCustomEquipment = () => {
    if (customEquipment.trim() && !equipmentList.includes(customEquipment.trim())) {
      setEquipmentList(prev => [...prev, customEquipment.trim()]);
      setCustomEquipment('');
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProblem) return;

    if (volunteersCount < 1) {
      setRequestError('Please specify at least 1 volunteer for the drive.');
      return;
    }

    setSubmittingRequest(true);
    setRequestError(null);

    try {
      const res = await api.requestPlanCommunityDrive(modalProblem.id, {
        proposed_volunteers_count: Number(volunteersCount),
        proposed_date: modalProblem.start_time || new Date().toISOString(),
        equipment_available: equipmentList,
        notes: proposalNotes.trim()
      });

      if (res.success) {
        setSuccessBanner(`Your drive proposal for "${modalProblem.title}" has been submitted to the Ward Officer for approval! Multiple communities can collaborate on joint drives.`);
        closeRequestModal();
        await fetchProblems();
      } else {
        setRequestError(res.message || 'Failed to submit drive request.');
      }
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit drive request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
            Civic Partnership · Ward {community?.ward_number || 3}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f2925] tracking-tight">
            Ward Problems for Community Action
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Published civic hotspots awaiting volunteer action. Multiple communities can submit proposals to organize a drive, and the Ward Officer can approve single or joint community drives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-bold text-slate-600">Ward Filter:</span>
            <select
              value={wardFilter}
              onChange={e => setWardFilter(e.target.value)}
              className="bg-white text-slate-800 font-bold text-xs rounded-lg px-2 py-1 outline-none border border-slate-200"
            >
              <option value="all">All Wards (Entire Navsari)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
                <option key={w} value={String(w)}>Ward {w}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchProblems}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-[#e2e8f0] transition shadow-2xs"
            title="Refresh Problems"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Problems Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#095c54] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-[#0f2925]">No Pending Civic Problems for Action</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your Ward Officer has not posted any unresolved community problems at this moment. You can still initiate your own independent cleanliness drives under the Activities tab!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {problems.map(prob => {
            const myCommId = community?.id || '';
            const myRequest = prob.drive_requests?.find(r => r.community_id === myCommId);
            const isApprovedForMe =
              prob.assigned_communities?.some(ac => ac.community_id === myCommId) ||
              prob.claimed_by_community_id?.split(',').map(s => s.trim()).includes(myCommId);

            const isJoint = (prob.assigned_communities?.length || 0) > 1;
            const partnerNames = prob.assigned_communities
              ?.filter(ac => ac.community_id !== myCommId)
              .map(ac => ac.community_name) || [];

            const totalProposals = prob.drive_requests?.length || 0;

            return (
              <div
                key={prob.id}
                className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  isApprovedForMe ? 'lg:col-span-2 ring-1 ring-emerald-200' : ''
                }`}
              >
                <div>
                  {/* Photo Banner with Urgency & Status Badges */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={prob.image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80'}
                      alt={prob.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          prob.urgency === 'critical'
                            ? 'bg-rose-600 text-white'
                            : prob.urgency === 'high'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        {prob.urgency} Urgency
                      </span>

                      <span className="px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs text-xs font-bold">
                        Ward {prob.ward_number}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {isApprovedForMe ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm bg-emerald-500 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approved For You
                        </span>
                      ) : myRequest ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          myRequest.status === 'approved'
                            ? 'bg-emerald-500 text-white'
                            : myRequest.status === 'rejected'
                            ? 'bg-slate-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {myRequest.status === 'pending' ? 'Your Proposal Sent (Under Review)' : myRequest.status}
                        </span>
                      ) : totalProposals > 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm bg-indigo-600 text-white">
                          {totalProposals} {totalProposals === 1 ? 'Proposal' : 'Proposals'} Sent
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm bg-slate-700 text-white">
                          Open For Proposals
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="text-base sm:text-lg font-black leading-tight drop-shadow-sm">
                        {prob.title}
                      </h3>
                      <p className="text-xs text-emerald-100 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {prob.location_name} · {prob.address}
                      </p>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Issue Description
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        {prob.description}
                      </p>
                    </div>

                    {/* What Should Be Done */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Officer's Recommended Action Plan
                      </span>
                      <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                        {prob.action_plan}
                      </p>
                    </div>

                    {/* Official Drive Schedule (Officer-Fixed) */}
                    {prob.start_time && (
                      <div className="flex items-center gap-1.5 text-xs text-teal-800 font-bold bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                        <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Schedule: <strong>{new Date(prob.start_time).toLocaleDateString([], { dateStyle: 'medium' })} · {new Date(prob.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {new Date(prob.end_time || prob.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      </div>
                    )}

                    {/* Joint Drive / Partner Highlights */}
                    {isApprovedForMe && isJoint && (
                      <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Joint Cleanliness Drive! Co-organizing with: <strong>{partnerNames.join(', ')}</strong></span>
                      </div>
                    )}

                    {/* Published Citizen Instructions & Required Gears */}
                    {prob.citizen_instructions && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Published Citizen Guidelines:</span>
                        </div>
                        <p className="text-xs text-amber-950 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-100">
                          {prob.citizen_instructions}
                        </p>
                        {prob.necessary_gears && prob.necessary_gears.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[11px] font-bold text-amber-900 block mb-1">
                              Necessary Gears for Volunteers:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {prob.necessary_gears.map((g, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-200"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {prob.meeting_point && (
                          <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span>Assembly Point: {prob.meeting_point}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Volunteers & Equipment */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-[#095c54]" />
                          Recommended: <strong>{prob.estimated_volunteers_needed}</strong>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-teal-700">
                          Quota: <strong>{prob.max_volunteers_per_community || 25} / comm</strong>
                        </span>
                      </div>

                      {totalProposals > 0 && (
                        <div className="flex items-center gap-1 text-indigo-700 font-bold">
                          <span>📬 {totalProposals} {totalProposals === 1 ? 'Proposal Sent' : 'Proposals Sent'}</span>
                        </div>
                      )}

                      {prob.claimed_by_community_name && (
                        <div className="flex items-center gap-1 text-blue-700 font-bold">
                          <Building className="w-3.5 h-3.5" />
                          <span>{isApprovedForMe ? 'Approved for your community' : `Approved: ${prob.claimed_by_community_name}`}</span>
                        </div>
                      )}
                    </div>

                    {prob.suggested_equipment && prob.suggested_equipment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {prob.suggested_equipment.map((eq, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Posted by: {prob.officer_name || 'Ward Officer'}
                    </span>
                    {prob.evidence_status === 'submitted' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black border border-indigo-200">
                        ⏳ Evidence Submitted · Officer Review Pending
                      </span>
                    )}
                    {(prob.evidence_status === 'verified_complete' || prob.evidence_status === 'ward_verified' || prob.status === 'resolved') && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                        ✓ Work Verified &amp; Completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isApprovedForMe ? (
                      <button
                        onClick={() => openPlanModal(prob)}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs sm:text-sm shadow-sm hover:bg-[#074741] transition active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{prob.citizen_instructions ? 'Edit Citizen Plan & Gears' : 'Plan Drive & Citizen Instructions'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : myRequest && myRequest.status === 'pending' ? (
                      <button
                        onClick={() => openRequestModal(prob)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-sm transition active:scale-95"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Update Proposal ({myRequest.proposed_volunteers_count} vols)</span>
                      </button>
                    ) : prob.status === 'claimed' ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Drive Assigned</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => openRequestModal(prob)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#095c54] text-white font-black text-xs sm:text-sm shadow-sm hover:bg-[#074741] transition active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>Request to Plan Drive</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Published Drive Operations Tabs: Attendance, Citizen Q&A, Evidence Submission */}
                {isApprovedForMe && (
                  <DriveOperationsTabs
                    driveId={prob.id}
                    driveTitle={prob.title}
                    driveStartTime={prob.start_time}
                    driveMeetingPoint={prob.meeting_point || prob.location_name}
                    driveGears={prob.necessary_gears || prob.suggested_equipment || []}
                    maxCapacity={
                      isJoint
                        ? (prob.assigned_communities?.length || 1) * (prob.max_volunteers_per_community || 25)
                        : prob.max_volunteers_per_community || prob.estimated_volunteers_needed || 30
                    }
                    communityId={community?.id}
                    isJointDrive={isJoint}
                    evidenceStatus={prob.evidence_status}
                    evidenceReviewComments={prob.evidence_review_comments}
                    onEvidenceSubmitted={fetchProblems}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. PROPOSAL SUBMISSION MODAL */}
      {modalProblem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1">
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                  Community Drive Proposal · Ward {modalProblem.ward_number}
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  {modalProblem.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {modalProblem.location_name}
                </p>
              </div>
              <button
                onClick={closeRequestModal}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Notice */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              <strong className="block mb-0.5 text-blue-950 font-bold">Collaborative Municipal Drive Flow:</strong>
              Your proposal will be sent to the Ward Officer. Ward Officers can select one or more communities to approve joint/solo drives based on volunteer strength and strategy.
            </div>

            {requestError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            {/* Proposal Form */}
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Proposed Volunteers Count & Proposed Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Volunteers You Commit to Mobilize *
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={volunteersCount}
                      onChange={e => setVolunteersCount(parseInt(e.target.value, 10) || 1)}
                      required
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Officer suggested: {modalProblem.estimated_volunteers_needed} volunteers
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-teal-900 tracking-wider mb-1">
                    <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Officer-Designated Schedule</span>
                  </div>
                  <p className="text-xs font-bold text-teal-950">
                    {modalProblem.start_time
                      ? `${new Date(modalProblem.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(modalProblem.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(modalProblem.end_time || modalProblem.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Fixed by Ward Officer'}
                  </p>
                  <p className="text-[10px] text-teal-700 mt-0.5">
                    Starting & ending times are fixed by the Ward Officer and cannot be modified.
                  </p>
                </div>
              </div>

              {/* Equipment & Tools Provided */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Equipment / Safety Gear Provided by Your Community
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {modalProblem.suggested_equipment?.map((item, idx) => {
                    const isSelected = equipmentList.includes(item);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => toggleEquipment(item)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Equipment */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom gear (e.g. 5 Wheelbarrows, Refreshments)"
                    value={customEquipment}
                    onChange={e => setCustomEquipment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomEquipment();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomEquipment}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Proposal Notes / Execution Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Drive Execution Strategy & Notes for Ward Officer
                </label>
                <textarea
                  rows={3}
                  value={proposalNotes}
                  onChange={e => setProposalNotes(e.target.value)}
                  placeholder="Outline your mobilization plan, volunteer division, waste sorting approach, or readiness to collaborate with other groups..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  disabled={submittingRequest}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#095c54] text-white font-bold text-xs sm:text-sm hover:bg-[#074741] transition disabled:opacity-50 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingRequest ? 'Submitting Proposal...' : 'Submit Proposal to Ward Officer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DRIVE PLANNING & CITIZEN INSTRUCTIONS MODAL */}
      {planningProblem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Approved Community Drive Planning · Ward {planningProblem.ward_number}
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  {planningProblem.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {planningProblem.location_name}
                </p>
              </div>
              <button
                onClick={closePlanModal}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Officer Designated Schedule Badge */}
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider block">Official Designated Schedule (Fixed by Ward Officer)</span>
                <span className="font-bold text-teal-950">
                  {planningProblem.start_time
                    ? `${new Date(planningProblem.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(planningProblem.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(planningProblem.end_time || planningProblem.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Fixed Schedule'}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
                Volunteer Quota: up to {planningProblem.max_volunteers_per_community || 25} / comm
              </span>
            </div>

            {/* Info Notice */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              <strong className="block mb-0.5 text-blue-950 font-bold">Public Citizen Instructions & Gear Checklist:</strong>
              As an approved community leader, set the ground instructions, assembly points, and necessary safety gears for citizens who will register to participate in this drive.
            </div>

            {planError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{planError}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Instructions for Citizens */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Instructions & Safety Guidelines for Citizens *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Visible to all volunteers</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={citizenInstructions}
                  onChange={e => setCitizenInstructions(e.target.value)}
                  placeholder="e.g. Gather at the North Gate by 7:45 AM. Wear full sleeves and sturdy boots. Safety briefing will be held at 8:00 AM sharp. Collection bags and gloves will be provided..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#095c54] font-medium leading-relaxed"
                />
              </div>

              {/* Necessary Gears & Safety Equipment */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Necessary Gears & Equipment for Citizens</span>
                  <span className="text-[10px] text-slate-400 font-normal">Select or add items</span>
                </label>

                {/* Preset Options */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {PRESET_GEAR_OPTIONS.map((item, idx) => {
                    const isSelected = necessaryGears.includes(item);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => toggleGear(item)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#095c54] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Gear Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGear}
                    onChange={e => setCustomGear(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomGear();
                      }
                    }}
                    placeholder="Add custom gear/tool (e.g. Heavy rakes, Biohazard bucket)..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#095c54]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomGear}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected Gears Tag List */}
                {necessaryGears.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-400 w-full mb-1">
                      Current Checklist ({necessaryGears.length} items):
                    </span>
                    {necessaryGears.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => toggleGear(item)}
                          className="hover:text-rose-500 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Assembly Point & Coordinator Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meeting / Assembly Point *
                  </label>
                  <input
                    type="text"
                    value={meetingPoint}
                    onChange={e => setMeetingPoint(e.target.value)}
                    placeholder="e.g. Near Main Gate / Central Parking"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-[#095c54]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ground Coordinator Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={e => setEmergencyContact(e.target.value)}
                    placeholder="e.g. +91 98251 00001 (Lead Coordinator)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-[#095c54]"
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closePlanModal}
                  disabled={submittingPlan}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#095c54] text-white font-bold text-xs sm:text-sm hover:bg-[#074741] transition disabled:opacity-50 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{submittingPlan ? 'Publishing Plan...' : 'Publish Plan & Instructions for Citizens'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


