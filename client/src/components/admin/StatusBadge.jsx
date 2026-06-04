const StatusBadge = ({ status }) => {
  const normalized = status ? status.toLowerCase() : 'unknown';

  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    accepted: { color: 'bg-blue-100 text-blue-700', label: 'Accepted' },
    en_route: { color: 'bg-purple-100 text-purple-700', label: 'En Route' },
    arrived: { color: 'bg-indigo-100 text-indigo-700', label: 'Arrived' },
    in_progress: { color: 'bg-orange-100 text-orange-700', label: 'In Progress' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
    true: { color: 'bg-green-100 text-green-700', label: 'Active' },
    false: { color: 'bg-gray-100 text-gray-500', label: 'Inactive' }
  };

  const style = config[normalized] || { color: 'bg-gray-100 text-gray-700', label: status };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${style.color}`}>
      {style.label}
    </span>
  );
};

export default StatusBadge;
