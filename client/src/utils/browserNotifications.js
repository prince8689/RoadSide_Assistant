// ============================================
// BROWSER NOTIFICATIONS
// ============================================

/**
 * Request permission for browser notifications
 * @returns {Promise<boolean>} true if granted, false otherwise
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show a browser notification
 * @param {string} title 
 * @param {string} body 
 * @param {Object} options 
 */
export const showNotification = (title, body, options = {}) => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.svg',
      ...options
    });

    // Focus window when notification clicked
    notification.onclick = function() {
      window.focus();
      this.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
};

/**
 * Notify user that mechanic accepted request
 * @param {string} mechanicName 
 * @param {string|number} eta 
 */
export const notifyMechanicAccepted = (mechanicName, eta) => {
  showNotification(
    "Mechanic is coming! 🚗",
    `${mechanicName} accepted your request. ETA: ${eta} minutes`
  );
};

/**
 * Notify user that mechanic has arrived
 * @param {string} mechanicName 
 */
export const notifyMechanicArrived = (mechanicName) => {
  showNotification(
    "Mechanic has arrived! 🔧",
    `${mechanicName} is at your location`
  );
};

/**
 * Notify mechanic of a new nearby request
 * @param {string} userName 
 * @param {string} serviceType 
 * @param {string|number} distance 
 */
export const notifyNewRequest = (userName, serviceType, distance) => {
  showNotification(
    "New Request Nearby! 🆘",
    `${userName} needs ${serviceType} help - ${distance} km away`
  );
};
