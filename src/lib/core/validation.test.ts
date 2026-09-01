import { describe, it, expect } from 'vitest';
import { validateLoginForm, validateSignUpForm } from './validation';

describe('Validation Engine', () => {
  describe('validateLoginForm', () => {
    it('validates correct email and password', () => {
      const result = validateLoginForm({ email: 'test@example.com', password: 'Password123!' });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('rejects invalid email formats', () => {
      const result = validateLoginForm({ email: 'invalid-email', password: 'Password123!' });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address.');
    });

    it('rejects empty fields', () => {
      const result = validateLoginForm({ email: '', password: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Email address is required.');
      expect(result.errors.password).toBe('Password is required.');
    });
  });

  describe('validateSignUpForm', () => {
    it('rejects weak passwords', () => {
      const result = validateSignUpForm({
        email: 'test@example.com',
        otpCode: '123456',
        firstName: 'John',
        lastName: 'Doe',
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password must be at least 8 characters long.');
    });

    it('enforces password complexity', () => {
      const result = validateSignUpForm({
        email: 'test@example.com',
        otpCode: '123456',
        firstName: 'John',
        lastName: 'Doe',
        password: 'lowercase123',
        confirmPassword: 'lowercase123',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    });

    it('rejects mismatched passwords', () => {
      const result = validateSignUpForm({
        email: 'test@example.com',
        otpCode: '123456',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        confirmPassword: 'Password123!45',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('Passwords do not match.');
    });
  });
});
