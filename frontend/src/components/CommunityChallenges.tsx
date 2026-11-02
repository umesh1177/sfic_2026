import React, { useState, useEffect } from 'react';
import { Trophy, Users, CheckCircle2, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { Challenge } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface CommunityChallengesProps {
  lang: Language;
}

export const CommunityChallenges: React.FC<CommunityChallengesProps> = ({ lang }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  const t = translations[lang];

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await api.getChallenges();
      setChallenges(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const handleJoin = async (id: string) => {
    try {
      await api.joinChallenge(id);
      setActionSuccess('You joined this community challenge! Track your progress as you report and participate.');
      fetchChallenges();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-[#e2e8f0]">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#095c54] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#d97706]" />
          {t.challenges_title}
        </h2>
        <p className="text-xs text-[#64748b] mt-0.5">
          {t.action_challenges_sub}
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-[#ecfdf5] text-[#10b981] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-[#64748b]">{t.loading}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(ch => {
            const percent = Math.min(100, Math.round((ch.current_value / ch.target_value) * 100));

            return (
              <div
                key={ch.id}
                className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e2e8f0] bg-white shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#fef3c7] text-[#d97706] uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Live Challenge
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      Ends: {new Date(ch.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-[#095c54]">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-[#0f2925]">
                    {ch.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#64748b]">Mission Progress</span>
                      <span className="text-[#095c54]">
                        {ch.current_value} / {ch.target_value} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#d97706] to-[#10b981] h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#64748b] pt-1">
                    <Users className="w-4 h-4 text-[#095c54]" />
                    <span><strong>{ch.participants_count}</strong> Citizens Participating</span>
                  </div>
                </div>

                <div>
                  {ch.is_joined ? (
                    <div className="w-full py-2.5 rounded-xl bg-[#ecfdf5] text-[#10b981] text-xs font-extrabold flex items-center justify-center gap-1.5 border border-[#a7f3d0]">
                      <CheckCircle2 className="w-4 h-4" /> {t.registered_badge}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoin(ch.id)}
                      className="w-full btn-primary-custom py-2.5 text-xs font-bold touch-press"
                    >
                      {t.join_challenge}
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
