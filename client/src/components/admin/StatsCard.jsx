import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { slideUp, cardHover } from '../../utils/animations';

const StatsCard = ({ icon: Icon, title, value, color, trend }) => {
  const numValue = typeof value === 'number' ? value : parseInt(String(value).replace(/,/g, '').replace(/₹/g, '')) || 0;
  const isCurrency = typeof value === 'string' && value.includes('₹');

  const colorClasses = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardHover}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer flex justify-between items-center"
    >
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-dark mt-1 flex items-center">
          {isCurrency && <span className="mr-1">₹</span>}
          <CountUp end={numValue} duration={1.5} separator="," />
        </p>
        {trend !== undefined && (
          <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
          </p>
        )}
      </div>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${colorClasses[color] || colorClasses.blue}`}>
        <Icon />
      </div>
    </motion.div>
  );
};

export default StatsCard;
