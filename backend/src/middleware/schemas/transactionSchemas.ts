import Joi from 'joi';
import { ValidationSchema } from '../validate';

export const createTransactionSchema = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string().valid('payment', 'account_creation', 'trustline', 'claimable_balance', 'multisig', 'other').required(),
  sourceAccount: Joi.string().required(),
  destinationAccount: Joi.string().when('type', {
    is: 'payment',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  amount: Joi.string().when('type', {
    is: 'payment',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  asset: Joi.object({
    code: Joi.string().required(),
    issuer: Joi.string().when('code', {
      is: 'XLM',
      then: Joi.optional(),
      otherwise: Joi.required()
    })
  }).when('type', {
    is: 'payment',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  transactionXdr: Joi.string().optional(),
  signedTransactionXdr: Joi.string().optional(),
  priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
  maxRetries: Joi.number().integer().min(1).max(10).default(3),
  metadata: Joi.object().default({})
});

export const getTransactionsSchema = Joi.object({
  userId: Joi.string().required(),
  status: Joi.string().valid('pending', 'processing', 'submitted', 'success', 'failed', 'timeout').optional(),
  type: Joi.string().valid('payment', 'account_creation', 'trustline', 'claimable_balance', 'multisig', 'other').optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

export const getUserEventsQuerySchema: ValidationSchema = {
  params: Joi.object({ userId: Joi.string().required() }),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const transactionIdParamSchema: ValidationSchema = {
  params: Joi.object({ transactionId: Joi.string().required() }),
};

export const userIdParamSchema: ValidationSchema = {
  params: Joi.object({ userId: Joi.string().required() }),
};

export const accountIdParamSchema: ValidationSchema = {
  params: Joi.object({ accountId: Joi.string().required() }),
};

export const retryFailedSchema: ValidationSchema = {
  body: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const estimateFeeSchema: ValidationSchema = {
  body: Joi.object({
    priority: Joi.string().valid('high', 'medium', 'low').default('medium'),
  }),
};
