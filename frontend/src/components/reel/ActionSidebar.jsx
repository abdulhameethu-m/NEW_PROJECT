import React from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Flag, UserPlus } from 'lucide-react';

export default function ActionSidebar({ className = '', style = {}, actions = {}, counts = {} }) {
  const { onLike, liked = false, onComment, onShare, onSave, saved = false, onReport, onFollow, followed = false } = actions;
  
  function withStop(fn) {
    return (e) => {
      e.stopPropagation();
      e.preventDefault();
      fn?.(e);
    };
  }

  const SidebarButton = ({ icon, count, onClick, active, activeClass }) => (
    <button type="button" onClick={withStop(onClick)} className="flex flex-col items-center justify-center gap-1 transition group">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition group-active:scale-90 ${active ? activeClass : ''}`}>
        {icon}
      </div>
      {(count !== undefined && count !== null) && (
        <span className="text-[11px] font-black text-white drop-shadow-md">{count}</span>
      )}
    </button>
  );

  return (
    <div style={{ position: 'absolute', right: 'env(safe-area-inset-right, 12px)', bottom: 'env(safe-area-inset-bottom, 12vh)', marginBottom: '80px', zIndex: 60, ...style }} className={className}>
      <div className="flex flex-col items-center gap-4">
        <SidebarButton icon={<Heart className={`h-6 w-6 ${liked ? 'fill-current' : ''}`} />} count={counts?.likes} onClick={onLike} active={liked} activeClass="text-rose-500" />
        <SidebarButton icon={<MessageCircle className="h-6 w-6" />} count={counts?.comments} onClick={onComment} />
        <SidebarButton icon={<Share2 className="h-6 w-6" />} count={counts?.shares} onClick={onShare} />
        <SidebarButton icon={<Bookmark className={`h-6 w-6 ${saved ? 'fill-current' : ''}`} />} count={counts?.saves} onClick={onSave} active={saved} activeClass="text-amber-400" />
        <SidebarButton icon={<Flag className="h-5 w-5" />} count="Report" onClick={onReport} />
        <SidebarButton icon={<UserPlus className="h-5 w-5" />} count={followed ? 'Following' : 'Follow'} onClick={onFollow} active={followed} activeClass="text-emerald-400" />
      </div>
    </div>
  );
}
