import { formatDate, formatDateTime } from '../../utils/dateFormat.js';
import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  RotateCw,
  Copy,
  Check,
  X,
  Search,
  Filter,
  User,
  Calendar,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { ActivityQuestion, ActivityAiSuggestion, CommunityActivity } from '../../types/index.js';
import { api } from '../../services/api.js';

interface CitizenQuestionsProps {
  activities: CommunityActivity[];
}

export const CitizenQuestions: React.FC<CitizenQuestionsProps> = ({ activities }) => {
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedQuestion, setSelectedQuestion] = useState<ActivityQuestion | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('unanswered');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [responseDraft, setResponseDraft] = useState<string>('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [copiedSuggestion, setCopiedSuggestion] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string>('');

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.getCommunityQuestions();
      if (res.success && res.data) {
        setQuestions(res.data);
        if (res.data.length > 0 && !selectedQuestion) {
          setSelectedQuestion(res.data[0]);
          if (res.data[0].suggested_answer) {
            setResponseDraft(res.data[0].suggested_answer);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleSelectQuestion = (q: ActivityQuestion) => {
    setSelectedQuestion(q);
    setResponseDraft(q.response_text || q.suggested_answer || '');
  };

  const handleGenerateAiSuggestion = async () => {
    if (!selectedQuestion) return;
    setIsGeneratingAi(true);
    try {
      const res = await api.generateAiQuestionSuggestion(selectedQuestion.id);
      if (res.success && res.data) {
        setSelectedQuestion(prev =>
          prev
            ? {
                ...prev,
                suggested_answer: res.data.suggested_answer,
                answerability_status: res.data.answerability_status,
                supporting_information: res.data.supporting_information,
                missing_information: res.data.missing_information,
                status: 'ai_suggestion_ready'
              }
            : null
        );
        setResponseDraft(res.data.suggested_answer);
      }
    } catch (err: any) {
      alert(`AI Suggestion generation failed: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSendResponse = async () => {
    if (!selectedQuestion || !responseDraft.trim()) {
      alert('Please enter a response before sending.');
      return;
    }

    setIsSubmittingResponse(true);
    try {
      const res = await api.respondToQuestion(
        selectedQuestion.id,
        responseDraft.trim(),
        selectedQuestion.s_id || selectedQuestion.ai_suggestion?.id
      );

      if (res.success) {
        setSuccessBanner('Official response sent to citizen! In-app notification dispatched.');
        setTimeout(() => setSuccessBanner(''), 4000);

        // Update local state
        setQuestions(prev =>
          prev.map(q =>
            q.id === selectedQuestion.id
              ? {
                  ...q,
                  status: 'answered',
                  response_text: responseDraft.trim(),
                  answered_at: new Date().toISOString()
                }
              : q
          )
        );

        setSelectedQuestion(prev =>
          prev
            ? {
                ...prev,
                status: 'answered',
                response_text: responseDraft.trim(),
                answered_at: new Date().toISOString()
              }
            : null
        );
      }
    } catch (err: any) {
      alert(`Failed to send response: ${err.message}`);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleCloseThread = async () => {
    if (!selectedQuestion) return;
    try {
      await api.closeQuestion(selectedQuestion.id);
      setQuestions(prev =>
        prev.map(q => (q.id === selectedQuestion.id ? { ...q, status: 'closed' } : q))
      );
      setSelectedQuestion(prev => (prev ? { ...prev, status: 'closed' } : null));
    } catch (err: any) {
      alert(`Error closing question: ${err.message}`);
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'unanswered'
        ? q.status !== 'answered' && q.status !== 'closed'
        : filterStatus === 'answered'
        ? q.status === 'answered'
        : filterStatus === 'closed'
        ? q.status === 'closed'
        : true;

    const matchesSearch =
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.citizen_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.activity_title || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          Citizen Questions & AI Support Assistant
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          All citizen inquiries regarding cleanliness drives route directly here. AI prepares verified answers for Community Head review.
        </p>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'unanswered', label: 'Unanswered' },
            { id: 'answered', label: 'Answered' },
            { id: 'closed', label: 'Closed' },
            { id: 'all', label: 'All Inquiries' }
          ].map(flt => (
            <button
              key={flt.id}
              onClick={() => setFilterStatus(flt.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                filterStatus === flt.id
                  ? 'bg-[#095c54] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search question or citizen..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-[#095c54]"
          />
        </div>
      </div>

      {/* Main Two-Column View: Inquiries List + Detail & AI Response */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Questions List (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">No citizen questions found</p>
              <p className="text-[11px] text-slate-500">
                Citizen questions about timing, equipment, or assembly points will appear here.
              </p>
            </div>
          ) : (
            filteredQuestions.map(q => {
              const isSelected = selectedQuestion?.id === q.id;
              const isAnswered = q.status === 'answered';

              return (
                <div
                  key={q.id}
                  onClick={() => handleSelectQuestion(q)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-teal-50/50 border-[#095c54] shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[180px]">
                      {q.activity_title}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isAnswered
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.status === 'closed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isAnswered ? 'ANSWERED' : q.status === 'closed' ? 'CLOSED' : 'PENDING'}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                    "{q.question_text}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3 h-3" />
                      {q.citizen_name || 'Citizen'}
                    </span>
                    <span>
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Thread & AI Review Panel (7 cols on lg) */}
        <div className="lg:col-span-7">
          {selectedQuestion ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5 sm:p-6">
              {/* Question Header & Context */}
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#095c54] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedQuestion.activity_title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      Lang: {selectedQuestion.question_language || 'EN'}
                    </span>
                    {selectedQuestion.status !== 'closed' && (
                      <button
                        onClick={handleCloseThread}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition"
                      >
                        Close Thread
                      </button>
                    )}
                  </div>
                </div>

                {/* Citizen Question Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-slate-800">
                      {selectedQuestion.citizen_name || 'Citizen Volunteer'} asked:
                    </span>
                    <span>{formatDateTime(selectedQuestion.created_at)}</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 leading-relaxed">
                    "{selectedQuestion.question_text}"
                  </p>
                </div>
              </div>

              {/* AI SUGGESTED ANSWER PANEL */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/80 via-emerald-50/50 to-white border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#095c54] text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">AI Suggested Response</p>
                      <p className="text-[11px] text-teal-800 font-medium">
                        Grounded strictly on approved drive schedule & location
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAiSuggestion}
                    disabled={isGeneratingAi}
                    className="p-1.5 rounded-lg text-[#095c54] hover:bg-teal-100 transition"
                    title="Regenerate AI Suggestion"
                  >
                    <RotateCw className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {selectedQuestion.suggested_answer ? (
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-xl bg-white border border-teal-100 text-xs font-medium text-slate-800 leading-relaxed shadow-sm">
                      {selectedQuestion.suggested_answer}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Grounded in event facts
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setResponseDraft(selectedQuestion.suggested_answer || '');
                          setCopiedSuggestion(true);
                          setTimeout(() => setCopiedSuggestion(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 font-bold text-[#095c54] hover:underline"
                      >
                        {copiedSuggestion ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied to Editor</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Use in Response</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/70 border border-teal-100 text-center space-y-2">
                    <p className="text-xs text-slate-600">
                      Generate an AI-assisted answer grounded on this drive's verified schedule, meeting point, and equipment.
                    </p>
                    <button
                      onClick={handleGenerateAiSuggestion}
                      disabled={isGeneratingAi}
                      className="px-3.5 py-1.5 rounded-xl bg-[#095c54] text-white text-xs font-bold shadow hover:bg-[#074741] transition disabled:opacity-50"
                    >
                      {isGeneratingAi ? 'Analyzing event info...' : 'Generate AI Answer'}
                    </button>
                  </div>
                )}
              </div>

              {/* Existing Response or Official Reply Editor */}
              {selectedQuestion.status === 'answered' && selectedQuestion.response_text ? (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Official Response Sent to Citizen
                    </span>
                    <span className="text-[11px] text-emerald-700 font-normal">
                      {selectedQuestion.answered_at ? formatDateTime(selectedQuestion.answered_at) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    "{selectedQuestion.response_text}"
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Community Head Official Response (Editable)</span>
                    <span className="text-[11px] text-slate-400">AI never sends automatically</span>
                  </label>

                  <textarea
                    rows={4}
                    value={responseDraft}
                    onChange={e => setResponseDraft(e.target.value)}
                    placeholder="Review or customize the AI suggestion, then send the official answer..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[#095c54] focus:ring-1 focus:ring-[#095c54] text-xs font-medium text-slate-900 outline-none resize-none leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-500">
                      Sending will deliver an in-app notification to the citizen.
                    </p>
                    <button
                      onClick={handleSendResponse}
                      disabled={isSubmittingResponse || !responseDraft.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-bold shadow-md transition disabled:opacity-50 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingResponse ? 'Sending...' : 'Send Official Answer'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
              Select a citizen question from the list to review and send an answer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

