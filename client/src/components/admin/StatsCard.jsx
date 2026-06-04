import { useEffect, useState } from 'react';

const StatsCard = ({ title, value, icon: Icon, color = 'blue', trend }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = typeof value === 'number' ? value : parseInt(String(value).replace(/,/g, '')) || 0;
    if (end === 0) return;
    
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);

  const colorClasses = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-dark">
          {typeof value === 'string' && value.includes('₹') ? '₹' : ''}
          {count.toLocaleString()}
        </h3>
        {trend && (
          <p className={`text-xs mt-2 flex items-center gap-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
          </p>
        )}
      </div>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${colorClasses[color] || colorClasses.blue}`}>
        <Icon />
      </div>
    </div>
  );
};

export default StatsCard;
