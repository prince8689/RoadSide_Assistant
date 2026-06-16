import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiStar, FiShield, FiPhoneCall, FiMapPin, FiClock, FiTool, FiBriefcase, FiCalendar, FiShare2 } from 'react-icons/fi';

const iconMap = {
  'Engine Repair': '🔧',
  'Tyre Service': '🛞',
  'Battery': '🔋',
  'Electrical': '⚡',
  'AC Repair': '❄️',
  'Towing': '🚛',
  'Body Work': '🔨',
  'General Maintenance': '🔩'
};

export default function MechanicDetailModal({ mechanic, isOpen, onClose, onRequestHelp }) {
  const [selectedCategoryId, setSelectedCategoryId] = React.useState(null);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedCategoryId(null); // reset selection when opened
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, mechanic]);

  if (!isOpen || !mechanic) return null;

  const {
    name,
    is_verified,
    average_rating,
    total_reviews,
    distanceText,
    estimatedArrival,
    specializations,
    experience_years,
    is_available
  } = mechanic;

  const specs = Array.isArray(specializations) ? specializations : [];

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Roadside Assistant - ${name}`,
          text: `Check out ${name}, a mechanic near me!`,
          url: window.location.href,
        });
      } else {
        const url = `https://www.google.com/maps/search/?api=1&query=${mechanic.latitude},${mechanic.longitude}`;
        await navigator.clipboard.writeText(url);
        alert('Google Maps link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Image / Pattern Area */}
          <div className="h-24 bg-gradient-to-r from-orange-400 to-primary relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="px-6 pb-6 overflow-y-auto flex-1">
            {/* Section 1: Header / Avatar */}
            <div className="flex flex-col items-center -mt-12 mb-6">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg mb-3">
                <div className="w-full h-full bg-orange-100 rounded-full flex items-center justify-center text-primary text-4xl font-bold">
                  {name ? name.charAt(0).toUpperCase() : 'M'}
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {name}
                {is_verified && <FiShield className="text-primary" size={20} title="Verified" />}
              </h2>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center text-yellow-500 font-medium">
                  <FiStar className="fill-current mr-1" size={16} />
                  {parseFloat(average_rating || 0).toFixed(1)} 
                  <span className="text-gray-500 text-sm ml-1 font-normal">({total_reviews || 0} reviews)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${is_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {is_available ? 'Available now' : 'Busy'}
                </div>
                <div className="flex items-center gap-1 text-gray-600 bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
                  <FiClock size={14} />
                  ETA: {estimatedArrival || '~10m'}
                </div>
              </div>
            </div>

            {/* Section 2: About / Stats */}
            <div className="grid grid-cols-3 gap-4 border-y border-gray-100 py-4 mb-6">
              <div className="text-center">
                <FiBriefcase className="mx-auto text-gray-400 mb-1" size={20} />
                <div className="font-bold text-gray-900">{experience_years || '5+ yrs'}</div>
                <div className="text-xs text-gray-500">Experience</div>
              </div>
              <div className="text-center border-x border-gray-100">
                <FiMapPin className="mx-auto text-gray-400 mb-1" size={20} />
                <div className="font-bold text-gray-900">{distanceText || `${mechanic.distance_km} km`}</div>
                <div className="text-xs text-gray-500">Distance</div>
              </div>
              <div className="text-center">
                <FiTool className="mx-auto text-gray-400 mb-1" size={20} />
                <div className="font-bold text-gray-900">{total_reviews * 3 || 15}</div>
                <div className="text-xs text-gray-500">Jobs Done</div>
              </div>
            </div>

            {/* Section 3: Services Offered */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
                Services Offered
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Select one to continue</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {mechanic.pricing && Object.values(mechanic.pricing).length > 0 ? (
                  Object.values(mechanic.pricing).map((service) => {
                    if (!service.is_enabled) return null;
                    const isSelected = selectedCategoryId === service.category_id;
                    return (
                      <button 
                        key={service.category_id}
                        onClick={() => setSelectedCategoryId(service.category_id)}
                        className={`flex flex-col text-left gap-1 border p-3 rounded-xl transition-all ${
                          isSelected 
                            ? 'bg-orange-50 border-primary ring-1 ring-primary shadow-sm' 
                            : 'bg-gray-50 border-gray-100 hover:border-orange-200'
                        }`}
                      >
                        <div className="font-bold text-sm text-gray-800">{service.name}</div>
                        <div className="text-xs text-primary font-bold">
                          ₹{service.min_price} - ₹{service.max_price}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-gray-500 italic text-sm">No specific services listed.</div>
                )}
              </div>
            </div>

            {/* Section 4: Recent Reviews (Mocked based on rating) */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Recent Reviews</h3>
              {total_reviews > 0 ? (
                <div className="space-y-3">
                  {[1, 2].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">Customer {i+1}</div>
                        <div className="flex text-yellow-400 text-xs">{'★'.repeat(5)}</div>
                      </div>
                      <p className="text-sm text-gray-600">Great service! Arrived quickly and fixed the issue on the spot.</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No reviews yet.</p>
              )}
            </div>
          </div>

          {/* Section 5: Action Buttons (Sticky Bottom) */}
          <div className="p-4 bg-white border-t border-gray-100 grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                if (!selectedCategoryId && mechanic.pricing && Object.values(mechanic.pricing).length > 0) {
                  alert('Please select a service first.');
                  return;
                }
                onRequestHelp && onRequestHelp(mechanic, selectedCategoryId);
              }}
              className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 text-lg"
            >
              <FiTool size={20} />
              Request Help Now
            </button>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${mechanic.latitude},${mechanic.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl transition-colors border border-blue-200 col-span-2"
              >
                <FiMapPin size={18} />
                Get Directions
              </a>
              <a
                href={`tel:${mechanic.phone}`}
                className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold py-3 px-4 rounded-xl transition-colors border border-green-200"
              >
                <FiPhoneCall size={18} />
                Call Now
              </a>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors border border-gray-200"
              >
                <FiShare2 size={18} />
                Share
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
