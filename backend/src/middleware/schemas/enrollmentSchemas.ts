import Joi from 'joi';
import { ValidationSchema } from '../validate';

const paymentDetailsSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
});

export const createEnrollmentSchema: ValidationSchema = {
  body: Joi.object({
    courseId: Joi.string().uuid().required(),
    paymentMethod: Joi.string().valid('stellar', 'credit_card', 'bank_transfer', 'crypto', 'installment').required(),
    paymentDetails: paymentDetailsSchema.required(),
    voucherCode: Joi.string().alphanum().min(8).max(32).optional(),
    transactionId: Joi.string().optional(),
  }),
};

export const getUserEnrollmentsQuerySchema: ValidationSchema = {
  query: Joi.object({
    status: Joi.alternatives().try(
      Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled', 'suspended', 'refunded', 'expired'),
      Joi.array().items(Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled', 'suspended', 'refunded', 'expired'))
    ).optional(),
    paymentStatus: Joi.alternatives().try(
      Joi.string().valid('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'),
      Joi.array().items(Joi.string().valid('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'))
    ).optional(),
    paymentMethod: Joi.alternatives().try(
      Joi.string().valid('stellar', 'credit_card', 'bank_transfer', 'crypto', 'installment'),
      Joi.array().items(Joi.string().valid('stellar', 'credit_card', 'bank_transfer', 'crypto', 'installment'))
    ).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('enrolledAt', 'updatedAt', 'status', 'progress', 'paymentStatus').default('enrolledAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

export const updateEnrollmentSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled', 'suspended', 'refunded', 'expired').optional(),
    progress: Joi.number().min(0).max(100).optional(),
  }),
};

export const enrollmentIdParamSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

export const courseIdParamSchema: ValidationSchema = {
  params: Joi.object({ courseId: Joi.string().uuid().required() }),
};

export const updateProgressSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    progress: Joi.number().min(0).max(100).required(),
    lastAccessedLesson: Joi.string().uuid().optional(),
    timeSpent: Joi.number().integer().min(0).optional(),
  }),
};

export const bulkEnrollmentSchema: ValidationSchema = {
  body: Joi.object({
    operation: Joi.string().valid('activate', 'cancel', 'complete').required(),
    enrollments: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        reason: Joi.string().optional(),
      })
    ).min(1).max(500).required(),
  }),
};

export const validatePrerequisitesSchema: ValidationSchema = {
  body: Joi.object({
    courseId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().optional(),
  }),
};

export const userIdParamSchema: ValidationSchema = {
  params: Joi.object({ userId: Joi.string().uuid().required() }),
};

export const completeEnrollmentSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    issueCertificate: Joi.boolean().default(true),
  }),
};

export const courseEnrollmentsQuerySchema: ValidationSchema = {
  params: Joi.object({ courseId: Joi.string().uuid().required() }),
  query: Joi.object({
    status: Joi.alternatives().try(
      Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled', 'suspended', 'refunded', 'expired'),
      Joi.array().items(Joi.string().valid('pending', 'confirmed', 'active', 'completed', 'cancelled', 'suspended', 'refunded', 'expired'))
    ).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

export const exportEnrollmentsQuerySchema: ValidationSchema = {
  params: Joi.object({ courseId: Joi.string().uuid().required() }),
  query: Joi.object({
    format: Joi.string().valid('csv', 'json', 'xlsx').default('csv'),
  }),
};

export const renewEnrollmentSchema: ValidationSchema = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    paymentDetails: paymentDetailsSchema.required(),
  }),
};
