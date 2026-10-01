import { AppError } from '../errors.js';

function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`));
}

// Single place where every error becomes the standard JSON shape.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }), ...(err.details && { details: err.details }) },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
}

export { notFoundHandler, errorHandler };
