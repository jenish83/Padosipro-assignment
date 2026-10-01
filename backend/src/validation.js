import { z } from 'zod';
import { badRequest } from './errors.js';

const email = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.');

// bcrypt only uses the first 72 bytes, so we cap length rather than silently truncating.
const password = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain a letter and a number.');

const otpCode = z.string({ error: 'Code is required.' }).trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

// Indian mobile: 10 digits starting 6-9, optionally prefixed with +91 / 91 / 0. Stored as the bare 10 digits.
const mobile = z
  .string({ error: 'Mobile number is required.' })
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+91|91|0)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number.')
  .transform((v) => v.slice(-10));

const schemas = {
  register: z.object({ email, password }),
  login: z.object({ email, password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.') }),
  verifyEmail: z.object({ email, code: otpCode }),
  resendOtp: z.object({ email }),
  profile: z.object({
    name: z.string({ error: 'Name is required.' }).trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name is too long.'),
    mobile,
    address: z
      .string({ error: 'Address is required.' })
      .trim()
      .min(5, 'Address must be at least 5 characters.')
      .max(250, 'Address is too long (250 characters max).'),
    // Optional: most PadosiPro customers are households, not businesses.
    businessName: z
      .string()
      .trim()
      .max(100, 'Business name is too long.')
      .nullish()
      .transform((v) => (v ? v : null)),
  }),
  selectTasks: z.object({
    taskIds: z
      .array(z.number({ error: 'Task ids must be numbers.' }).int().positive(), { error: 'taskIds must be an array.' })
      .min(1, 'Select at least one task.')
      .max(200, 'Too many tasks selected.'),
  }),
};

/** Parse or throw a 400 VALIDATION_ERROR with per-field messages: { fields: { email: "..." } }. */
function validate(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  throw badRequest('VALIDATION_ERROR', Object.values(fields)[0], { fields });
}

export { schemas, validate };
