import { useState } from 'react';
import { FiBell } from 'react-icons/fi';
import useNotificationStore from '../../store/notificationStore';

const NotificationBell = () => {
  const { unreadCount, notifications, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        className="p-2 bg-secondary rounded-full hover:bg-opacity-80 transition relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiBell className="text-white text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-secondary">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-slide-up">
          <div className="p-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
            <h3 className="font-semibold text-dark">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-sm text-primary font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">No new notifications</div>
            ) : (
              notifications.map((notif, idx) => (
                <div key={notif.id || idx} className={`p-4 border-b border-gray-50 flex gap-3 ${!notif.is_read ? 'bg-orange-50' : 'bg-white'}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <FiBell size={14} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-dark">{notif.title}</h4>
                    <p className="text-xs text-muted mt-1">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
