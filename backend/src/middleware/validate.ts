import Joi from 'joi';
import { Request, Response, NextFunction, RequestHandler } from 'express';

type ValidationSource = 'body' | 'query' | 'params';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export function validate(schema: Joi.Schema, source: ValidationSource): RequestHandler;
export function validate(schema: ValidationSchema): RequestHandler;
export function validate(
  schema: ValidationSchema | Joi.Schema,
  source?: ValidationSource
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: { field: string; message: string }[] = [];

    if (source) {
      const schemaForSource = Joi.isSchema(schema)
        ? schema
        : (schema as ValidationSchema)[source];

      if (!schemaForSource) {
        return next();
      }

      const { error, value } = schemaForSource.validate(req[source], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
        });
      }

      req[source] = value;
      return next();
    }

    const validationSchema = schema as ValidationSchema;

    for (const source of ['body', 'query', 'params'] as const) {
      if (validationSchema[source]) {
        const { error, value } = validationSchema[source]!.validate(req[source], {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
          ...(source === 'query' && { convert: true }),
        });
        if (error) {
          error.details.forEach(d =>
            errors.push({ field: d.path.join('.'), message: d.message })
          );
        } else {
          req[source] = value;
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
}
