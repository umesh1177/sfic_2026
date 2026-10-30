import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageSquare,
  PlusCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  User
} from 'lucide-react';
import { api } from '../services/api.js';
import { SupportTicket } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface FeedbackSupportProps {
  lang: Language;
}

export const FeedbackSupport: React.FC<FeedbackSupportProps> = ({ lang }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New Ticket Form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('garbage_collection');

  // Reply message
  const [replyMessage, setReplyMessage] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const t = translations[lang];

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.getSupportTickets();
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    try {
      const res = await api.createSupportTicket(subject, description, category);
      setShowNewTicketModal(false);
      setSubject('');
      setDescription('');
      setActionSuccess('Support ticket lodged! Ward Helpdesk will respond.');
      fetchTickets();
      setSelectedTicket(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const res = await api.replySupportTicket(selectedTicket.id, replyMessage);
      selectedTicket.messages.push(res.data);
      setReplyMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#10b981]" />
            {t.support_title}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Lodge service inquiries, report incomplete sanitation, or talk to NMC Ward Officers.
          </p>
        </div>

        <button
          onClick={() => setShowNewTicketModal(true)}
          className="btn-primary-custom px-4 py-2 text-xs sm:text-sm font-bold"
        >
          <PlusCircle className="w-4 h-4" /> {t.create_ticket}
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#ecfdf5] text-[#10b981] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-[#64748b] col-span-2">
            Loading support tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] text-xs text-[#64748b] col-span-2">
            No active support tickets. Click above to open a ticket if you need assistance.
          </div>
        ) : (
          tickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="p-4 rounded-3xl border border-[#e2e8f0] bg-white shadow-sm hover:border-[#b8e0d7] transition cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#095c54]">{ticket.ticket_number}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e6f4f1] text-[#095c54] capitalize">
                    {ticket.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#0f2925] line-clamp-1">
                  {ticket.subject}
                </h4>
                <p className="text-xs text-[#64748b] line-clamp-2">
                  {ticket.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] text-[#94a3b8]">
                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                <span className="font-bold text-[#095c54] flex items-center gap-1">
                  {ticket.messages.length} messages <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================================================== */}
      {/* NEW TICKET MODAL                                         */}
      {/* ======================================================== */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[#095c54]">
                Open Civic Support Ticket
              </h3>
              <button onClick={() => setShowNewTicketModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Broken dustbin lid near station..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                >
                  <option value="garbage_collection">Garbage Collection Problem</option>
                  <option value="technical">Technical App Issue</option>
                  <option value="officer_conduct">Sanitation Worker Conduct</option>
                  <option value="feedback">General Civic Suggestion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1">Details</label>
                <textarea
                  rows={3}
                  placeholder="Explain the problem in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#e2e8f0] text-xs outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="btn-outline-custom flex-1 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-custom flex-1 py-2 text-xs font-bold"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TICKET CHAT CONVERSATION MODAL                           */}
      {/* ======================================================== */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-gradient-to-r from-[#095c54] to-[#10b981] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] text-[#a7f3d0] font-bold block">{selectedTicket.ticket_number}</span>
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  {selectedTicket.subject}
                </h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-white/20 rounded-full text-white">
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {selectedTicket.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.is_staff ? 'items-start' : 'items-end'}`}
                >
                  <span className="text-[10px] text-[#64748b] mb-0.5">
                    {m.sender_name} {m.is_staff ? '(Ward Desk)' : '(You)'}
                  </span>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium ${
                      m.is_staff
                        ? 'bg-white text-[#0f2925] border border-[#e2e8f0] shadow-sm rounded-tl-sm'
                        : 'bg-[#095c54] text-white rounded-tr-sm shadow-sm'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="p-3 bg-white border-t border-[#e2e8f0] flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Type your response to the ward officer..."
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                className="p-2.5 rounded-xl bg-[#095c54] text-white hover:bg-[#05443e] transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
