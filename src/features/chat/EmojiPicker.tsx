import React, { useState } from 'react';
import { Search, Smile, Heart, ThumbsUp, Shield, Sparkles } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: <Smile className="w-4 h-4" />,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: <ThumbsUp className="w-4 h-4" />,
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '👐', '🤲', '🤜', '🤛', '✊', '👊'],
  },
  {
    id: 'hearts',
    name: 'Hearts & Vibes',
    icon: <Heart className="w-4 h-4" />,
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '⚡', '⭐', '🌟', '💫', '💥', '💯', '💢'],
  },
  {
    id: 'tech',
    name: 'Security & Mesh',
    icon: <Shield className="w-4 h-4" />,
    emojis: ['🛡️', '🔒', '🔑', '🗝️', '🔐', '📡', '💻', '🖥️', '💾', '💿', '📀', '📱', '🔋', '🔌', '🕹️', '🛰️', '🌐', '🖲️', '⚙️', '⛓️', '📎', '🧬', '🔬', '🔭'],
  },
  {
    id: 'activity',
    name: 'Objects & Fun',
    icon: <Sparkles className="w-4 h-4" />,
    emojis: ['☕', '🍵', '🥂', '🍻', '🍕', '🍔', '🍟', '🌮', '🍣', '🍿', '🍩', '🎂', '🚀', '🛸', '🛫', '🚗', '🛵', '🚲', '🏆', '🎯', '🎮', '🎲', '🧩', '🎨', '🎬', '🎤', '🎧', '🎸'],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentList = EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis || [];

  const filteredEmojis = searchQuery
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : currentList;

  return (
    <div
      className="w-72 sm:w-80 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl p-3 backdrop-blur-xl flex flex-col gap-2.5 select-none"
      id="emoji-picker-container"
    >
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search emojis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Category Icons */}
      {!searchQuery && (
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2 px-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                activeCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto pr-1">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => {
              onSelectEmoji(emoji);
            }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-neutral-800/80 active:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
