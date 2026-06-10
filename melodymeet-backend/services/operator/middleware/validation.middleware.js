// middleware/validation.middleware.js - Validate request body against Joi schema

const { validate, schemas } = require('../utils/validators');

/**
 * Create validation middleware for a specific schema
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {String} source - Where to validate: 'body' (default), 'query', 'params'
 */
function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = source === 'body' ? req.body
        : source === 'query' ? req.query
        : req.params;

      const validatedData = validate(schema, dataToValidate);
      
      // Replace the data with validated data
      if (source === 'body') {
        req.body = validatedData;
      } else if (source === 'query') {
        req.query = validatedData;
      }

      next();
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
}

module.exports = { validateRequest };
