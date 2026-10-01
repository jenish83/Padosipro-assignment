import { useState } from 'react';

type Validators<T> = { [K in keyof T]?: (value: T[K], all: T) => string | null };

/**
 * Tiny form helper. Errors show inline once a field has been left (blurred) or the form was submitted,
 * and errors returned by the server for a specific field are shown until the user edits that field.
 */
export function useForm<T extends Record<string, string>>(initial: T, validators: Validators<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof T, string>>>({});

  const clientError = (k: keyof T) => validators[k]?.(values[k], values) ?? null;

  const setValue = (k: keyof T, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    setServerErrors((p) => ({ ...p, [k]: undefined }));
  };
  const touch = (k: keyof T) => setTouched((p) => ({ ...p, [k]: true }));
  const error = (k: keyof T): string | null =>
    touched[k] || submitted ? clientError(k) ?? serverErrors[k] ?? null : serverErrors[k] ?? null;

  /** Marks the form as submitted (reveals all errors) and returns true when every field is valid. */
  const validateAll = () => {
    setSubmitted(true);
    return (Object.keys(values) as (keyof T)[]).every((k) => !clientError(k));
  };

  const applyServerFields = (fields?: Record<string, string>) => {
    if (!fields) return false;
    const known = Object.keys(fields).filter((k) => k in values);
    if (!known.length) return false;
    setServerErrors(Object.fromEntries(known.map((k) => [k, fields[k]])) as Partial<Record<keyof T, string>>);
    return true;
  };

  /** Props to spread onto a TextField. */
  const field = (k: keyof T) => ({
    value: values[k],
    onChangeText: (v: string) => setValue(k, v),
    onBlur: () => touch(k),
    error: error(k),
  });

  return { values, setValue, field, validateAll, applyServerFields };
}
