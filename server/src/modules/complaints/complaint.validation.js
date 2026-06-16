const Joi = require('joi');

const submitComplaintSchema = Joi.object({
  mechanic_id: Joi.string().uuid().required(),
  request_id: Joi.string().uuid().optional().allow(null, ''),
  category: Joi.string().valid(
    'fraud', 'overcharging', 'harassment', 'misbehavior', 'fake_service', 
    'threatening_behavior', 'vehicle_damage', 'payment_issue', 'safety_concern', 'other'
  ).required(),
  description: Joi.string().min(10).max(1000).required(),
  evidence_urls: Joi.array().items(Joi.string().uri()).max(5).optional()
});

const updateComplaintStatusSchema = Joi.object({
  status: Joi.string().valid(
    'pending', 'under_investigation', 'resolved', 'rejected', 'escalated'
  ).required(),
  admin_notes: Joi.string().allow('', null).optional()
});

const enforceMechanicSchema = Joi.object({
  action_type: Joi.string().valid('warning', 'suspension', 'ban', 'reactivation', 'unblock').required(),
  reason: Joi.string().min(5).max(1000).required(),
  suspension_days: Joi.number().integer().min(1).max(365).optional().when('action_type', {
    is: 'suspension',
    then: Joi.required()
  })
});

module.exports = {
  submitComplaintSchema,
  updateComplaintStatusSchema,
  enforceMechanicSchema
};
