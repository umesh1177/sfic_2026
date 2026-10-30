import React, { useState, useEffect } from 'react';
import { Award, Trophy, Star, ShieldCheck, HeartHandshake, Users, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { RewardDefinition } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface RewardsRecognitionProps {
  lang: Language;
}

export const RewardsRecognition: React.FC<RewardsRecognitionProps> = ({ lang }) => {
  const [rewards, setRewards] = useState<RewardDefinition[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [badgesCount, setBadgesCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rewardsRes, leadRes] = await Promise.all([
          api.getMyRewards(),
          api.getLeaderboard()
        ]);
        setRewards(rewardsRes.data.rewards);
        setTotalPoints(rewardsRes.data.total_points);
        setBadgesCount(rewardsRes.data.badges_count);
        setLeaderboard(leadRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award className="w-6 h-6" />;
      case 'Users': return <Users className="w-6 h-6" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6" />;
      default: return <ShieldCheck className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-[#095c54] via-[#0d6e65] to-[#10b981] p-5 sm:p-6 rounded-3xl text-white shadow-md shadow-[#095c54]/15 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#a7f3d0]">
            Verified Municipal Recognition
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-0.5">
            {t.rewards_title}
          </h2>
          <p className="text-xs text-[#e6f4f1] mt-1 max-w-md">
            Earned for verified complaint resolutions, drive attendance, and keeping Navsari spotless.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] text-[#a7f3d0] font-bold block">Badges</span>
            <span className="text-2xl font-black">{badgesCount}</span>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] text-[#a7f3d0] font-bold block">{t.points_earned}</span>
            <span className="text-2xl font-black text-[#fef08a]">{totalPoints}</span>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h3 className="font-extrabold text-sm text-[#095c54] uppercase tracking-wider mb-3">
          Achievement Badges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {rewards.map(r => (
            <div
              key={r.id}
              className={`p-4 rounded-3xl border transition-all text-center space-y-2.5 ${
                r.is_earned
                  ? 'bg-white border-[#b8e0d7] shadow-sm hover:shadow-md'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition ${
                  r.is_earned
                    ? r.tier === 'gold'
                      ? 'bg-[#fef3c7] text-[#d97706] shadow-md shadow-[#d97706]/20'
                      : r.tier === 'platinum'
                      ? 'bg-[#f3e8ff] text-[#9333ea] shadow-md shadow-[#9333ea]/20'
                      : 'bg-[#e6f4f1] text-[#095c54]'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {getBadgeIcon(r.icon)}
              </div>

              <div>
                <h4 className="font-extrabold text-xs text-[#0f2925]">
                  {r.name}
                </h4>
                <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2">
                  {r.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-[#095c54]">+{r.points} Pts</span>
                {r.is_earned ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ecfdf5] text-[#10b981]">
                    Unlocked ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-[#94a3b8] font-bold">Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Municipal Leaderboard */}
      <div className="bg-white p-5 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-[#095c54] flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#d97706]" />
            {t.leaderboard_title}
          </h3>
          <span className="text-xs text-[#64748b]">Monthly verified ranking</span>
        </div>

        <div className="divide-y divide-[#e2e8f0]">
          {leaderboard.map(item => (
            <div key={item.rank} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                    item.rank === 1
                      ? 'bg-[#fef3c7] text-[#b45309]'
                      : item.rank === 2
                      ? 'bg-slate-200 text-slate-700'
                      : item.rank === 3
                      ? 'bg-[#ffedd5] text-[#c2410c]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.rank}
                </div>
                <img
                  src={item.avatar_url}
                  alt={item.citizen_name}
                  className="w-9 h-9 rounded-full object-cover border border-[#e2e8f0]"
                />
                <div>
                  <div className="font-bold text-xs text-[#0f2925]">{item.citizen_name}</div>
                  <div className="text-[11px] text-[#64748b]">{item.ward_name}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-sm text-[#095c54]">{item.points} pts</span>
                <span className="block text-[10px] text-[#64748b]">
                  {item.resolved_count} verified resolutions
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
