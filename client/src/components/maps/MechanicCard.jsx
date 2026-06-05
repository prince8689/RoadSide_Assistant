import React from 'react';
import { FiStar, FiClock, FiMapPin, FiPhoneCall, FiShield } from 'react-icons/fi';
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
    is_verified,
    average_rating,
    total_reviews,
    distanceText,
    estimatedArrival,
    specializations,
    experience_years
  } = mechanic;

  // Convert string array to proper format if needed
  const specs = Array.isArray(specializations) ? specializations : [];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl shadow-sm border p-4 mb-3 cursor-pointer transition-all ${
        isSelected ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-gray-100 hover:shadow-md'
      }`}
      onClick={() => onViewProfile && onViewProfile(mechanic)}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl shrink-0">
          {name ? name.charAt(0).toUpperCase() : 'M'}
        </div>

        {/* Info Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-1">
                <span className="truncate">{name}</span>
                {is_verified && <FiShield className="text-primary shrink-0" size={14} title="Verified Mechanic" />}
              </h3>
              
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center text-yellow-500 text-sm">
                  <FiStar className="fill-current" size={12} />
                  <span className="ml-1 font-medium">{parseFloat(average_rating || 0).toFixed(1)}</span>
                  <span className="text-gray-400 text-xs ml-1">({total_reviews || 0})</span>
                </div>
                <span className="text-gray-300 text-xs">•</span>
                <span className="text-xs text-gray-500">{experience_years || '5+ years'} exp</span>
              </div>
            </div>
            
            <div className="bg-orange-50 text-primary text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
              <FiMapPin size={10} />
              {distanceText || `${mechanic.distance_km} km`}
            </div>
          </div>

          {/* Specializations Pills */}
          <div className="flex flex-wrap gap-1 my-2">
            {specs.slice(0, 3).map((spec, i) => (
              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {spec}
              </span>
            ))}
            {specs.length > 3 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                +{specs.length - 3} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <FiClock size={12} />
            <span>ETA: {estimatedArrival || '~10 mins'}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onCall ? onCall(mechanic) : (window.location.href = `tel:${mechanic.phone}`)}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center w-10 shrink-0"
              title="Call Mechanic"
            >
              <FiPhoneCall size={16} />
            </button>
            <button
              onClick={() => onRequestHelp && onRequestHelp(mechanic)}
              className="bg-primary hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex-1 text-sm flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
            >
              Request Help
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
