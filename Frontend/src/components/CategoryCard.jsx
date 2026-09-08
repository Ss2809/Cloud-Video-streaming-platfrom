import React from 'react';
import {
  Flame,
  Compass,
  Smile,
  Film,
  GraduationCap,
  Music,
  Trophy,
  ChevronRight,
} from 'lucide-react';

const iconMap = {
  Flame,
  Compass,
  Smile,
  Film,
  GraduationCap,
  Music,
  Trophy,
};

export default function CategoryCard({
  category,
  isSelected,
  onSelect,
}) {
  if (!category) return null;

  const IconComponent = iconMap[category.iconName] || Film;

  return (
    <button
      onClick={() => onSelect && onSelect(category.name)}
      className={`group relative flex flex-col p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 w-full overflow-hidden ${
        isSelected
          ? 'bg-purple-950/60 border-purple-500 shadow-lg shadow-purple-900/30 scale-[1.02]'
          : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20'
      }`}
    >
      {/* Background Gradient Mesh */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-30 group-hover:opacity-60 transition-opacity duration-300`}
      />

      {/* Card Content */}
      <div className="relative z-10 flex items-center justify-between w-full mb-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
            isSelected
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
              : 'bg-zinc-800/90 text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
          }`}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        <ChevronRight
          className={`w-4 h-4 transition-transform duration-300 ${
            isSelected
              ? 'text-purple-400 translate-x-0.5'
              : 'text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1'
          }`}
        />
      </div>

      <div className="relative z-10 mt-auto">
        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-200 transition-colors">
          {category.name}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5 font-medium">
          {category.count}
        </p>
      </div>

      {/* Subtle indicator bar for active state */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
      )}
    </button>
  );
}
