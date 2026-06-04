// ============================================
// SOCKET EVENTS
// ============================================
// Standardized constant names for all Socket.io events.

const EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Location
  MECHANIC_LOCATION_UPDATE: 'mechanic:location:update',
  MECHANIC_LOCATION_RECEIVE: 'mechanic:location:receive',

  // Requests
  NEW_REQUEST: 'request:new',
  REQUEST_ACCEPTED: 'request:accepted',
  REQUEST_CANCELLED: 'request:cancelled',

  // Status
  STATUS_UPDATED: 'request:status:updated',
  MECHANIC_EN_ROUTE: 'mechanic:en_route',
  MECHANIC_ARRIVED: 'mechanic:arrived',
  SERVICE_COMPLETED: 'service:completed',

  // Notifications
  NEW_NOTIFICATION: 'notification:new',
  UNREAD_COUNT_UPDATE: 'notification:unread_count',

  // Admin
  DASHBOARD_STATS_UPDATE: 'admin:stats:update',
  NEW_REQUEST_ADMIN: 'admin:request:new',
};

module.exports = EVENTS;
