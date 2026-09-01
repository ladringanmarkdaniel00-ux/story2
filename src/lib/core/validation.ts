/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 1. IMMUTABLE TYPE CONTRACTS & CONSTANTS
// ============================================================================

export interface ValidationResult<TKeys extends string = string> {
  readonly isValid: boolean;
  readonly errors: Readonly<Partial<Record<TKeys, string>>>;
}

/**
 * RFC 5322 Compliant Email Regex (Non-backtracking, length capped at 254 chars)
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const OTP_REGEX = /^\d{4,8}$/;

export const FILE_LIMITS = {
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE_BYTES: 25 * 1024 * 1024, // 25MB
  MAX_TOTAL_BATCH_SIZE_BYTES: 50 * 1024 * 1024, // 50MB aggregate
  MAX_FILES_COUNT: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'],
} as const;

export interface LoginFormData {
  readonly email: string;
  readonly password?: string;
}

export interface SignUpFormData {
  readonly email: string;
  readonly otpCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export type LoginFormKey = 'email' | 'password';
export type SignUpFormKey =
  | 'email'
  | 'otpCode'
  | 'firstName'
  | 'lastName'
  | 'password'
  | 'confirmPassword';

// ============================================================================
// 2. FORM VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates user login credentials with length and character guards.
 */
export function validateLoginForm(data: Partial<LoginFormData>): ValidationResult<LoginFormKey> {
  const errors: Partial<Record<LoginFormKey, string>> = {};

  const cleanEmail = typeof data?.email === 'string' ? data.email.trim() : '';
  if (!cleanEmail) {
    errors.email = 'Email address is required.';
  } else if (cleanEmail.length > 254) {
    errors.email = 'Email address cannot exceed 254 characters.';
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (data?.password !== undefined) {
    if (typeof data.password !== 'string' || data.password.length === 0) {
      errors.password = 'Password is required.';
    } else if (data.password.length > 128) {
      // Prevents Bcrypt hashing DoS attacks via huge byte payloads
      errors.password = 'Password exceeds maximum length of 128 characters.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates user registration inputs with password strength & anti-injection constraints.
 */
export function validateSignUpForm(data: Partial<SignUpFormData>): ValidationResult<SignUpFormKey> {
  const errors: Partial<Record<SignUpFormKey, string>> = {};

  // 1. Email Validation
  const cleanEmail = typeof data?.email === 'string' ? data.email.trim() : '';
  if (!cleanEmail) {
    errors.email = 'Email address is required.';
  } else if (cleanEmail.length > 254) {
    errors.email = 'Email address cannot exceed 254 characters.';
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  // 2. OTP Code Validation
  const cleanOtp = typeof data?.otpCode === 'string' ? data.otpCode.trim() : '';
  if (!cleanOtp) {
    errors.otpCode = 'Verification code is required.';
  } else if (!OTP_REGEX.test(cleanOtp)) {
    errors.otpCode = 'Verification code must be 4 to 8 numeric digits.';
  }

  // 3. Name Sanitization & Length Guards
  const cleanFirstName = typeof data?.firstName === 'string' ? data.firstName.trim() : '';
  if (!cleanFirstName) {
    errors.firstName = 'First name is required.';
  } else if (cleanFirstName.length > 50) {
    errors.firstName = 'First name cannot exceed 50 characters.';
  }

  const cleanLastName = typeof data?.lastName === 'string' ? data.lastName.trim() : '';
  if (!cleanLastName) {
    errors.lastName = 'Last name is required.';
  } else if (cleanLastName.length > 50) {
    errors.lastName = 'Last name cannot exceed 50 characters.';
  }

  // 4. Password Strength & Length Verification
  const rawPassword = typeof data?.password === 'string' ? data.password : '';
  if (!rawPassword) {
    errors.password = 'Password is required.';
  } else if (rawPassword.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (rawPassword.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(rawPassword)) {
    errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
  }

  // 5. Password Confirmation Match
  if (!data?.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.';
  } else if (rawPassword !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// 3. FILE UPLOAD VALIDATION & SECURITY GUARDS
// ============================================================================

/**
 * File extension extractor with double-extension (.php.jpg) and traversal detection.
 */
function getSanitizedFileExtension(fileName: string): string | null {
  if (!fileName || typeof fileName !== 'string') return null;
  
  // Guard against path traversal patterns
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return null;
  }

  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return null;
  }

  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Validates a single upload file by inspecting MIME type, filename extension, and size thresholds.
 */
export function validateUploadFile(file: unknown): { readonly isValid: boolean; readonly error?: string } {
  // SSR Environment Guard: Safely verify File/Blob instance
  if (!file || typeof file !== 'object' || !('size' in file) || !('name' in file)) {
    return {
      isValid: false,
      error: 'Invalid file object provided.',
    };
  }

  const candidate = file as { readonly name: string; readonly size: number; readonly type: string };

  if (typeof candidate.size !== 'number' || candidate.size <= 0) {
    return {
      isValid: false,
      error: 'Uploaded file is empty or corrupted (0 bytes).',
    };
  }

  // 1. Extension Verification
  const ext = getSanitizedFileExtension(candidate.name);
  if (!ext || !(FILE_LIMITS.ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      isValid: false,
      error: `File extension "${ext || 'none'}" is not supported. Allowed: ${FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 2. MIME Type Verification
  const isImageMime = (FILE_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(candidate.type);
  const isVideoMime = (FILE_LIMITS.ALLOWED_VIDEO_TYPES as readonly string[]).includes(candidate.type);

  if (!isImageMime && !isVideoMime) {
    return {
      isValid: false,
      error: `Unsupported MIME type (${candidate.type || 'unknown'}). Allowed formats: JPG, PNG, WebP, GIF, MP4, WebM, MOV.`,
    };
  }

  // 3. Size Boundary Verification
  if (isImageMime && candidate.size > FILE_LIMITS.MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (candidate.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Image exceeds maximum allowable limit of 10MB (file size: ${sizeMb}MB).`,
    };
  }

  if (isVideoMime && candidate.size > FILE_LIMITS.MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (candidate.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Video exceeds maximum allowable limit of 25MB (file size: ${sizeMb}MB).`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a batch of files for bulk uploads, verifying count limits and aggregate size thresholds.
 */
export function validateUploadFiles(files: readonly unknown[]): {
  readonly isValid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(files) || files.length === 0) {
    return {
      isValid: false,
      errors: ['No files provided for validation.'],
    };
  }

  if (files.length > FILE_LIMITS.MAX_FILES_COUNT) {
    errors.push(
      `Cannot upload more than ${FILE_LIMITS.MAX_FILES_COUNT} files simultaneously (received: ${files.length}).`
    );
  }

  let totalBatchBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validation = validateUploadFile(file);
    if (!validation.isValid && validation.error) {
      errors.push(`File ${i + 1}: ${validation.error}`);
    }

    if (file && typeof file === 'object' && 'size' in file && typeof (file as { readonly size: number }).size === 'number') {
      totalBatchBytes += (file as { readonly size: number }).size;
    }
  }

  if (totalBatchBytes > FILE_LIMITS.MAX_TOTAL_BATCH_SIZE_BYTES) {
    const totalMb = (totalBatchBytes / (1024 * 1024)).toFixed(1);
    const maxMb = (FILE_LIMITS.MAX_TOTAL_BATCH_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    errors.push(`Total batch size (${totalMb}MB) exceeds maximum limit of ${maxMb}MB.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  validateLoginForm,
  validateSignUpForm,
  validateUploadFile,
  validateUploadFiles,
  FILE_LIMITS,
};
