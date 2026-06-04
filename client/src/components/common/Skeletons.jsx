import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Card skeleton
export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-card">
    <Skeleton circle width={48} height={48} />
    <Skeleton className="mt-4" width="60%" />
    <Skeleton width="40%" height={32} className="mt-2" />
  </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ rows = 5 }) => (
  <>
    {Array(rows).fill(0).map((_, i) => (
      <tr key={i}>
        <td className="p-4"><Skeleton /></td>
        <td className="p-4"><Skeleton /></td>
        <td className="p-4"><Skeleton /></td>
        <td className="p-4"><Skeleton width={80} /></td>
        <td className="p-4"><Skeleton circle width={32} height={32} /></td>
      </tr>
    ))}
  </>
);

// Request card skeleton
export const RequestCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 shadow-card">
    <Skeleton width="40%" height={20} />
    <Skeleton className="mt-2" />
    <Skeleton width="70%" />
    <div className="flex gap-3 mt-4">
      <Skeleton width={100} height={40} borderRadius={12} />
      <Skeleton width={100} height={40} borderRadius={12} />
    </div>
  </div>
);

// Notification skeleton
export const NotificationSkeleton = () => (
  <div className="flex gap-3 p-4 border-b border-gray-100">
    <Skeleton circle width={40} height={40} />
    <div className="flex-1">
      <Skeleton width="60%" />
      <Skeleton width="80%" className="mt-1" />
    </div>
  </div>
);
