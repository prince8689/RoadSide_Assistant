// ============================================
// NOTIFICATION HELPER
// ============================================
// Pre-built notification message templates for standard system events.

const NotificationMessages = {
  REQUEST_CREATED: (serviceType) => ({
    title: 'Request Submitted',
    message: `Your ${serviceType} request has been submitted. Finding nearby mechanics...`,
    type: 'request_update'
  }),
  REQUEST_ACCEPTED: (mechanicName) => ({
    title: 'Mechanic Found!',
    message: `${mechanicName} has accepted your request and is on the way.`,
    type: 'request_update'
  }),
  MECHANIC_EN_ROUTE: (mechanicName, eta) => ({
    title: 'Mechanic En Route',
    message: `${mechanicName} is heading towards you. ETA: ${eta} minutes.`,
    type: 'request_update'
  }),
  MECHANIC_ARRIVED: () => ({
    title: 'Mechanic Arrived',
    message: 'Your mechanic has arrived at your location.',
    type: 'request_update'
  }),
  SERVICE_COMPLETED: (finalPrice) => ({
    title: 'Service Completed',
    message: `Your service has been completed. Total amount: ₹${finalPrice}. Please leave a review!`,
    type: 'request_update'
  }),
  REQUEST_CANCELLED: (reason) => ({
    title: 'Request Cancelled',
    message: `Your service request has been cancelled. Reason: ${reason}`,
    type: 'request_update'
  }),
  NEW_REQUEST_NEARBY: (serviceType, distance) => ({
    title: 'New Service Request Nearby',
    message: `A ${serviceType} request is available ${distance}km away from you.`,
    type: 'new_request'
  }),
  MECHANIC_VERIFIED: () => ({
    title: 'Account Verified!',
    message: 'Congratulations! Your mechanic account has been verified. You can now accept service requests.',
    type: 'verification_update'
  }),
  MECHANIC_REJECTED: (reason) => ({
    title: 'Verification Rejected',
    message: `Your verification was rejected. Reason: ${reason}. Please resubmit correct documents.`,
    type: 'verification_update'
  }),
  REVIEW_RECEIVED: (rating, userName) => ({
    title: 'New Review Received',
    message: `${userName} gave you a ${rating}★ rating for your recent service.`,
    type: 'review_received'
  }),
  ACCOUNT_DEACTIVATED: () => ({
    title: 'Account Deactivated',
    message: 'Your account has been deactivated. Please contact support for assistance.',
    type: 'account_update'
  })
};

module.exports = NotificationMessages;
