import React from 'react';
import { FiStar, FiClock, FiMapPin, FiShield } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function MechanicCard({
  mechanic,
  onCall,
  onRequestHelp,
  onViewProfile,
  isSelected
}) {
  const {
    name,
    business_name,
    is_verified,
    average_rating,
    total_reviews,
    distanceText,
    estimatedArrival,
  } = mechanic;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white rounded-2xl shadow-sm border p-4 cursor-pointer transition-all flex flex-col min-w-[160px] max-w-[200px] flex-shrink-0 snap-center ${
        isSelected ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-gray-100 hover:shadow-md'
      }`}
      onClick={() => onViewProfile && onViewProfile(mechanic)}
    >
      {/* Avatar & Distance */}
      <div className="flex justify-between items-start mb-3">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-primary font-bold text-lg border-2 border-white shadow-sm">
          {name ? name.charAt(0).toUpperCase() : 'M'}
        </div>
        <div className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <FiMapPin size={10} className="text-primary" />
          {distanceText || `${mechanic.distance_km} km`}
        </div>
      </div>

      {/* Info Content */}
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 flex items-center gap-1 text-sm mb-0.5 line-clamp-1">
          {name}
          {is_verified && <FiShield className="text-green-500 shrink-0" size={12} title="Verified Mechanic" />}
        </h3>
        
        {business_name && business_name !== 'NIL' && (
          <p className="text-xs text-gray-500 mb-1 line-clamp-1">{business_name}</p>
        )}

        <div className="flex items-center gap-1 text-xs mb-3">
          <FiStar className="text-yellow-400 fill-yellow-400" size={12} />
          <span className="font-bold text-gray-700">{parseFloat(average_rating || 0).toFixed(1)}</span>
          <span className="text-gray-400">({total_reviews || 0})</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-primary/80 font-medium mb-3 bg-orange-50 px-2 py-1 rounded-md w-fit">
          <FiClock size={10} />
          <span>ETA: {estimatedArrival || '~10m'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRequestHelp && onRequestHelp(mechanic);
        }}
        className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-2 rounded-xl transition-colors text-xs shadow-sm mt-auto"
      >
        Request Help
      </button>
    </motion.div>
  );
}
