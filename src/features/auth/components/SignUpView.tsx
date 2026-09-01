import React from 'react';
import { useSignUpState } from '../hooks/useSignUpState';
import { OfflineBanner } from './OfflineBanner';
import { SignUpStepOne } from './SignUpStepOne';
import { SignUpStepTwo } from './SignUpStepTwo';

export function SignUpView(): React.JSX.Element {
  const state = useSignUpState();

  return (
    <main
      id="page-signup"
      className="min-h-[100svh] w-full flex items-center justify-center bg-white p-4"
    >
      <div className="w-full max-w-[18rem] sm:max-w-xs flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight text-center text-neutral-900">
          Create Account
        </h1>

        {/* Offline Notification Banner with Layout Shift Protection */}
        <OfflineBanner isOnline={state.isOnline} />

        {/* Global Error Banner with Fixed Height */}
        <div className="min-h-[20px] flex items-center justify-center">
          {state.generalError && (
            <div
              id="signup-general-error"
              role="alert"
              aria-live="assertive"
              className="text-xs text-rose-600 text-center font-medium tracking-wide"
            >
              {state.generalError}
            </div>
          )}
        </div>

        {state.step === 1 ? (
          <SignUpStepOne
            formData={state.formData}
            fieldErrors={state.fieldErrors}
            loading={state.loading}
            isOnline={state.isOnline}
            emailInputRef={state.emailInputRef}
            handleChange={state.handleChange}
            handleRequestOtp={state.handleRequestOtp}
          />
        ) : (
          <SignUpStepTwo
            formData={state.formData}
            fieldErrors={state.fieldErrors}
            loading={state.loading}
            isOnline={state.isOnline}
            cooldown={state.cooldown}
            showPassword={state.showPassword}
            showConfirmPassword={state.showConfirmPassword}
            otpInputRef={state.otpInputRef}
            firstNameInputRef={state.firstNameInputRef}
            lastNameInputRef={state.lastNameInputRef}
            passwordInputRef={state.passwordInputRef}
            confirmPasswordInputRef={state.confirmPasswordInputRef}
            handleChange={state.handleChange}
            handleStepBack={state.handleStepBack}
            handleResendOtp={state.handleResendOtp}
            handleSignUp={state.handleSignUp}
            setShowPassword={state.setShowPassword}
            setShowConfirmPassword={state.setShowConfirmPassword}
          />
        )}
      </div>
    </main>
  );
}

export default SignUpView;
