import { z } from 'zod';

export const SignUpStep1Schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .max(254, 'Email address exceeds maximum length.')
    .email('Please enter a valid email address.')
    .toLowerCase(),
});

export const SignUpStep2Schema = z
  .object({
    otpCode: z
      .string()
      .trim()
      .min(4, 'OTP verification code must be at least 4 characters.')
      .max(8, 'OTP verification code is too long.')
      .regex(/^\d+$/, 'OTP must contain numbers only.'),
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required.')
      .max(60, 'First name exceeds maximum length.'),
    middleName: z
      .string()
      .trim()
      .max(60, 'Middle name exceeds maximum length.')
      .optional()
      .default(''),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required.')
      .max(60, 'Last name exceeds maximum length.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .max(128, 'Password exceeds maximum length.'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignUpStep1Data = Readonly<z.infer<typeof SignUpStep1Schema>>;
export type SignUpStep2Data = Readonly<z.infer<typeof SignUpStep2Schema>>;

export interface SignUpFormData {
  readonly email: string;
  readonly otpCode: string;
  readonly firstName: string;
  readonly middleName: string;
  readonly lastName: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface FormFieldErrors {
  readonly email?: string;
  readonly otpCode?: string;
  readonly firstName?: string;
  readonly middleName?: string;
  readonly lastName?: string;
  readonly password?: string;
  readonly confirmPassword?: string;
}
