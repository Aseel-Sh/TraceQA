# User Authentication - Acceptance Criteria

## Registration

AC-1: A user can register with a valid email and strong password.
AC-2: Registration rejects invalid email formats.
AC-3: Registration rejects weak passwords (less than 8 characters).
AC-4: Duplicate email registration returns a clear conflict error.

## Login

AC-5: A registered user can log in with valid credentials.
AC-6: Invalid login credentials are rejected with appropriate error message.
AC-7: Login attempts are rate-limited after 5 failed attempts.

## Password Reset

AC-8: User can request a password reset via email.
AC-9: Password reset link expires after 1 hour.
AC-10: User can successfully reset password with valid reset token.