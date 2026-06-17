import Joi from 'joi';
import { ValidationSchema } from '../validate';

export const cidParamSchema: ValidationSchema = {
  params: Joi.object({
    cid: Joi.string().pattern(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/).required().messages({
      'string.pattern.base': 'cid must be a valid IPFS CID (v0 or v1)',
    }),
  }),
};

export const getContentQuerySchema: ValidationSchema = {
  params: Joi.object({
    cid: Joi.string().pattern(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/).required(),
  }),
  query: Joi.object({
    format: Joi.string().valid('base64', 'stream', 'buffer').default('buffer'),
    bypassCache: Joi.string().valid('true', 'false').optional(),
  }),
};

export const getMetadataQuerySchema: ValidationSchema = {
  params: Joi.object({
    cid: Joi.string().pattern(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/).required(),
  }),
  query: Joi.object({
    metadataCid: Joi.string().pattern(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z0-9]{56}$/).required(),
  }),
};

const metadataFieldSchema = Joi.alternatives().try(
  Joi.string().custom((value, helpers) => {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  }, 'validate JSON string').messages({
    'any.invalid': 'metadata must be valid JSON string or object',
  }),
  Joi.object().custom(value => JSON.stringify(value), 'normalize object metadata')
);

export const uploadContentSchema: ValidationSchema = {
  body: Joi.object({
    metadata: metadataFieldSchema.optional(),
    includeMetadata: Joi.string().valid('true', 'false').optional(),
    wrapWithDirectory: Joi.string().valid('true', 'false').optional(),
  }),
};

export const uploadBatchContentSchema: ValidationSchema = {
  body: Joi.object({
    metadata: metadataFieldSchema.optional(),
    includeMetadata: Joi.string().valid('true', 'false').optional(),
    wrapWithDirectory: Joi.string().valid('true', 'false').optional(),
  }),
};
