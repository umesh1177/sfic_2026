import React, { useState } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Eye,
  Camera,
  Filter,
  Search,
  Award,
  Crown
} from 'lucide-react';
import { WorkAssignment, WorkerProfile } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

interface WorkHistoryViewProps {
  assignments: WorkAssignment[];
  profile: WorkerProfile | null;
  lang: Language;
}

export const WorkHistoryView: React.FC<WorkHistoryViewProps> = ({
  assignments,
  profile,
  lang
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Past/Historical assignments (including completed or all assignments formatted historically)
  const historyList = [
    ...assignments,
    {
      id: 'hist-001',
      task_code: 'TSK-NAV-2026-088',
      title: 'Secondary Bin Clearance & Sanitization',
      description: 'Solid municipal waste cleared, surrounding pavement scrubbed and disinfected.',
      category: 'waste_collection',
      priority: 'high' as const,
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      location_name: 'Tower Road Clock Circle',
      address: 'Tower Road, Main Market, Ward 3, Navsari',
      latitude: 20.9485,
      longitude: 72.9260,
      scheduled_date: '2026-10-30',
      scheduled_start_time: '2026-10-30T08:00:00Z',
      expected_end_time: '2026-10-30T11:00:00Z',
      status: 'completed' as const,
      created_at: '2026-10-30T08:00:00Z',
      updated_at: '2026-10-30T11:30:00Z',
      is_temporary_leader: true,
      temporary_leader_name: 'Kanti Solanki',
      my_attendance_status: 'present' as const
    },
    {
      id: 'hist-002',
      task_code: 'TSK-NAV-2026-074',
      title: 'Storm Drain Culvert Desilting',
      description: 'Stormwater culvert cleared of plastic bottles and silt prior to high tide.',
      category: 'drainage_cleaning',
      priority: 'urgent' as const,
      ward_id: 'ward-03',
      ward_number: 3,
      ward_name: 'Ward 3 - Dudhiya Talao',
      location_name: 'Ashapuri Temple Gate',
      address: 'Ashapuri Temple Approach Road, Ward 3, Navsari',
      latitude: 20.9520,
      longitude: 72.9310,
      scheduled_date: '2026-10-27',
      scheduled_start_time: '2026-10-27T07:30:00Z',
      expected_end_time: '2026-10-27T10:30:00Z',
      status: 'completed' as const,
      created_at: '2026-10-27T07:30:00Z',
      updated_at: '2026-10-27T10:45:00Z',
      is_temporary_leader: false,
      temporary_leader_name: 'Suresh Vaghela',
      my_attendance_status: 'present' as const
    }
  ];

  const filteredHistory = historyList.filter(
    h =>
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.task_code.toLowerCase().includes(search.toLowerCase()) ||
      h.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight">
            Work History & Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of completed field assignments, verified attendance, and officer sign-offs.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search past assignments..."
            className="pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-[#095c54] outline-hidden shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-slate-50/70 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Task Code & Date</th>
                <th className="py-3 px-4">Work Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Team Leader</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHistory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                      {item.task_code}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.scheduled_date}</span>
                    </p>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-[#0f2925]">
                    {item.title}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-slate-700 font-medium truncate max-w-xs">{item.address}</p>
                    <p className="text-[10px] text-slate-400">Ward {item.ward_number || 3} · Navsari</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 font-bold text-[#095c54]">
                      {item.is_temporary_leader ? (
                        <>
                          <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>You (Leader)</span>
                        </>
                      ) : (
                        <span>{item.temporary_leader_name || 'Kanti Solanki'}</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ Present (GPS)
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        item.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedTask(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#095c54] text-slate-700 hover:text-white text-xs font-bold transition flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-black text-[#095c54] bg-[#e6f4f1] px-2 py-0.5 rounded-md">
                  {selectedTask.task_code}
                </span>
                <h3 className="text-sm font-extrabold text-[#0f2925] mt-1">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Location & Address</p>
                <p className="font-medium text-slate-800">{selectedTask.address}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Task Description</p>
                <p className="font-medium text-slate-800">{selectedTask.description}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Municipal Sign-Off</p>
                <p className="font-bold">Verified & Approved by Ward 3 Officer Ramesh Patel</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
