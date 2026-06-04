// ============================================
// NOTIFICATIONS MODULE — ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { markReadSchema } = require('./notification.validation');

// ---- All routes require authentication ----
router.use(authenticate);

// ---- Mark All As Read (Must be before /mark-read) ----
router.patch('/mark-all-read', notificationController.markAllAsRead);

// ---- Mark Specific As Read ----
router.patch(
  '/mark-read',
  validate(markReadSchema),
  notificationController.markAsRead
);

// ---- Get Unread Count (Must be before /:id) ----
router.get('/unread-count', notificationController.getUnreadCount);

// ---- Delete All Read (Must be before /:id) ----
router.delete('/read', notificationController.deleteAllRead);

// ---- Get My Notifications ----
router.get('/', notificationController.getMyNotifications);

// ---- Delete Single Notification ----
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
