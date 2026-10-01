// One error type for the whole API. Every failure ends up as:
// { "error": { "code": "SOME_CODE", "message": "Human readable", "fields"?: {...}, "details"?: {...} } }
class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = extra.fields;
    this.details = extra.details;
  }
}

const badRequest = (code, message, extra) => new AppError(400, code, message, extra);
const unauthorized = (code, message, extra) => new AppError(401, code, message, extra);
const forbidden = (code, message, extra) => new AppError(403, code, message, extra);
const notFound = (code, message, extra) => new AppError(404, code, message, extra);
const conflict = (code, message, extra) => new AppError(409, code, message, extra);
const tooMany = (code, message, extra) => new AppError(429, code, message, extra);

export { AppError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany };
