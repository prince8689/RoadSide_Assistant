import { useEffect } from 'react';
import { getSocket } from '../socket/socketClient';
import useNotificationStore from '../store/notificationStore';
import useRequestStore from '../store/requestStore';
import useMechanicStore from '../store/mechanicStore';
import useAdminStore from '../store/adminStore';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';

const useSocket = () => {
  const { addNotification, setUnreadCount } = useNotificationStore();
  const { updateActiveRequest, updateMechanicLocation } = useRequestStore();
  const { addNewRequest, removeFromAvailable, clearActiveJob } = useMechanicStore();
  const { updateLiveStats, fetchRequests } = useAdminStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // New notification received
    socket.on('notification:new', (data) => {
      addNotification(data);
    });

    // Unread count update
    socket.on('notification:unread_count', (data) => {
      setUnreadCount(data.count);
    });

    // Request status updated
    socket.on('request:status:updated', (data) => {
      updateActiveRequest(data);
    });

    // Live mechanic location
    socket.on('mechanic:location:receive', (data) => {
      updateMechanicLocation(data);
    });

    // Mechanic: New request arrived
    socket.on('request:new', (data) => {
      addNewRequest(data);
      toast.success(`New request nearby! - ${data.distance ? data.distance.toFixed(1) : '?'}km away`);
    });

    // Mechanic: Request cancelled by user
    socket.on('request:cancelled', (data) => {
      removeFromAvailable(data.requestId);
      toast.error('A nearby request was cancelled by the user');
    });

    // Mechanic: Job completed confirmation
    socket.on('job:completed', (data) => {
      toast.success(`Job completed! Earned ₹${data.earnings || 0}`);
      clearActiveJob();
    });

    // Admin Events
    if (user?.role === 'admin') {
      socket.on('admin:stats:update', (data) => {
        updateLiveStats(data);
      });

      socket.on('admin:request:new', (data) => {
        toast.success(`New ${data.serviceType || 'Service'} request received`);
        fetchRequests(); 
      });
    }

    return () => {
      socket.off('notification:new');
      socket.off('notification:unread_count');
      socket.off('request:status:updated');
      socket.off('mechanic:location:receive');
      socket.off('request:new');
      socket.off('request:cancelled');
      socket.off('job:completed');
      if (user?.role === 'admin') {
        socket.off('admin:stats:update');
        socket.off('admin:request:new');
      }
    };
  }, [user?.role]);
};

export default useSocket;
