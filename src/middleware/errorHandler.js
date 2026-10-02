'use strict';

const config = require('../config');
const { HttpError } = require('../utils/httpError');

// Postgres error codes we translate into client errors.
const PG_ERRORS = {
  '23505': [409, 'Resource already exists'],   // unique_violation
  '23503': [409, 'Referenced resource does not exist or is in use'], // foreign_key_violation
  '23514': [400, 'Value violates a constraint'], // check_violation
  '22P02': [400, 'Invalid input syntax'],       // invalid_text_representation
};

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err.code && PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    return res.status(status).json({ error: message, ...(err.constraint && { constraint: err.constraint }) });
  }

  console.error('[http] unhandled error', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(!config.isProduction && { message: err.message }),
  });
}

module.exports = { notFoundHandler, errorHandler };
