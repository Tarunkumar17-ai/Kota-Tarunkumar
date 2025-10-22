import React from 'react';
import { STYLE_PRESETS } from '../constants/styles';

interface StyleFiltersProps {
  selectedStyle: string | null;
  onStyleSelect: (styleName: string | null) => void;
}

const StyleFilters: React.FC<StyleFiltersProps> = ({ selectedStyle, onStyleSelect }) => {
  const handleSelect = (styleName: string) => {
    // If the clicked style is already selected, deselect it. Otherwise, select it.
    onStyleSelect(selectedStyle === styleName ? null : styleName);
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-purple-300">Style Filters</h3>
      <div className="grid grid-cols-3 gap-3">
        {STYLE_PRESETS.map((style) => (
          <button
            key={style.name}
            onClick={() => handleSelect(style.name)}
            className={`relative group aspect-square rounded-lg overflow-hidden focus:outline-none transition-all duration-200 transform hover:scale-105 ${selectedStyle === style.name ? 'ring-2 ring-purple-500 scale-105' : 'ring-1 ring-transparent'}`}
            aria-pressed={selectedStyle === style.name}
            aria-label={`Apply ${style.name} style`}
          >
            <img src={style.thumbnailUrl} alt={style.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-200"></div>
            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 w-full text-center text-xs font-semibold text-white px-1">
              {style.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StyleFilters;
