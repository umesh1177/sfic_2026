import React, { useState, useEffect } from 'react';
import {
  Award,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  CheckCircle2,
  Send,
  Plus,
  X,
  BadgeCheck,
  MapPin,
  Calendar,
  ThumbsUp,
  Image,
  Filter,
  Flame,
  ShieldCheck,
  TrendingUp,
  User,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { CommunityRecognitionPost, RecognitionComment } from '../types/index.js';
import { Language, translations } from '../i18n/translations.js';

interface RewardsRecognitionProps {
  lang: Language;
}

export const RewardsRecognition: React.FC<RewardsRecognitionProps> = ({ lang }) => {
  const [posts, setPosts] = useState<CommunityRecognitionPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'official' | 'community'>('all');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Nominate / Create Recognition Post Modal State
  const [isNominateModalOpen, setIsNominateModalOpen] = useState<boolean>(false);
  const [heroName, setHeroName] = useState<string>('');
  const [heroRole, setHeroRole] = useState<string>('Civic Cleanliness Champion');
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDescription, setPostDescription] = useState<string>('');
  const [postWardNumber, setPostWardNumber] = useState<number>(3);
  const [achievementStats, setAchievementStats] = useState<string>('300 kg waste cleared · 8 saplings planted');
  const [postImageUrl, setPostImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'
  );
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  const t = translations[lang];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.getRecognitionPosts();
      setPosts(res.data);
    } catch (err) {
      console.error('Failed to load recognition posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle Like / Applaud
  const handleToggleLike = async (postId: string) => {
    try {
      const res = await api.togglePostLike(postId);
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: res.data.is_liked, likes_count: res.data.likes_count }
            : p
        )
      );

      if (res.data.is_liked) {
        confetti({
          particleCount: 40,
          spread: 45,
          origin: { y: 0.7 }
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Please log in to applaud posts.');
    }
  };

  // Toggle Comment Box
  const toggleCommentsBox = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Submit Comment
  const handleAddComment = async (postId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!text) return;

    setSubmittingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await api.addPostComment(postId, text);
      if (res.data) {
        setPosts(prev =>
          prev.map(p => {
            if (p.id === postId) {
              const updatedComments = [...(p.comments || []), res.data];
              return {
                ...p,
                comments: updatedComments,
                comments_count: (p.comments_count || 0) + 1
              };
            }
            return p;
          })
        );
        setNewCommentText(prev => ({ ...prev, [postId]: '' }));
        showToast('Appreciation posted to community wall!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to post appreciation.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Handle Share
  const handleShare = (post: CommunityRecognitionPost) => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: `Check out this cleanliness spotlight on Swachh Setu: ${post.hero_name}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}#post-${post.id}`);
      showToast('Recognition link copied to clipboard!');
    }
  };

  // Submit New Recognition Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroName.trim() || !postTitle.trim() || !postDescription.trim()) {
      showToast('Please fill in hero name, title, and description.');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const wardNames: Record<number, string> = {
        1: 'Ward 1 - Lunsikui',
        2: 'Ward 2 - Station Road',
        3: 'Ward 3 - Dudhiya Talao',
        4: 'Ward 4 - Fuwara & Tower',
        9: 'Ward 9 - Junathana Market'
      };

      const res = await api.createRecognitionPost({
        hero_name: heroName.trim(),
        hero_role: heroRole.trim(),
        badge_title: 'Community Cleanliness Spotlight',
        title: postTitle.trim(),
        description: postDescription.trim(),
        ward_number: postWardNumber,
        ward_name: wardNames[postWardNumber] || `Ward ${postWardNumber}`,
        achievement_stats: achievementStats.trim(),
        image_url: postImageUrl
      });

      if (res.data) {
        setPosts(prev => [res.data, ...prev]);
        setIsNominateModalOpen(false);
        setHeroName('');
        setPostTitle('');
        setPostDescription('');
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
        showToast('Spotlight successfully published on Community Wall!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit spotlight post.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (activeFilter === 'official') return p.is_verified_nmc;
    if (activeFilter === 'community') return !p.is_verified_nmc;
    return true;
  });

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-12 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#095c54] text-white px-4 py-2 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-scaleUp">
          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HERO HEADER */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e2e8f0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-black text-[#047857] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
            {t.app_subtitle}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#095c54] tracking-tight">
            {t.rewards_title}
          </h1>
          <p className="text-xs text-[#64748b] mt-1 max-w-lg">
            {t.action_drives_sub}
          </p>
        </div>

        <button
          onClick={() => setIsNominateModalOpen(true)}
          className="btn-primary-custom px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition shrink-0 w-full sm:w-auto touch-press"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>{lang === 'gu' ? 'હીરો નોમિનેટ કરો' : lang === 'hi' ? 'हीरो नामांकित करें' : 'Nominate a Hero'}</span>
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        {[
          { id: 'all', label: lang === 'gu' ? 'બધા' : lang === 'hi' ? 'सभी' : 'All Spotlights', icon: Award },
          { id: 'official', label: lang === 'gu' ? 'NMC સત્તાવાર' : lang === 'hi' ? 'NMC आधिकारिक' : 'NMC Official', icon: ShieldCheck },
          { id: 'community', label: lang === 'gu' ? 'નાગરિક સ્પૉટ' : lang === 'hi' ? 'नागरिक स्पॉट' : 'Citizen Spotlights', icon: Users }
        ].map(f => {
          const TabIcon = f.icon;
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-2 border touch-press ${
                isActive
                  ? 'bg-[#095c54] text-white border-[#095c54] shadow-sm'
                  : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-slate-50'
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-[#64748b]'}`} />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. POSTS FEED (LINKEDIN STYLE)                          */}
      {/* ======================================================== */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="bg-white rounded-3xl p-5 border border-[#e2e8f0] animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-32 h-3.5 bg-slate-200 rounded" />
                  <div className="w-20 h-2.5 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-44 bg-slate-100 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#e2e8f0] text-center space-y-3">
          <Award className="w-12 h-12 text-[#94a3b8] mx-auto" />
          <h3 className="text-base font-extrabold text-[#095c54]">No Spotlights in this category yet</h3>
          <p className="text-xs text-[#64748b]">
            Be the first to nominate a volunteer, neighbor, or sanitation worker who did exemplary cleanliness work.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <article
              key={post.id}
              id={`post-${post.id}`}
              className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden hover:shadow-md transition"
            >
              {/* Header: Author & Ward Badge */}
              <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#095c54] via-[#0d6e65] to-[#10b981] text-white flex items-center justify-center font-black text-xs shadow-md shrink-0">
                    {post.is_verified_nmc ? 'NMC' : post.author_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-sm text-[#0f2925]">
                        {post.author_name}
                      </span>
                      {post.is_verified_nmc && (
                        <BadgeCheck className="w-4 h-4 text-[#0284c7] fill-[#0284c7]/15 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748b] font-medium flex items-center gap-1 mt-0.5">
                      <span>{post.author_role}</span>
                      <span>·</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f0f6f4] text-[#095c54] border border-[#b8e0d7] shrink-0">
                  {post.ward_name}
                </span>
              </div>

              {/* Spotlight Hero Banner */}
              <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-2xl bg-gradient-to-r from-[#ecfdf5] to-[#f0fdf4] border border-[#a7f3d0] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-white shadow-sm text-[#d97706]">
                    <Award className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#047857] tracking-wider block">
                      {post.badge_title || 'Honored Cleanliness Hero'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-xs font-black text-[#0f2925]">
                        {post.hero_name}
                      </span>
                      <span className="text-[10px] font-semibold text-[#64748b]">
                        · {post.hero_role}
                      </span>
                    </div>
                  </div>
                </div>

                {post.achievement_stats && (
                  <span className="text-[10px] font-bold text-[#047857] bg-white px-2.5 py-1 rounded-xl shadow-xs border border-[#a7f3d0] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#047857] shrink-0" />
                    <span>{post.achievement_stats}</span>
                  </span>
                )}
              </div>

              {/* Story Title & Description */}
              <div className="px-4 sm:px-5 pb-3 space-y-1.5">
                <h2 className="text-sm sm:text-base font-black text-[#0f2925] leading-snug">
                  {post.title}
                </h2>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-line">
                  {post.description}
                </p>
              </div>

              {/* Before & After Photo Comparison if available */}
              {(post as any).before_image_url && ((post as any).after_image_url || ((post as any).after_photos && (post as any).after_photos.length > 0)) ? (
                <div className="mx-4 sm:mx-5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative rounded-2xl overflow-hidden border border-rose-200 bg-slate-900 group shadow-sm">
                    <img
                      src={(post as any).before_image_url}
                      alt="Before Cleanup"
                      className="w-full h-52 object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-rose-600/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs flex items-center gap-1 shadow-md">
                      <span>Before Cleanup</span>
                    </div>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-200 bg-slate-900 group shadow-sm">
                    <img
                      src={(post as any).after_image_url || (post as any).after_photos[0]}
                      alt="After Cleanup"
                      className="w-full h-52 object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span>Work Done & Restored ✓</span>
                    </div>
                  </div>
                </div>
              ) : (post as any).after_photos && (post as any).after_photos.length > 1 ? (
                /* Multi-photo device upload gallery */
                <div className="mx-4 sm:mx-5 mb-4 grid grid-cols-2 gap-2">
                  {(post as any).after_photos.map((ph: string, idx: number) => (
                    <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                      <img src={ph} alt={`Photo ${idx + 1}`} className="w-full h-44 object-cover hover:scale-105 transition duration-300" loading="lazy" />
                    </div>
                  ))}
                </div>
              ) : post.image_url ? (
                <div className="relative bg-slate-900 overflow-hidden">
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full max-h-[380px] object-cover hover:scale-[1.01] transition duration-300"
                    loading="lazy"
                  />
                </div>
              ) : null}

              {/* Engagement Counter */}
              <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs text-[#64748b] border-b border-[#f1f5f9]">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#fee2e2] text-[#dc2626]">
                    <Heart className="w-3 h-3 text-[#dc2626] fill-[#dc2626]" />
                  </span>
                  <span className="font-bold text-[#0f2925]">{post.likes_count || 0}</span>
                  <span>appreciations</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span>{(post.comments || []).length} comments</span>
                </div>
              </div>

              {/* Action Buttons: Like, Comment, Share */}
              <div className="px-2 sm:px-4 py-1.5 grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleToggleLike(post.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    post.is_liked
                      ? 'text-[#dc2626] bg-[#fee2e2]/60'
                      : 'text-[#64748b] hover:bg-slate-50'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      post.is_liked ? 'fill-[#dc2626] text-[#dc2626]' : 'text-[#64748b]'
                    }`}
                  />
                  <span>{post.is_liked ? 'Applauded' : 'Applaud'}</span>
                </button>

                <button
                  onClick={() => toggleCommentsBox(post.id)}
                  className="py-2 px-2 rounded-xl text-xs font-bold text-[#64748b] hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>

                <button
                  onClick={() => handleShare(post)}
                  className="py-2 px-2 rounded-xl text-xs font-bold text-[#64748b] hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>

              {/* ======================================================== */}
              {/* COMMENTS DRAWER                                          */}
              {/* ======================================================== */}
              {expandedComments[post.id] && (
                <div className="bg-[#f8faf9] p-4 sm:p-5 border-t border-[#e2e8f0] space-y-3 animate-fadeIn">
                  {/* Existing Comments */}
                  <div className="space-y-2.5">
                    {(post.comments || []).length === 0 ? (
                      <p className="text-xs text-[#94a3b8] text-center py-2">
                        No comments yet. Write the first appreciation for this hero!
                      </p>
                    ) : (
                      (post.comments || []).map((c: RecognitionComment) => (
                        <div key={c.id} className="bg-white p-3 rounded-2xl border border-[#e2e8f0] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-[#0f2925]">
                              {c.citizen_name}
                            </span>
                            <span className="text-[10px] text-[#94a3b8]">
                              {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-[#475569] leading-relaxed">
                            {c.comment_text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Write your appreciation for this hero..."
                      value={newCommentText[post.id] || ''}
                      onChange={e =>
                        setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none bg-white"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={submittingComment[post.id] || !newCommentText[post.id]?.trim()}
                      className="btn-primary-custom px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                      <span className="hidden sm:inline">Post</span>
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: NOMINATE A CLEANLINESS HERO                     */}
      {/* ======================================================== */}
      {isNominateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeInBackdrop"
          onClick={() => setIsNominateModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-[2rem] sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#e2e8f0] space-y-4 my-0 sm:my-8 animate-slideUpSheet sm:animate-scaleUp pb-safe max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Native Mobile Drag Pill */}
            <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#e6f4f1] text-[#095c54]">
                  <Award className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-[#095c54]">
                    Nominate a Cleanliness Hero
                  </h3>
                  <p className="text-[11px] text-[#64748b]">
                    Share community spotlights on the Navsari Swachhata Wall
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNominateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#64748b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#095c54] mb-1">
                    Hero / Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel, Youth Task Force"
                    value={heroName}
                    onChange={e => setHeroName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#095c54] mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Civic Champion, Sanitation Worker"
                    value={heroRole}
                    onChange={e => setHeroRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#095c54] mb-1">
                    Navsari Ward
                  </label>
                  <select
                    value={postWardNumber}
                    onChange={e => setPostWardNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(w => (
                      <option key={w} value={w}>
                        Ward {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#095c54] mb-1">
                    Key Metric / Achievement
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 kg waste cleared"
                    value={achievementStats}
                    onChange={e => setAchievementStats(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#095c54] mb-1">
                  Spotlight Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transforming Ashapuri Canal Bank into a Clean Jogging Track"
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#095c54] mb-1">
                  Detailed Story & Contribution *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe what great work this person or team did for the cleanliness of Navsari..."
                  value={postDescription}
                  onChange={e => setPostDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#095c54] mb-1">
                  Action Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={postImageUrl}
                  onChange={e => setPostImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] text-xs font-medium focus:border-[#095c54] outline-none"
                />
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748b]">
                  <span>Sample photos:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPostImageUrl(
                        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'
                      )
                    }
                    className="underline text-[#095c54]"
                  >
                    Volunteer Team
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPostImageUrl(
                        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80'
                      )
                    }
                    className="underline text-[#095c54]"
                  >
                    Sanitation Crew
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNominateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748b] hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="btn-primary-custom px-5 py-2 rounded-xl text-xs font-extrabold shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingPost ? 'Publishing...' : 'Publish Spotlight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
