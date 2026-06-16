// ============================================
// MECHANIC MODULE — VALIDATION SCHEMAS (Joi)
// ============================================
// Defines strict validation rules for mechanic
// profile, location, and availability endpoints.
//
// Schemas:
//   createProfileSchema   — POST /api/mechanics/profile
//   updateProfileSchema   — PATCH /api/mechanics/profile
//   updateLocationSchema  — PATCH /api/mechanics/location
//   updateAvailabilitySchema — PATCH /api/mechanics/availability

const Joi = require('joi');

// ---- Allowed specialization values (must match DB check constraint) ----
const SPECIALIZATIONS = [
  'breakdown_repair',
  'towing',
  'battery_jumpstart',
  'flat_tire',
  'fuel_delivery',
];

// ============================================
// CREATE MECHANIC PROFILE SCHEMA
// POST /api/mechanics/profile
// ============================================
const createProfileSchema = Joi.object({
  business_name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Business name is required',
      'string.min': 'Business name must be at least 3 characters',
      'string.max': 'Business name cannot exceed 100 characters',
      'any.required': 'Business name is required',
    }),

  experience_years: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .required()
    .messages({
      'number.base': 'Experience years must be a number',
      'number.integer': 'Experience years must be a whole number',
      'number.min': 'Experience years cannot be negative',
      'number.max': 'Experience years cannot exceed 50',
      'any.required': 'Experience years is required',
    }),

  specializations: Joi.array()
    .items(Joi.string())
    .min(1)
    .unique()
    .required()
    .messages({
      'array.base': 'Specializations must be an array',
      'array.min': 'At least one specialization is required',
      'array.unique': 'Specializations must not contain duplicates',
      'any.required': 'Specializations are required',
    }),

  documents: Joi.object().unknown(true)
    .required()
    .messages({
      'object.base': 'Documents must be an object',
      'any.required': 'Documents are required',
    }),
}).unknown(true);

// ============================================
// UPDATE MECHANIC PROFILE SCHEMA
// PATCH /api/mechanics/profile
// ============================================
// Same fields as create, but all optional.
// At least one field must be provided.
const updateProfileSchema = Joi.object({
  business_name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .messages({
      'string.min': 'Business name must be at least 3 characters',
      'string.max': 'Business name cannot exceed 100 characters',
    }),

  experience_years: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .messages({
      'number.base': 'Experience years must be a number',
      'number.integer': 'Experience years must be a whole number',
      'number.min': 'Experience years cannot be negative',
      'number.max': 'Experience years cannot exceed 50',
    }),

  specializations: Joi.array()
    .items(Joi.string())
    .min(1)
    .unique()
    .messages({
      'array.base': 'Specializations must be an array',
      'array.min': 'At least one specialization is required',
      'array.unique': 'Specializations must not contain duplicates',
    }),

  documents: Joi.object().unknown(true).messages({
    'object.base': 'Documents must be an object',
  }),
}).min(1).unknown(true).messages({
  'object.min': 'At least one field is required to update',
});

// ============================================
// UPDATE LOCATION SCHEMA
// PATCH /api/mechanics/location
// ============================================
const updateLocationSchema = Joi.object({
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.base': 'Latitude must be a valid number',
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required',
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.base': 'Longitude must be a valid number',
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required',
    }),
});

// ============================================
// UPDATE AVAILABILITY SCHEMA
// PATCH /api/mechanics/availability
// ============================================
const updateAvailabilitySchema = Joi.object({
  is_available: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'is_available must be a boolean (true or false)',
      'any.required': 'is_available field is required',
    }),
});

// ============================================
// UPDATE SERVICES SCHEMA
// PUT /api/mechanics/services
// ============================================
const updateServicesSchema = Joi.object({
  services: Joi.array()
    .items(
      Joi.object({
        category_id: Joi.string().guid().required().messages({
          'string.guid': 'category_id must be a valid UUID',
          'any.required': 'category_id is required',
        }),
        min_price: Joi.number().min(0).required().messages({
          'number.min': 'min_price cannot be negative',
          'any.required': 'min_price is required',
        }),
        max_price: Joi.number().min(Joi.ref('min_price')).required().messages({
          'number.min': 'max_price must be greater than or equal to min_price',
          'any.required': 'max_price is required',
        }),
        is_enabled: Joi.boolean().required().messages({
          'any.required': 'is_enabled is required',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one service must be provided',
      'any.required': 'services array is required',
    }),
});

module.exports = {
  createProfileSchema,
  updateProfileSchema,
  updateLocationSchema,
  updateAvailabilitySchema,
  updateServicesSchema,
  SPECIALIZATIONS,
};
