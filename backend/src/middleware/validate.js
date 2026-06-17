const Joi = require('joi');

const validate = (schema, source) => {
  return (req, res, next) => {
    const errors = [];

    if (source) {
      const schemaForSource = Joi.isSchema(schema) ? schema : schema[source];

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

    const validationSchema = schema;

    for (const currentSource of ['body', 'query', 'params']) {
      if (validationSchema[currentSource]) {
        const { error, value } = validationSchema[currentSource].validate(req[currentSource], {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
          ...(currentSource === 'query' && { convert: true }),
        });

        if (error) {
          error.details.forEach(d => {
            errors.push({ field: d.path.join('.'), message: d.message });
          });
        } else {
          req[currentSource] = value;
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
};

module.exports = {
  validate,
};
