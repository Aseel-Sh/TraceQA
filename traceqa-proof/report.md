# TraceQA Test Report

**Generated**: 2026-05-02T00:10:21.576Z
**Project**: test
**Branch**: current
**TraceQA Version**: 1.0.0

## Merge Readiness: ❌ DO NOT MERGE (Score: 0/100)

### Summary

- **Total Tests**: 7
- **Passed**: 0 ✅
- **Failed**: 7 ❌
- **Uncertain**: 0 ❓
- **Coverage**: 0.0%
- **Success Rate**: 0.0%
- **Duration**: 55467.00s

### Recommendation

Critical issues detected. Do not merge until 7 failed test(s) are resolved. Score: 0/100.

### Risks

- ⚠️ 7 test(s) failed
- ⚠️ Low coverage: 0.0%

## Trace Matrix

| Acceptance Criterion | Generated Tests | Status | Evidence |
|---------------------|----------------|--------|----------|
| AC-1: A user can register with a valid email and strong password. | Invalid email format registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Weak password registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Duplicate email registration conflict | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"error": "Duplicate email"}, Request Body: {"error":"Duplicate email"}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.02s |
|  | Valid user login | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Invalid login credentials | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 401}, Request Body: {"statusCode":401}, Expected Status: 401, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Valid user registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
| AC-2: Registration rejects invalid email formats. | Invalid email format registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Weak password registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Duplicate email registration conflict | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"error": "Duplicate email"}, Request Body: {"error":"Duplicate email"}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.02s |
|  | Invalid login credentials | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 401}, Request Body: {"statusCode":401}, Expected Status: 401, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Valid user registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
| AC-3: Registration rejects weak passwords. | Invalid email format registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Weak password registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Duplicate email registration conflict | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"error": "Duplicate email"}, Request Body: {"error":"Duplicate email"}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.02s |
|  | Valid user registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
| AC-4: Duplicate email registration returns a clear conflict error. | Invalid email format registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Weak password registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Duplicate email registration conflict | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"error": "Duplicate email"}, Request Body: {"error":"Duplicate email"}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.02s |
|  | Valid user registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
| AC-5: A registered user can log in with valid credentials. | Invalid email format registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Valid user login | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Invalid login credentials | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 401}, Request Body: {"statusCode":401}, Expected Status: 401, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
|  | Valid user registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
| AC-6: Invalid login credentials are rejected. | Invalid email format registration | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 400}, Request Body: {"statusCode":400}, Expected Status: 400, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Valid user login | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 200}, Request Body: {"statusCode":200}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.05s |
|  | Invalid login credentials | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: POST, URL: {"statusCode": 401}, Request Body: {"statusCode":401}, Expected Status: 401, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |
| AC-7: The health endpoint returns OK. | Health endpoint | ❌ failed | Error: API request failed: Invalid URL | API test failed: API request failed: Invalid URL | Logs: Method: GET, URL: {"status": "OK"}, Expected Status: 200, Actual Status: N/A, Assertion Result: FAIL, Duration: 3.04s |

## Detailed Test Results

### ❌ Invalid email format registration

- **Status**: Failed
- **Duration**: 3047.00s
- **Timestamp**: 2026-05-02T00:09:54.899Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: POST
- URL: {"statusCode": 400}
- Request Body: {"statusCode":400}
- Expected Status: 400
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.05s

### ❌ Weak password registration

- **Status**: Failed
- **Duration**: 3042.00s
- **Timestamp**: 2026-05-02T00:09:57.943Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: POST
- URL: {"statusCode": 400}
- Request Body: {"statusCode":400}
- Expected Status: 400
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.04s

### ❌ Duplicate email registration conflict

- **Status**: Failed
- **Duration**: 3015.00s
- **Timestamp**: 2026-05-02T00:10:00.959Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: POST
- URL: {"error": "Duplicate email"}
- Request Body: {"error":"Duplicate email"}
- Expected Status: 200
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.02s

### ❌ Valid user login

- **Status**: Failed
- **Duration**: 3047.00s
- **Timestamp**: 2026-05-02T00:10:04.006Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: POST
- URL: {"statusCode": 200}
- Request Body: {"statusCode":200}
- Expected Status: 200
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.05s

### ❌ Invalid login credentials

- **Status**: Failed
- **Duration**: 3039.00s
- **Timestamp**: 2026-05-02T00:10:07.047Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: POST
- URL: {"statusCode": 401}
- Request Body: {"statusCode":401}
- Expected Status: 401
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.04s

### ❌ Valid user registration

- **Status**: Failed
- **Duration**: 3044.00s
- **Timestamp**: 2026-05-02T00:10:10.092Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: POST
- URL: {"statusCode": 200}
- Request Body: {"statusCode":200}
- Expected Status: 200
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.04s

### ❌ Health endpoint

- **Status**: Failed
- **Duration**: 3037.00s
- **Timestamp**: 2026-05-02T00:10:13.129Z
- **Message**: API test failed: API request failed: Invalid URL

**Error Details**:
```
API request failed: Invalid URL
```

**Logs**:
- Method: GET
- URL: {"status": "OK"}
- Expected Status: 200
- Actual Status: N/A
- Assertion Result: FAIL
- Duration: 3.04s

---

*Report generated by TraceQA v1.0.0 on 2026-05-02T00:10:21.576Z*
