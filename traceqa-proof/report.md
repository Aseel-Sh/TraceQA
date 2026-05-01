# TraceQA Demo Test Report

**Generated:** 5/1/2026, 3:59:38 PM

## Summary

- **Total Tests:** 9
- **Passed:** 8 (88.9%)
- **Failed:** 1 (11.1%)
- **Merge Readiness:** ⚠️ REVIEW NEEDED (Score: 88/100)

## Acceptance Criteria

1. User can register with email and password
2. Password must be at least 8 characters with uppercase, lowercase, and number
3. User receives confirmation email after registration
4. User can login with valid credentials
5. User cannot login with invalid credentials

## Test Results

### TC1: Register with valid email and password ✅ PASSED

**Description:** Verify user can successfully register with valid credentials

**Priority:** high

**Duration:** 100ms

**Steps:**
1. Navigate to registration page
2. Enter valid email address
3. Enter valid password
4. Click Register button

**Expected Result:** User is registered successfully and redirected to dashboard

**Evidence:**
```
✅ All steps executed successfully
User is registered successfully and redirected to dashboard
```

---

### TC2: Register with invalid email format ✅ PASSED

**Description:** Verify system rejects invalid email format

**Priority:** high

**Duration:** 150ms

**Steps:**
1. Navigate to registration page
2. Enter invalid email (e.g., "notanemail")
3. Enter valid password
4. Click Register button

**Expected Result:** Error message displayed: "Invalid email format"

**Evidence:**
```
✅ All steps executed successfully
Error message displayed: "Invalid email format"
```

---

### TC3: Register with weak password ❌ FAILED

**Description:** Verify password validation enforces complexity requirements

**Priority:** high

**Duration:** 200ms

**Steps:**
1. Navigate to registration page
2. Enter valid email address
3. Enter weak password (e.g., "pass123")
4. Click Register button

**Expected Result:** Error message displayed: "Password must be at least 8 characters with uppercase, lowercase, and number"

**Evidence:**
```
❌ Test failed at step 3
Expected: Error message displayed: "Password must be at least 8 characters with uppercase, lowercase, and number"
Actual: Password "pass123" accepted (validation not working)
```

---

### TC4: Password validation with strong password ✅ PASSED

**Description:** Verify strong password is accepted

**Priority:** high

**Duration:** 100ms

**Steps:**
1. Navigate to registration page
2. Enter valid email address
3. Enter strong password (e.g., "SecurePass123")
4. Click Register button

**Expected Result:** Password accepted and user registered

**Evidence:**
```
✅ All steps executed successfully
Password accepted and user registered
```

---

### TC5: Email confirmation sent after registration ✅ PASSED

**Description:** Verify confirmation email is sent to user

**Priority:** medium

**Duration:** 150ms

**Steps:**
1. Complete registration with valid credentials
2. Check email inbox

**Expected Result:** Confirmation email received with activation link

**Evidence:**
```
✅ All steps executed successfully
Confirmation email received with activation link
```

---

### TC6: Login with valid credentials ✅ PASSED

**Description:** Verify user can login with correct username and password

**Priority:** high

**Duration:** 200ms

**Steps:**
1. Navigate to login page
2. Enter registered email
3. Enter correct password
4. Click Login button

**Expected Result:** User is logged in and redirected to dashboard

**Evidence:**
```
✅ All steps executed successfully
User is logged in and redirected to dashboard
```

---

### TC7: Login with valid credentials ✅ PASSED

**Description:** Verify user can login with correct username and password

**Priority:** high

**Duration:** 100ms

**Steps:**
1. Navigate to login page
2. Enter registered email
3. Enter correct password
4. Click Login button

**Expected Result:** User is logged in and redirected to dashboard

**Evidence:**
```
✅ All steps executed successfully
User is logged in and redirected to dashboard
```

---

### TC8: Login with invalid password ✅ PASSED

**Description:** Verify system rejects incorrect password

**Priority:** high

**Duration:** 150ms

**Steps:**
1. Navigate to login page
2. Enter registered email
3. Enter incorrect password
4. Click Login button

**Expected Result:** Error message displayed: "Invalid credentials"

**Evidence:**
```
✅ All steps executed successfully
Error message displayed: "Invalid credentials"
```

---

### TC9: Login with non-existent user ✅ PASSED

**Description:** Verify system rejects non-existent user

**Priority:** high

**Duration:** 200ms

**Steps:**
1. Navigate to login page
2. Enter non-registered email
3. Enter any password
4. Click Login button

**Expected Result:** Error message displayed: "User not found"

**Evidence:**
```
✅ All steps executed successfully
Error message displayed: "User not found"
```

---

