import React, { type ChangeEvent, type FormEvent, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import type { SignUpFormData, FormFieldErrors } from '../schemas/signUpSchemas';

interface SignUpStepOneProps {
  formData: SignUpFormData;
  fieldErrors: FormFieldErrors;
  loading: boolean;
  isOnline: boolean;
  emailInputRef: RefObject<HTMLInputElement>;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRequestOtp: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function SignUpStepOne({
  formData,
  fieldErrors,
  loading,
  isOnline,
  emailInputRef,
  handleChange,
  handleRequestOtp,
}: SignUpStepOneProps): React.JSX.Element {
  return (
    <form
      onSubmit={handleRequestOtp}
      className="flex flex-col gap-3.5"
      noValidate
      aria-busy={loading}
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
        >
          Email Address
        </label>
        <input
          ref={emailInputRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          placeholder="name@example.com"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck="false"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'step1-email-error' : undefined}
          className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
          required
        />
        {fieldErrors.email && (
          <span
            id="step1-email-error"
            role="alert"
            className="text-[11px] text-rose-600 font-medium mt-0.5"
          >
            {fieldErrors.email}
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
            <span>Please wait...</span>
          </>
        ) : (
          'Next'
        )}
      </button>
    </form>
  );
}
