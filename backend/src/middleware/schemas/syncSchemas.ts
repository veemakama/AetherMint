import Joi from 'joi';
import { ValidationSchema } from '../validate';

export const registerDeviceSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().uuid().required(),
    deviceId: Joi.string().max(128).required(),
    name: Joi.string().max(100).optional(),
    type: Joi.string().valid('web', 'ios', 'android', 'desktop').required(),
    userAgent: Joi.string().max(500).optional(),
    metadata: Joi.object().optional(),
  }),
};

export const heartbeatSchema: ValidationSchema = {
  body: Joi.object({
    deviceId: Joi.string().max(128).required(),
    userId: Joi.string().uuid().optional(),
    timestamp: Joi.date().iso().optional(),
  }),
};

export const deviceIdParamSchema: ValidationSchema = {
  params: Joi.object({ deviceId: Joi.string().max(128).required() }),
};

export const userIdParamSchema: ValidationSchema = {
  params: Joi.object({ userId: Joi.string().uuid().required() }),
};

export const syncEntitySchema: ValidationSchema = {
  body: Joi.object({
    entityType: Joi.string().valid('course', 'enrollment', 'quiz', 'content', 'user').required(),
    entityId: Joi.string().uuid().required(),
    deviceId: Joi.string().max(128).required(),
    userId: Joi.string().uuid().required(),
    version: Joi.number().integer().min(0).required(),
    payload: Joi.object().required(),
    updatedAt: Joi.date().iso().optional(),
    strategy: Joi.string().optional(),
    timestamp: Joi.date().iso().optional(),
  }),
};

export const enqueueSyncSchema: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().uuid().required(),
    deviceId: Joi.string().max(128).required(),
    entityType: Joi.string().valid('course', 'enrollment', 'quiz', 'content', 'user').required(),
    entityId: Joi.string().uuid().required(),
    operation: Joi.string().valid('create', 'update', 'delete').required(),
    version: Joi.number().integer().min(0).required(),
    payload: Joi.object().default({}),
  }),
};

export const queueStatusQuerySchema: ValidationSchema = {
  query: Joi.object({
    userId: Joi.string().uuid().optional(),
    deviceId: Joi.string().max(128).optional(),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
  }),
};

export const getSyncStatusQuerySchema: ValidationSchema = {
  params: Joi.object({ userId: Joi.string().uuid().required() }),
  query: Joi.object({
    entityType: Joi.string().valid('course', 'enrollment', 'quiz', 'content', 'user').optional(),
    entityId: Joi.string().uuid().optional(),
  }),
};

export const processQueueSchema: ValidationSchema = {
  query: Joi.object({
    userId: Joi.string().uuid().optional(),
  }),
};
