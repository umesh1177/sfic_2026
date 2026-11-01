import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  CheckCircle2,
  Crown,
  ChevronRight,
  Truck,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { WorkAssignment } from '../../types/index.js';
import { Language } from '../../i18n/translations.js';

interface MyAssignmentsProps {
  assignments: WorkAssignment[];
  onNavigateTab: (tabId: string, assignmentId?: string) => void;
  lang: Language;
}

export const MyAssignments: React.FC<MyAssignmentsProps> = ({
  assignments,
  onNavigateTab,
  lang
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'assigned' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredTasks = assignments.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? task.status === 'verified_complete' || task.status === 'completion_submitted' || task.status === 'closed'
        : task.status === statusFilter;

    const matchesPriority = priorityFilter === 'all' ? true : task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#0f2925] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#095c54]" />
              <span>All Work Assignments & Duty Log</span>
            </h2>
            <p className="text-xs text-[#64748b] mt-1">
              Complete log of past, present, and scheduled municipal work orders across Navsari Wards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#f8faf9] border border-[#e2e8f0] text-[#0f2925]">
              Showing {filteredTasks.length} of {assignments.length} Tasks
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#e2e8f0]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by task title, code (NMC-TSK-...), or location..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#095c54] outline-none font-semibold text-[#0f2925]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs px-3 py-2.5 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl focus:ring-2 focus:ring-[#095c54] outline-none font-bold text-[#0f2925]"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed / Submitted</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-3 py-2.5 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl focus:ring-2 focus:ring-[#095c54] outline-none font-bold text-[#0f2925]"
            >
              <option value="all">All Priorities</option>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-black text-[#0f2925]">No matching assignments found</p>
            <p className="text-xs text-[#64748b] mt-1">Try resetting your filters or search keywords.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-3xl border border-[#e2e8f0] hover:border-[#095c54]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#64748b] bg-[#f8faf9] border border-[#e2e8f0] px-2 py-0.5 rounded-lg">
                    {task.task_code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      task.priority === 'emergency' ? 'bg-red-50 text-red-700 border border-red-200' :
                      task.priority === 'high' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-[#f8faf9] text-[#64748b] border border-[#e2e8f0]'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-[#0f2925] text-base leading-snug">{task.title}</h3>
                <p className="text-xs text-[#64748b] line-clamp-2">{task.description}</p>

                {task.is_temporary_leader && (
                  <div className="p-2 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl flex items-center gap-2 text-[#047857] text-xs font-bold">
                    <Crown className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                    <span>Assigned as Temporary Team Leader for this task</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-[#e2e8f0] text-xs">
                <div className="flex items-center justify-between text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-bold text-[#0f2925] truncate max-w-[200px]">{task.location_name}</span>
                  </span>
                  <span className="text-[#64748b]">Ward {task.ward_number}</span>
                </div>

                <div className="flex items-center justify-between text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {task.scheduled_date} · {task.scheduled_start_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    Radius {task.attendance_radius_meters}m
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('daily_work', task.id)}
                  className="flex-1 px-3 py-2 bg-[#095c54] hover:bg-[#06423c] text-white text-xs font-black rounded-2xl flex items-center justify-center gap-1 transition shadow-xs"
                >
                  <span>Work Card</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('work_map', task.id)}
                  className="px-3 py-2 bg-[#f8faf9] hover:bg-[#e6f4f1] text-[#095c54] border border-[#e2e8f0] text-xs font-bold rounded-2xl flex items-center justify-center gap-1 transition"
                  title="View Map"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#095c54]" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('evidence', task.id)}
                  className="px-3 py-2 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#047857] border border-[#a7f3d0] text-xs font-bold rounded-2xl flex items-center justify-center gap-1 transition"
                  title="Photos"
                >
                  <span>Evidence</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

