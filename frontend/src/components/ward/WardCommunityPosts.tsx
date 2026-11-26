import React, { useState, useEffect } from 'react';
import {
  Award,
  ThumbsUp,
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
  Image,
  ShieldCheck,
  RefreshCw,
  Bell,
  Eye,
  Megaphone,
  Camera,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api.js';
import { CommunityRecognitionPost, RecognitionComment } from '../../types/index.js';
import { PostDriveCompletionModal, CompletedDriveForPost } from './PostDriveCompletionModal.js';

export const WardCommunityPosts: React.FC = () => {
  const [posts, setPosts] = useState<CommunityRecognitionPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [completedDrives, setCompletedDrives] = useState<CompletedDriveForPost[]>([]);
  const [postCompletionModalDrive, setPostCompletionModalDrive] = useState<CompletedDriveForPost | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // New Official Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDescription, setPostDescription] = useState<string>('');
  const [postCategory, setPostCategory] = useState<string>('Cleanliness Drive Update');
  const [targetAudience, setTargetAudience] = useState<string>('Ward 3 Citizens & Public Feed');
  const [achievementStats, setAchievementStats] = useState<string>('Pavement Sanitized · 380 kg cleared');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [postImageUrl, setPostImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'
  );
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setSelectedFiles(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const [res, completedRes] = await Promise.all([
        api.getRecognitionPosts(),
        api.getWardCompletedDrives().catch(() => ({ success: false, data: [] }))
      ]);
      setPosts(res.data || []);
      setCompletedDrives((completedRes.data || []).filter((d: any) => !d.completion_posted));
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle Like
  const handleLike = async (postId: string) => {
    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
        colors: ['#095c54', '#10b981', '#34d399']
      });
      const res = await api.togglePostLike(postId);
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, is_liked: res.data.is_liked, likes_count: res.data.likes_count }
            : p
        )
      );
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  // Handle Comment Submission
  const handleAddComment = async (postId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!text) return;

    setSubmittingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await api.addPostComment(postId, text);
      if (res.data) {
        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? {
                  ...p,
                  comments_count: (p.comments_count || 0) + 1,
                  comments: [...(p.comments || []), res.data]
                }
              : p
          )
        );
        setNewCommentText(prev => ({ ...prev, [postId]: '' }));
        showToast('Comment published to community wall');
      }
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Submit Official Post
  const handleCreateOfficialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postDescription) {
      showToast('Title and content are required');
      return;
    }
    setIsSubmittingPost(true);
    try {
      const primaryPhoto = selectedFiles.length > 0 ? selectedFiles[0] : postImageUrl;
      const res = await api.createRecognitionPost({
        hero_name: 'Ward 3 Sanitation Team',
        hero_role: postCategory,
        badge_title: 'NMC Official Update',
        title: postTitle,
        description: postDescription,
        ward_number: 3,
        achievement_stats: achievementStats,
        image_url: primaryPhoto,
        before_image_url: selectedFiles.length > 1 ? selectedFiles[0] : undefined,
        after_image_url: selectedFiles.length > 1 ? selectedFiles[1] : primaryPhoto,
        after_photos: selectedFiles
      });

      if (res.data) {
        setPosts([res.data, ...posts]);
        setIsCreateModalOpen(false);
        setPostTitle('');
        setPostDescription('');
        setSelectedFiles([]);
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
        showToast('Official post published successfully across Citizen and Community feeds');
      }
    } catch (err) {
      console.error('Create post failed:', err);
      showToast('Failed to publish post');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f2925] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-[#10b981]/30 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0f2925] tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#095c54]" />
            <span>Community &amp; Citizen Posts</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Verified cleanliness completion updates, civic recognitions &amp; announcements
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPosts}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#095c54]' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Post</span>
          </button>
        </div>
      </div>

      {/* Verified Completed Drives Ready to Post */}
      {completedDrives.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#095c54]" />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#0f2925]">
                  Verified Completed Drives Ready to Post ({completedDrives.length})
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Publish official completion updates listing participating communities and send completion certificates + points.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {completedDrives.map(drv => (
              <div
                key={drv.id}
                className="p-3 rounded-2xl bg-white border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{drv.title}</p>
                  <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{drv.ward_name}</span>
                    <span>·</span>
                    <span>Communities: {(drv.participating_communities || []).join(', ')}</span>
                    <span>·</span>
                    <span>{drv.volunteers_count || drv.registered_count || 0} volunteer(s)</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPostCompletionModalDrive(drv)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-xs font-black shadow-xs transition shrink-0"
                >
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  <span>Post Completion &amp; Send Certificates</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Composer Card (LinkedIn-style quick draft prompt) */}
      <div className="p-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#095c54] text-white flex items-center justify-center font-black text-sm shrink-0">
          RP
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex-1 text-left px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-500 border border-slate-200 transition"
        >
          Add official cleanliness post, photo updates, or announcements...
        </button>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="p-2.5 rounded-xl bg-emerald-50 text-[#095c54] hover:bg-emerald-100 transition shrink-0"
          title="Attach photo"
        >
          <Image className="w-4 h-4" />
        </button>
      </div>

      {/* Posts Feed (Reusing exact Citizen/Community Wall feed layout) */}
      <div className="space-y-5">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0]">
            <RefreshCw className="w-6 h-6 text-[#095c54] animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 mt-2">Loading public feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#e2e8f0] text-slate-500 text-xs">
            No posts published yet in Ward 3.
          </div>
        ) : (
          posts.map(post => {
            const areCommentsOpen = expandedComments[post.id] || false;
            return (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-[#e2e8f0] shadow-xs overflow-hidden hover:border-[#095c54]/30 transition duration-150"
              >
                {/* Post Author Header */}
                <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    {post.author_avatar ? (
                      <img
                        src={post.author_avatar}
                        alt={post.author_name}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#095c54] font-black text-sm flex items-center justify-center border border-emerald-200">
                        {(post.author_name || 'NMC').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-[#0f2925] truncate">
                          {post.author_name}
                        </span>
                        {post.is_verified_nmc && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-black bg-[#e6f4f1] text-[#095c54] px-2 py-0.5 rounded-full border border-[#b8e0d7]"
                            title="Official Navsari Municipal Corporation Broadcast"
                          >
                            <BadgeCheck className="w-3 h-3 text-[#095c54]" />
                            <span>NMC Official</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{post.author_role}</span>
                        <span>·</span>
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Ward {post.ward_number || 3} ({post.ward_name || 'Navsari'})</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(post.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Post Text & Achievement Badge */}
                <div className="px-4 sm:px-5 pt-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#095c54] border border-emerald-200">
                      {post.badge_title || post.hero_role}
                    </span>
                    {post.achievement_stats && (
                      <span className="text-[11px] font-extrabold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {post.achievement_stats}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-[#0f2925] leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                    {post.description}
                  </p>
                </div>

                {/* Multi-Photo Comparison & Gallery Rendering (No 2-photo limit) */}
                {(() => {
                  const bPhotos: string[] = Array.isArray((post as any).before_photos) && (post as any).before_photos.length > 0
                    ? (post as any).before_photos
                    : ((post as any).before_image_url ? [(post as any).before_image_url] : []);
                  const aPhotos: string[] = Array.isArray((post as any).after_photos) && (post as any).after_photos.length > 0
                    ? (post as any).after_photos
                    : ((post as any).after_image_url ? [(post as any).after_image_url] : (post.image_url ? [post.image_url] : []));

                  if (bPhotos.length > 0 && aPhotos.length > 0) {
                    return (
                      <div className="mt-4 px-4 sm:px-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Before Section (All Before Photos) */}
                        <div className="space-y-1.5 p-2.5 rounded-2xl border border-rose-200 bg-rose-50/30">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
                              <span>Before Cleanup ({bPhotos.length})</span>
                            </span>
                            <span className="text-[9px] text-slate-400">Click to zoom</span>
                          </div>
                          <div className={`grid gap-1.5 ${
                            bPhotos.length === 1
                              ? 'grid-cols-1'
                              : bPhotos.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-2 sm:grid-cols-3'
                          }`}>
                            {bPhotos.map((bUrl, bIdx) => (
                              <div
                                key={bIdx}
                                onClick={() => setPreviewPhotoUrl(bUrl)}
                                className="relative rounded-xl overflow-hidden border border-rose-200 aspect-[4/3] bg-slate-900 group cursor-pointer shadow-xs"
                              >
                                <img
                                  src={bUrl}
                                  alt={`Before photo #${bIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  loading="lazy"
                                />
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                  #{bIdx + 1}
                                </span>
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Zoom</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* After Section (All After Photos) */}
                        <div className="space-y-1.5 p-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/30">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Restored &amp; Clean ✓ ({aPhotos.length})</span>
                            </span>
                            <span className="text-[9px] text-slate-400">Click to zoom</span>
                          </div>
                          <div className={`grid gap-1.5 ${
                            aPhotos.length === 1
                              ? 'grid-cols-1'
                              : aPhotos.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-2 sm:grid-cols-3'
                          }`}>
                            {aPhotos.map((aUrl, aIdx) => (
                              <div
                                key={aIdx}
                                onClick={() => setPreviewPhotoUrl(aUrl)}
                                className="relative rounded-xl overflow-hidden border border-emerald-200 aspect-[4/3] bg-slate-900 group cursor-pointer shadow-xs"
                              >
                                <img
                                  src={aUrl}
                                  alt={`After cleanup #${aIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  loading="lazy"
                                />
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                  #{aIdx + 1}
                                </span>
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Zoom</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (aPhotos.length > 1) {
                    return (
                      <div className="mt-4 px-4 sm:px-5 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Completion Evidence Photographs ({aPhotos.length})</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {aPhotos.map((ph: string, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => setPreviewPhotoUrl(ph)}
                              className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-900 group cursor-pointer"
                            >
                              <img
                                src={ph}
                                alt={`Photo ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Zoom</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  const singlePhoto = aPhotos[0] || bPhotos[0] || post.image_url;
                  if (singlePhoto) {
                    return (
                      <div
                        onClick={() => setPreviewPhotoUrl(singlePhoto)}
                        className="mt-4 border-y border-slate-100 bg-slate-50 overflow-hidden cursor-pointer group relative"
                      >
                        <img
                          src={singlePhoto}
                          alt={post.title}
                          className="w-full max-h-[420px] object-cover group-hover:scale-[1.01] transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <Eye className="w-3 h-3" />
                          <span>View Full</span>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Participating Communities Listed Below Completion Post */}
                {post.participating_communities && post.participating_communities.length > 0 && (
                  <div className="mx-4 sm:mx-5 my-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#095c54] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Participating Communities</span>
                      </span>
                      {(post.points_awarded_citizen || post.points_awarded_community) && (
                        <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                          🏅 Certificates &amp; Points Issued (+{post.points_awarded_citizen || 150} Citizen · +{post.points_awarded_community || 300} Community)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {post.participating_communities.map((commName, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-emerald-200 text-xs font-extrabold text-[#0f2925] shadow-2xs"
                        >
                          <Building2 className="w-3 h-3 text-[#095c54]" />
                          <span>{commName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Bar (Likes & Comments count) */}
                <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-4 h-4 rounded-full bg-[#095c54] text-white flex items-center justify-center">
                      <ThumbsUp className="w-2.5 h-2.5 text-white" />
                    </span>
                    <span>{post.likes_count || 0} appreciation</span>
                  </span>
                  <span className="font-medium">
                    {post.comments_count || (post.comments || []).length || 0} comments
                  </span>
                </div>

                {/* Action Buttons (Like, Comment, Share) */}
                <div className="px-2 sm:px-4 py-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                      post.is_liked
                        ? 'text-[#095c54] bg-[#e6f4f1] font-extrabold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${post.is_liked ? 'fill-[#095c54]' : ''}`} />
                    <span>Applaud</span>
                  </button>

                  <button
                    onClick={() =>
                      setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comment</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      showToast('Post link copied to clipboard');
                    }}
                    className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Expandable Comments Drawer */}
                {areCommentsOpen && (
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-3">
                    {/* Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCommentText[post.id] || ''}
                        onChange={e =>
                          setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        placeholder="Add a congratulatory note or municipal feedback..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:border-[#095c54] outline-hidden"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={submittingComment[post.id] || !newCommentText[post.id]?.trim()}
                        className="p-2 rounded-xl bg-[#095c54] text-white hover:bg-emerald-800 disabled:opacity-40 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Existing Comments */}
                    <div className="space-y-2 pt-1">
                      {(post.comments || []).map((c: any) => (
                        <div key={c.id} className="p-3 rounded-2xl bg-white border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[#0f2925]">{c.citizen_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(c.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <p className="text-slate-700">{c.comment_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Publish Official Ward Notice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateOfficialPost}
            className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full p-6 space-y-4 my-auto animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#095c54]" />
                <h3 className="text-base font-extrabold text-[#0f2925]">
                  Add Post
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Category</label>
                <select
                  value={postCategory}
                  onChange={e => setPostCategory(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#095c54] outline-hidden"
                >
                  <option value="Cleanliness Drive Update">Cleanliness Drive Update</option>
                  <option value="Complaint Resolution Update">Complaint Resolution Update</option>
                  <option value="Community Achievement">Community Achievement</option>
                  <option value="Public Awareness">Public Awareness</option>
                  <option value="Waste Management Awareness">Waste Management Awareness</option>
                  <option value="Ward Cleanliness Progress">Ward Cleanliness Progress</option>
                  <option value="Municipal Announcement">Municipal Announcement</option>
                  <option value="Emergency Cleanliness Notice">Emergency Cleanliness Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headline / Title</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  placeholder="e.g., Dudhiya Talao North Promenade Disinfected Post-Festival"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Body</label>
                <textarea
                  rows={3}
                  required
                  value={postDescription}
                  onChange={e => setPostDescription(e.target.value)}
                  placeholder="Detailed update for Ward 3 citizens regarding cleanup operations..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Achievement Metrics Badge</label>
                <input
                  type="text"
                  value={achievementStats}
                  onChange={e => setAchievementStats(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#095c54] outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Upload Photos from Device (Multiple Pictures Supported)
                  </label>
                  <span className="text-[10px] font-black text-[#095c54]">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'photo' : 'photos'} chosen
                  </span>
                </div>

                <div className="space-y-2.5">
                  <label
                    htmlFor="ward-post-files-input"
                    className="w-full p-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 text-[#095c54] border-2 border-dashed border-[#a7f3d0] font-black text-xs cursor-pointer transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-[#095c54]" />
                    <span>Choose Pictures from Device / Camera</span>
                  </label>
                  <input
                    id="ward-post-files-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {selectedFiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                      {selectedFiles.map((photo, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden aspect-video border border-slate-200 group bg-slate-900">
                          <img src={photo} alt={`Device upload ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-sm"
                            title="Remove picture"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1.5 text-[9px] font-black px-1.5 py-0.2 rounded-md bg-black/60 text-white backdrop-blur-xs">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Click the button above to pick images from your computer or phone gallery. You can select multiple pictures at once.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPost}
                className="px-5 py-2 rounded-xl bg-[#095c54] text-white text-xs font-extrabold hover:bg-emerald-800 transition shadow-xs"
              >
                {isSubmittingPost ? 'Publishing...' : 'Add Post to Public Feeds'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post Drive Completion & Issue Certificates Modal */}
      {postCompletionModalDrive && (
        <PostDriveCompletionModal
          drive={postCompletionModalDrive}
          onClose={() => setPostCompletionModalDrive(null)}
          onPublished={msg => {
            setPostCompletionModalDrive(null);
            showToast(msg);
            fetchPosts();
          }}
        />
      )}

      {/* Lightbox / Full Resolution Image Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black text-white transition z-10"
              title="Close image"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Full preview"
              className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

