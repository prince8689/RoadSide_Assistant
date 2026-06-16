import { useEffect, useCallback } from 'react';
import { getSocket } from '../socket/socketClient';
import useNotificationStore from '../store/notificationStore';
import { useSelector, useDispatch } from 'react-redux';
import { updateActiveRequest, updateNearbyMechanicLocation, fetchMyRequestsThunk, fetchActiveRequestThunk } from '../store/requestStore';
import useMechanicStore from '../store/mechanicStore';
import useAdminStore from '../store/adminStore';

import { toast } from 'react-hot-toast';

const useSocket = () => {
  const { addNotification, setUnreadCount } = useNotificationStore();
  const dispatch = useDispatch();
  const { addNewRequest, removeFromAvailable, clearActiveJob } = useMechanicStore();
  const { updateLiveStats, fetchRequests } = useAdminStore();
  const { user } = useSelector((state) => state.auth);

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
      dispatch(updateActiveRequest(data));
      // Refresh requests list in case user is on My Requests page
      if (user?.role === 'user') {
        dispatch(fetchMyRequestsThunk());
        dispatch(fetchActiveRequestThunk());
      }
    });

    // Mechanic rejected user request
    socket.on('request:rejected', (data) => {
      // toast.error(data.message || 'Mechanic declined your request.'); // handled in TrackingPage, but we want it globally if we're not on TrackingPage. Actually, let's keep the toast here to ensure it always shows.
      if (window.location.pathname !== '/dashboard/tracking') {
        toast.error(data.message || 'Mechanic declined your request.');
      }
      dispatch(fetchMyRequestsThunk());
      dispatch(fetchActiveRequestThunk());
    });

    socket.on('mechanic:location-update', (data) => {
      dispatch(updateNearbyMechanicLocation(data));
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
      socket.off('request:rejected');
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

  // Real-time tracking methods
  const emitLocationUpdate = useCallback((mechanicId, lat, lng, accuracy) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('mechanic:location-update', { mechanicId, lat, lng, accuracy });
    }
  }, []);

  const watchMechanic = useCallback((mechanicId, requestId, callback) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('user:watch-mechanic', { mechanicId, requestId });
      socket.on('tracking:started', callback);
      socket.on('mechanic:moving', callback);
    }
  }, []);

  const stopWatchingMechanic = useCallback((requestId) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('mechanic:stop-tracking', { requestId });
      socket.off('tracking:started');
      socket.off('mechanic:moving');
    }
  }, []);

  return {
    emitLocationUpdate,
    watchMechanic,
    stopWatchingMechanic,
  };
};

export default useSocket;
