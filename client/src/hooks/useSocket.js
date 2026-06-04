import { useEffect } from 'react';
import { getSocket } from '../socket/socketClient';
import useNotificationStore from '../store/notificationStore';
import useRequestStore from '../store/requestStore';

const useSocket = () => {
  const { addNotification, setUnreadCount } = useNotificationStore();
  const { updateActiveRequest, updateMechanicLocation } = useRequestStore();

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

    return () => {
      socket.off('notification:new');
      socket.off('notification:unread_count');
      socket.off('request:status:updated');
      socket.off('mechanic:location:receive');
    };
  }, []);
};

export default useSocket;
