import type { Widen } from '@/i18n/types';
import type { authAr } from './ar';

export const authEn: Widen<typeof authAr> = {
  auth: {
    loginTitle: 'Sign in',
    loginSubtitle: 'Welcome back',
    email: 'Email',
    password: 'Password',
    passwordConfirm: 'Confirm password',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    loginButton: 'Sign in',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    registerTitle: 'Create a patient account',
    registerSubtitle: 'Book and manage your appointments easily',
    doctorRegisterTitle: 'Join as a doctor',
    doctorRegisterSubtitle:
      'Create your account, then complete your profile and upload verification documents',
    doctorRegisterNote:
      'After signing up you will continue in the doctor dashboard. Your profile stays hidden until an admin approves it.',
    name: 'Full name',
    phone: 'Phone number',
    phoneHint: 'Egyptian mobile number, e.g. 01012345678',
    acceptTerms: 'I accept the terms and privacy policy',
    registerButton: 'Create account',
    areYouDoctor: 'Are you a doctor?',
    joinAsDoctor: 'Register as a doctor',
    areYouPatient: 'Looking for a doctor?',
    joinAsPatient: 'Register as a patient',
    forgotTitle: 'Reset your password',
    forgotSubtitle: 'Enter your email and we will send you a reset link',
    sendLink: 'Send link',
    linkSent: 'If the email is registered, you will receive a reset link shortly.',
    resetTitle: 'Set a new password',
    resetButton: 'Update password',
    resetDone: 'Your password was updated. You can sign in now.',
    resetInvalidLink: 'The reset link is invalid or incomplete.',
    backToLogin: 'Back to sign in',
    loggedOut: 'Signed out',
    welcome: 'Welcome {name}',
  },
};
