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
  User,
  Ticket
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
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#10b981]" />
            {t.support_title}
          </h2>
        </div>

        <button
          onClick={() => setShowNewTicketModal(true)}
          className="btn-primary-custom px-4 py-2.5 text-xs sm:text-sm font-bold w-full sm:w-auto justify-center touch-press"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {loading ? (
          <div className="text-center py-12 text-xs text-[#64748b] col-span-2">
            {t.loading}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#e2e8f0] text-xs text-[#64748b] col-span-2 space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#e6f4f1] text-[#095c54] flex items-center justify-center mx-auto">
              <Ticket className="w-7 h-7 text-[#095c54]" />
            </div>
            <p className="font-semibold">{t.empty}</p>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="btn-primary-custom px-4 py-2.5 text-xs touch-press mx-auto"
            >
              {t.create_ticket}
            </button>
          </div>
        ) : (
          tickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="rounded-3xl border border-[#e2e8f0] bg-white shadow-xs hover:border-[#b8e0d7] transition cursor-pointer flex flex-col justify-between overflow-hidden touch-press"
            >
              <div className="p-4 space-y-2">
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

              <div className="px-4 pb-4 pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-[#94a3b8]">
                <span>{new Date(ticket.created_at).toLocaleDateString(
                  lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN'
                )}</span>
                <span className="font-bold text-[#095c54] flex items-center gap-1">
                  {ticket.messages.length} {lang === 'gu' ? 'સંદેશા' : lang === 'hi' ? 'संदेश' : 'messages'} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* NEW TICKET MODAL */}
      {showNewTicketModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNewTicketModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-[#e2e8f0] p-5 sm:p-6 space-y-4 pb-safe max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Native Mobile Drag Pill */}
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[#095c54]">
                {t.create_ticket}
              </h3>
              <button onClick={() => setShowNewTicketModal(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none touch-press">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                  {lang === 'gu' ? 'વિષય' : lang === 'hi' ? 'विषय' : 'Subject'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'gu' ? 'દા.ત. સ્ટેશન પાસે ટ્ડસ્ટ-બિન ઢાંકણ તૂટ્યું...' : lang === 'hi' ? 'उदा. स्टेशन के पास डस्टबिन टूटा...' : 'e.g. Broken dustbin lid near station...'}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                  {lang === 'gu' ? 'પ્રકાર' : lang === 'hi' ? 'प्रकार' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold focus:border-[#095c54] outline-none bg-white"
                >
                  <option value="garbage_collection">{lang === 'gu' ? 'કચરા સંગ્રહ સમસ્યા' : lang === 'hi' ? 'कचरा संग्रह समस्या' : 'Garbage Collection Problem'}</option>
                  <option value="technical">{lang === 'gu' ? 'ટેકનિકલ સમસ્યા' : lang === 'hi' ? 'तकनीकी समस्या' : 'Technical App Issue'}</option>
                  <option value="officer_conduct">{lang === 'gu' ? 'સ્વચ્છતા કર્મચારી વ્યવહાર' : lang === 'hi' ? 'सफाई कर्मचारी आचरण' : 'Sanitation Worker Conduct'}</option>
                  <option value="feedback">{lang === 'gu' ? 'સામાન્ય સૂચન' : lang === 'hi' ? 'सामान्य सुझाव' : 'General Civic Suggestion'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2925] mb-1.5">
                  {lang === 'gu' ? 'વિગત' : lang === 'hi' ? 'विवरण' : 'Details'}
                </label>
                <textarea
                  rows={3}
                  placeholder={lang === 'gu' ? 'સમસ્યા વિગતવાર સમજાવો...' : lang === 'hi' ? 'समस्या विस्तार से बताएं...' : 'Explain the problem in detail...'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#e2e8f0] text-xs outline-none resize-none focus:border-[#095c54]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="btn-outline-custom flex-1 py-3 text-xs font-bold touch-press"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-primary-custom flex-1 py-3 text-xs font-bold touch-press"
                >
                  {lang === 'gu' ? 'ટિકિટ સબમિટ કરો' : lang === 'hi' ? 'टिकट जमा करें' : 'Submit Ticket'}
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeInBackdrop"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slideUpSheet sm:animate-scaleUp pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Native Mobile Drag Pill */}
            <div className="sm:hidden pt-2.5 pb-1 bg-gradient-to-r from-[#095c54] to-[#0d6e65] flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-white/40" />
            </div>

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
