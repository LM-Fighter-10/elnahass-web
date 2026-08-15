/** Shared Join Us / contact form validation — strings must match Django exactly. */

export const VALIDATION_MESSAGES = {
  required: "This field is required",
  nameNumbers: "Name must not contains numbers",
  email: "Please enter a valid email address",
  phoneNumeric: "Phone number must be numeric only",
  phoneLength: "Please enter a valid phone number with 11 digits",
  descLength: "Please don't exceed 200 characters",
} as const;

export const MAIL_MESSAGES = {
  success: "Mail Sent Successfully, Please Check your Inbox",
  duplicate: "Mail Failed To Be Sent, Your Email Has Already Been Registered",
  failed: "Mail Failed To Be Sent, Please Validate Your Email!",
  mailSent: "Mail Sent",
  mailFailed: "Mail Failed To Be Sent",
} as const;

const EMAIL_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const PHONE_PATTERN = /^\d{11}$/;

export type FormField = "name" | "email" | "phone" | "desc";

export type FieldErrors = Partial<Record<FormField, string>>;

/** Format validation for name; empty → no format error (blank checked separately). */
export function validateName(name: string): string | null {
  if (name.trim() === "") return null;
  if (/\d/.test(name)) return VALIDATION_MESSAGES.nameNumbers;
  return null;
}

export function validateEmail(email: string): string | null {
  if (email.trim() === "") return null;
  if (!EMAIL_PATTERN.test(email)) return VALIDATION_MESSAGES.email;
  return null;
}

export function validatePhone(phone: string): string | null {
  if (phone.trim() === "") return null;
  if (isNaN(Number(phone)) || /[^\d]/.test(phone)) {
    return VALIDATION_MESSAGES.phoneNumeric;
  }
  if (!PHONE_PATTERN.test(phone)) return VALIDATION_MESSAGES.phoneLength;
  return null;
}

export function validateDescription(desc: string): string | null {
  if (desc.length > 200) return VALIDATION_MESSAGES.descLength;
  return null;
}

export function validateFormat(values: {
  name: string;
  email: string;
  phone: string;
  desc: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const nameErr = validateName(values.name);
  const emailErr = validateEmail(values.email);
  const phoneErr = validatePhone(values.phone);
  const descErr = validateDescription(values.desc);
  if (nameErr) errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (phoneErr) errors.phone = phoneErr;
  if (descErr) errors.desc = descErr;
  return errors;
}

/** Blank required check — sets "This field is required" per empty field. */
export function validateRequired(values: {
  name: string;
  email: string;
  phone: string;
  desc: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  (["name", "email", "phone", "desc"] as const).forEach((field) => {
    if (values[field] === "") {
      errors[field] = VALIDATION_MESSAGES.required;
    }
  });
  return errors;
}

export function isFormValid(values: {
  name: string;
  email: string;
  phone: string;
  desc: string;
}): { ok: boolean; errors: FieldErrors } {
  const format = validateFormat(values);
  const required = validateRequired(values);
  const errors: FieldErrors = { ...format };
  // Required wins for empty fields (matches Django isBlank + format order on submit)
  (["name", "email", "phone", "desc"] as const).forEach((field) => {
    if (required[field]) errors[field] = required[field];
    else if (!format[field]) delete errors[field];
  });
  const ok =
    Object.keys(format).length === 0 && Object.keys(required).length === 0;
  return { ok, errors };
}
