# Cross-Check Analysis: Security Document Gaps

**Date:** 2026-02-02
**Comparing:**
1. `/docs/plans/2026-02-02-security-compliance-analysis.md` (Plans Analysis)
2. `/docs/security/SECURITY_IMPLEMENTATION_PLAN.md` (Implementation Plan)
3. `/docs/security/SECURITY_COMPLIANCE_ANALYSIS.md` (Requirements Mapping)

---

## 🔴 MISSING from Implementation Plan

The following items from the Plans Analysis are NOT covered in the Implementation Plan:

### Privacy Protection (Critical for Korean Law)
| Code | Requirement | Notes |
|------|-------------|-------|
| **PV02** | Age verification (14+) | Korean privacy law requires parental consent for under-14 |
| **PV04** | Re-authentication for profile changes | Verify password before changing sensitive profile data |
| **PV06** | PII masking on display | Partially show phone (010-****-1234), email (k**@gmail.com) |
| **PV07** | No SSN for password recovery | ✅ Already OK (not using SSN) |

### Authentication & Access Control
| Code | Requirement | Notes |
|------|-------------|-------|
| **AC03** | Concurrent login prevention | Block same account from multiple sessions |
| **AC05** | Replay attack prevention | Timestamp validation, one-time tokens |
| **ID05** | Password expiry (90 days) | Force password change quarterly |

### Account Management
| Code | Requirement | Notes |
|------|-------------|-------|
| **ID01** | Account history retention (3+ years) | Keep account creation/deletion records |
| **2.3.B** | Offboarding procedure | Document access revocation process |
| **2.3.V** | Data deletion policy | Delete data when retention period expires |

---

## 🟡 MISSING from Requirements Mapping

The following items need to be added to `SECURITY_COMPLIANCE_ANALYSIS.md`:

1. **Current Status Column** - Plans doc has status (OK/PARTIAL/NEEDS IMPL), Requirements doc doesn't
2. **Age verification (14+)** - Korean privacy law requirement
3. **Concurrent login prevention** - AC03 sub-item
4. **Account history 3-year retention** - ID01 requirement
5. **Data deletion when no longer needed** - 2.3.V requirement
6. **Password history (no reuse)** - UA04 from DB checklist

---

## 🟢 INCONSISTENCIES Found

### 1. Session Timeout Duration
- Plans doc: "Auto logout timeout" (no specific time)
- Implementation: `SESSION_TIMEOUT = 30 * 60` (30 minutes)
- **Resolution:** 30 minutes is correct per Samsung checklist

### 2. Password Complexity
- Plans doc: "8+ chars, 2+ types"
- Implementation: "8 chars + letter + number + special character" (3 types)
- Requirements: "8+ chars with 2+ types OR 10+ chars with 1 type"
- **Resolution:** Implementation is stricter than required (OK)

### 3. Account Lockout
- Plans doc: Mentions "rate limiting" and "attempt limiting"
- Implementation: "5 failed attempts for 30 minutes"
- Requirements: "Account lockout after failed attempts"
- **Resolution:** Need to implement 5/30min specifically

### 4. Log Retention
- Plans doc: CF07 says "1 year"
- Requirements: 2.3.C says "3+ years" for access logs with PII
- Implementation: "1 year"
- **Resolution:** Update to 3 years for access logs, 1 year for general logs

### 5. X-Frame-Options
- Implementation: `SAMEORIGIN`
- Plans doc snippet: `DENY`
- **Resolution:** Use `SAMEORIGIN` if embedding in same-origin iframes is needed, else `DENY`

---

## 📋 CONSOLIDATED ACTION ITEMS

### Add to Implementation Plan (Phase 1 - Critical)

```typescript
// 1. Add to middleware.ts - Concurrent Login Prevention
// Track active sessions per user, invalidate old sessions

// 2. Add to validation.ts - Age Verification Schema
export const ageVerificationSchema = z.object({
  birthDate: z.date(),
  parentConsent: z.boolean().optional(), // Required if under 14
}).refine((data) => {
  const age = calculateAge(data.birthDate);
  if (age < 14 && !data.parentConsent) {
    return false; // Under 14 needs parent consent
  }
  return true;
}, { message: "Parental consent required for users under 14" });

// 3. Add to lib/security/pii-masking.ts
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
}

export function maskPhone(phone: string): string {
  // 010-1234-5678 → 010-****-5678
  return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
}

// 4. Add password expiry check
export function isPasswordExpired(lastChanged: Date, maxAgeDays: number = 90): boolean {
  const daysSinceChange = (Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceChange > maxAgeDays;
}
```

### Add to Database Schema

```sql
-- Track password history for no-reuse policy
CREATE TABLE password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track active sessions for concurrent login prevention
CREATE TABLE active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- Only one active session per user
);

-- Track password changes for 90-day expiry
ALTER TABLE user_profiles ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Track account history for 3-year retention (separate from access_logs)
CREATE TABLE account_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- 'created', 'deleted', 'modified', 'suspended'
  user_id UUID,
  admin_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3-year retention policy
CREATE INDEX idx_account_audit_created ON account_audit_log(created_at);
-- Auto-delete after 3 years (configure via pg_cron or Supabase scheduled function)
```

### Add to Privacy Policy Requirements

1. **Age Gate Component** - Show before signup
2. **Parent Consent Flow** - For users under 14
3. **Data Retention Notice** - Clear disclosure of retention periods
4. **Right to Deletion** - GDPR/Korean PIPA compliance

---

## 📝 Updated Checklist (Consolidated)

### Phase 1: Critical Security (Before MVP)
- [ ] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] Session timeout (30 min)
- [ ] Account lockout (5 attempts / 30 min)
- [ ] Custom error pages (no stack traces)
- [ ] Input validation (SQL injection, XSS)
- [ ] **NEW:** Concurrent login prevention
- [ ] **NEW:** PII masking utilities

### Phase 2: Compliance (Before Samsung Review)
- [ ] MFA for admin
- [ ] Password complexity validation (8+ chars, 2+ types)
- [ ] **NEW:** Password expiry (90 days)
- [ ] **NEW:** Password history (no reuse)
- [ ] **NEW:** Age verification (14+)
- [ ] Privacy policy page
- [ ] Consent collection
- [ ] Access logging (1+ year retention)
- [ ] **NEW:** Account audit log (3+ year retention)

### Phase 3: Operations
- [ ] Offboarding procedures documented
- [ ] Data retention/deletion policy
- [ ] Incident response plan
- [ ] Security monitoring dashboard
- [ ] Penetration testing

---

## ✅ VERIFICATION

All Samsung checklist items are now accounted for across the three documents. The Implementation Plan should be updated with the items marked **NEW** above.
