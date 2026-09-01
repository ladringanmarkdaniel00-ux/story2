import React, { type ChangeEvent, type FormEvent, type RefObject } from 'react';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import type { SignUpFormData, FormFieldErrors } from '../schemas/signUpSchemas';

interface SignUpStepTwoProps {
  formData: SignUpFormData;
  fieldErrors: FormFieldErrors;
  loading: boolean;
  isOnline: boolean;
  cooldown: number;
  showPassword: boolean;
  showConfirmPassword: boolean;
  otpInputRef: RefObject<HTMLInputElement>;
  firstNameInputRef: RefObject<HTMLInputElement>;
  lastNameInputRef: RefObject<HTMLInputElement>;
  passwordInputRef: RefObject<HTMLInputElement>;
  confirmPasswordInputRef: RefObject<HTMLInputElement>;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleStepBack: () => void;
  handleResendOtp: () => Promise<void>;
  handleSignUp: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  setShowPassword: (value: React.SetStateAction<boolean>) => void;
  setShowConfirmPassword: (value: React.SetStateAction<boolean>) => void;
}

export function SignUpStepTwo({
  formData,
  fieldErrors,
  loading,
  isOnline,
  cooldown,
  showPassword,
  showConfirmPassword,
  otpInputRef,
  firstNameInputRef,
  lastNameInputRef,
  passwordInputRef,
  confirmPasswordInputRef,
  handleChange,
  handleStepBack,
  handleResendOtp,
  handleSignUp,
  setShowPassword,
  setShowConfirmPassword,
}: SignUpStepTwoProps): React.JSX.Element {
  return (
    <form
      onSubmit={handleSignUp}
      className="flex flex-col gap-3.5"
      noValidate
      aria-busy={loading}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
        <span className="text-[11px] text-neutral-500 font-medium truncate max-w-[160px]">
          {formData.email}
        </span>
        <button
          type="button"
          onClick={handleStepBack}
          disabled={loading}
          className="text-[10px] text-neutral-900 font-semibold hover:text-neutral-500 uppercase tracking-widest cursor-pointer flex items-center gap-1 focus:outline-none focus-visible:underline disabled:opacity-50"
        >
          <ArrowLeft className="w-2.5 h-2.5" aria-hidden="true" />
          Change
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="otpCode"
          className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
        >
          Verification Code
        </label>
        <div className="relative flex items-center">
          <input
            ref={otpInputRef}
            id="otpCode"
            name="otpCode"
            type="text"
            placeholder="Enter code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={formData.otpCode}
            onChange={handleChange}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.otpCode)}
            aria-describedby={fieldErrors.otpCode ? 'otp-error' : undefined}
            className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50 pr-16"
            required
          />
          <button
            type="button"
            onClick={() => void handleResendOtp()}
            disabled={cooldown > 0 || loading || !isOnline}
            aria-label={
              cooldown > 0
                ? `Resend code available in ${cooldown} seconds`
                : 'Resend verification code'
            }
            className="absolute right-0 text-[10px] uppercase font-semibold text-neutral-600 hover:text-black disabled:text-neutral-300 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:underline"
          >
            {cooldown > 0 ? `${cooldown}s` : 'Resend'}
          </button>
        </div>
        {fieldErrors.otpCode && (
          <span id="otp-error" role="alert" className="text-[11px] text-rose-600 font-medium mt-0.5">
            {fieldErrors.otpCode}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <label
            htmlFor="firstName"
            className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
          >
            First Name
          </label>
          <input
            ref={firstNameInputRef}
            id="firstName"
            name="firstName"
            type="text"
            placeholder="First"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={handleChange}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.firstName)}
            aria-describedby={fieldErrors.firstName ? 'first-name-error' : undefined}
            className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
            required
          />
          {fieldErrors.firstName && (
            <span
              id="first-name-error"
              role="alert"
              className="text-[11px] text-rose-600 font-medium mt-0.5"
            >
              {fieldErrors.firstName}
            </span>
          )}
        </div>
        <div className="w-1/3 flex flex-col gap-1">
          <label
            htmlFor="middleName"
            className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase truncate"
          >
            Middle
          </label>
          <input
            id="middleName"
            name="middleName"
            type="text"
            placeholder="Middle"
            autoComplete="additional-name"
            value={formData.middleName}
            onChange={handleChange}
            disabled={loading}
            className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="lastName"
          className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
        >
          Last Name
        </label>
        <input
          ref={lastNameInputRef}
          id="lastName"
          name="lastName"
          type="text"
          placeholder="Last name"
          autoComplete="family-name"
          value={formData.lastName}
          onChange={handleChange}
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.lastName)}
          aria-describedby={fieldErrors.lastName ? 'last-name-error' : undefined}
          className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
          required
        />
        {fieldErrors.lastName && (
          <span
            id="last-name-error"
            role="alert"
            className="text-[11px] text-rose-600 font-medium mt-0.5"
          >
            {fieldErrors.lastName}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
        >
          Password
        </label>
        <div className="relative flex items-center">
          <input
            ref={passwordInputRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 characters"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50 pr-8"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            disabled={loading}
            className="absolute right-1 text-neutral-400 hover:text-black transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black rounded p-0.5"
          >
            {showPassword ? (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <span
            id="password-error"
            role="alert"
            className="text-[11px] text-rose-600 font-medium mt-0.5"
          >
            {fieldErrors.password}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="confirmPassword"
          className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
        >
          Confirm Password
        </label>
        <div className="relative flex items-center">
          <input
            ref={confirmPasswordInputRef}
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Re-enter password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={
              fieldErrors.confirmPassword ? 'confirm-password-error' : undefined
            }
            className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50 pr-8"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={
              showConfirmPassword
                ? 'Hide password confirmation'
                : 'Show password confirmation'
            }
            aria-pressed={showConfirmPassword}
            disabled={loading}
            className="absolute right-1 text-neutral-400 hover:text-black transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black rounded p-0.5"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <span
            id="confirm-password-error"
            role="alert"
            className="text-[11px] text-rose-600 font-medium mt-0.5"
          >
            {fieldErrors.confirmPassword}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !isOnline}
        className="w-full bg-black text-white rounded-none px-4 py-2.5 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors mt-2 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>Registering...</span>
          </>
        ) : (
          'Complete Registration'
        )}
      </button>
    </form>
  );
}
