import { useState, useEffect, useRef, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUpStep1Schema, SignUpStep2Schema, type SignUpFormData, type FormFieldErrors } from '../schemas/signUpSchemas';
import { maskEmail, logSignUpTelemetry, generateTraceId } from '../utils/authTelemetry';
import { supabase } from '../../../lib/supabase/client';
import { useNetworkState } from './useNetworkState';

const initialFormState: SignUpFormData = Object.freeze({
  email: '',
  otpCode: '',
  firstName: '',
  middleName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
});

const OTP_RESEND_COOLDOWN_SEC = 60;

export function useSignUpState() {
  const navigate = useNavigate();
  const isOnline = useNetworkState();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<SignUpFormData>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  // Lifecycles & DOM Refs
  const isMountedRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cooldownTargetRef = useRef<number | null>(null);

  // Input Refs for Dynamic Focus Management
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const lastNameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const intervalId = setInterval(() => {
      if (!cooldownTargetRef.current) {
        if (isMountedRef.current) setCooldown(0);
        return;
      }
      const remaining = Math.max(
        0,
        Math.ceil((cooldownTargetRef.current - Date.now()) / 1000)
      );
      if (isMountedRef.current) {
        setCooldown(remaining);
      }
      if (remaining <= 0) {
        cooldownTargetRef.current = null;
        clearInterval(intervalId);
      }
    }, 500);
    return () => clearInterval(intervalId);
  }, [cooldown]);

  const startCooldown = useCallback((seconds: number): void => {
    cooldownTargetRef.current = Date.now() + seconds * 1000;
    setCooldown(seconds);
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) =>
      prev[name as keyof FormFieldErrors] ? { ...prev, [name]: undefined } : prev
    );
    setGeneralError(null);
  }, []);

  const handleStepBack = useCallback((): void => {
    if (isSubmittingRef.current || loading) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGeneralError(null);
    setFieldErrors({});
    setStep(1);
    setTimeout(() => emailInputRef.current?.focus(), 50);
  }, [loading]);

  const handleRequestOtp = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;
    if (!isOnline) {
      setGeneralError('You are currently offline. Check your internet connection.');
      return;
    }

    const validationResult = SignUpStep1Schema.safeParse({ email: formData.email });
    if (!validationResult.success) {
      const flattened = validationResult.error.flatten().fieldErrors;
      const formattedErrors: FormFieldErrors = { email: flattened.email?.[0] };
      setFieldErrors(formattedErrors);
      emailInputRef.current?.focus();
      return;
    }

    const { email } = validationResult.data;
    const requestId = generateTraceId();
    setLoading(true);
    isSubmittingRef.current = true;
    setGeneralError(null);
    setFieldErrors({});

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    logSignUpTelemetry({
      action: 'OTP_REQUEST_INITIATED',
      maskedEmail: maskEmail(email),
      requestId,
      level: 'info',
      message: 'Email verification OTP requested',
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('Request aborted or timed out', 'AbortError'));
        };
        const timer = setTimeout(() => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve();
        }, 600);
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      if (!isMountedRef.current || controller.signal.aborted) return;
      logSignUpTelemetry({
        action: 'OTP_REQUEST_SUCCESS',
        maskedEmail: maskEmail(email),
        requestId,
        level: 'info',
        message: 'Email verification OTP delivered',
      });
      setStep(2);
      startCooldown(OTP_RESEND_COOLDOWN_SEC);
      setTimeout(() => otpInputRef.current?.focus(), 50);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') {
        logSignUpTelemetry({
          action: 'OTP_REQUEST_ABORTED',
          maskedEmail: maskEmail(email),
          requestId,
          level: 'warn',
          message: 'OTP request timed out or was cancelled',
        });
        setGeneralError('The request timed out. Please try again.');
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to send verification code.';
      logSignUpTelemetry({
        action: 'OTP_REQUEST_FAILED',
        maskedEmail: maskEmail(email),
        requestId,
        level: 'error',
        message,
      });
      setGeneralError(message);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  const handleResendOtp = async (): Promise<void> => {
    if (cooldown > 0 || isSubmittingRef.current || loading || !isOnline) return;
    setGeneralError(null);
    setLoading(true);
    isSubmittingRef.current = true;
    const requestId = generateTraceId();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    logSignUpTelemetry({
      action: 'OTP_RESEND_INITIATED',
      maskedEmail: maskEmail(formData.email),
      requestId,
      level: 'info',
      message: 'Resending verification code',
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('Request aborted or timed out', 'AbortError'));
        };
        const timer = setTimeout(() => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve();
        }, 500);
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      if (!isMountedRef.current || controller.signal.aborted) return;
      logSignUpTelemetry({
        action: 'OTP_RESEND_SUCCESS',
        maskedEmail: maskEmail(formData.email),
        requestId,
        level: 'info',
        message: 'Verification code resent successfully',
      });
      startCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') {
        setGeneralError('Resend request timed out. Please check your connection.');
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to resend verification code.';
      logSignUpTelemetry({
        action: 'OTP_RESEND_FAILED',
        maskedEmail: maskEmail(formData.email),
        requestId,
        level: 'error',
        message,
      });
      setGeneralError(message);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;
    if (!isOnline) {
      setGeneralError('You are currently offline. Check your internet connection.');
      return;
    }

    const validationResult = SignUpStep2Schema.safeParse({
      otpCode: formData.otpCode,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });

    if (!validationResult.success) {
      const flattened = validationResult.error.flatten().fieldErrors;
      const formattedErrors: FormFieldErrors = {
        otpCode: flattened.otpCode?.[0],
        firstName: flattened.firstName?.[0],
        middleName: flattened.middleName?.[0],
        lastName: flattened.lastName?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
      };
      setFieldErrors(formattedErrors);
      
      if (formattedErrors.otpCode) {
        otpInputRef.current?.focus();
      } else if (formattedErrors.firstName) {
        firstNameInputRef.current?.focus();
      } else if (formattedErrors.lastName) {
        lastNameInputRef.current?.focus();
      } else if (formattedErrors.password) {
        passwordInputRef.current?.focus();
      } else if (formattedErrors.confirmPassword) {
        confirmPasswordInputRef.current?.focus();
      }
      return;
    }

    const requestId = generateTraceId();
    setLoading(true);
    isSubmittingRef.current = true;
    setGeneralError(null);
    setFieldErrors({});

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    logSignUpTelemetry({
      action: 'REGISTRATION_INITIATED',
      maskedEmail: maskEmail(formData.email),
      requestId,
      level: 'info',
      message: 'Beginning final account registration',
    });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (!isMountedRef.current || controller.signal.aborted) return;
      
      logSignUpTelemetry({
        action: 'REGISTRATION_SUCCESS',
        maskedEmail: maskEmail(formData.email),
        requestId,
        level: 'info',
        message: 'Account registration completed successfully',
      });
      navigate('/login?registered=true', { replace: true });
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') {
        logSignUpTelemetry({
          action: 'REGISTRATION_ABORTED',
          maskedEmail: maskEmail(formData.email),
          requestId,
          level: 'warn',
          message: 'Registration request timed out',
        });
        setGeneralError('Registration timed out. Please try again.');
        return;
      }
      const message = err instanceof Error ? err.message : 'Registration failed due to an unknown error.';
      logSignUpTelemetry({
        action: 'REGISTRATION_FAILED',
        maskedEmail: maskEmail(formData.email),
        requestId,
        level: 'error',
        message,
      });
      setGeneralError(message);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  return {
    step,
    formData,
    fieldErrors,
    generalError,
    loading,
    showPassword,
    showConfirmPassword,
    cooldown,
    isOnline,
    emailInputRef,
    otpInputRef,
    firstNameInputRef,
    lastNameInputRef,
    passwordInputRef,
    confirmPasswordInputRef,
    handleChange,
    handleStepBack,
    handleRequestOtp,
    handleResendOtp,
    handleSignUp,
    setShowPassword,
    setShowConfirmPassword,
  };
}
