import React from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Flag, UserPlus } from 'lucide-react';

export default function ActionSidebar({ className = '', style = {}, actions = {} }) {
  const { onLike, liked = false, onComment, onShare, onSave, saved = false, onReport, onFollow, followed = false } = actions;
  const buttonClass = 'flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/55 transition';

  return (
    <div style={{ position: 'absolute', right: 'env(safe-area-inset-right, 12px)', bottom: '12vh', zIndex: 60 }} className={className}>
      <div className="flex flex-col items-center gap-4">
        <button aria-label="Like" onClick={onLike} className={buttonClass}>
          <Heart className={`h-6 w-6 ${liked ? 'fill-current text-rose-600' : ''}`} />
        </button>
        <button aria-label="Comment" onClick={onComment} className={buttonClass}>
          <MessageCircle className="h-6 w-6" />
        </button>
        <button aria-label="Share" onClick={onShare} className={buttonClass}>
          <Share2 className="h-6 w-6" />
        </button>
        <button aria-label="Save" onClick={onSave} className={buttonClass}>
          <Bookmark className="h-6 w-6" />
        </button>
        <button aria-label="Report" onClick={onReport} className={buttonClass}>
          <Flag className="h-6 w-6" />
        </button>
        <button aria-label="Follow" onClick={onFollow} className={buttonClass}>
          <UserPlus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
