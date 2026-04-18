# Example Outputs — Document Analysis AI

Three examples are provided below covering a scam letter, a legitimate urgent bill, and a low-urgency legitimate document.

---

## Example 1 — Likely Scam (IRS Impersonation Letter)

### Input Document Text

```
FINAL NOTICE — INTERNAL REVENUE SERVICE
Case ID: IRS-2026-88421

Dear Taxpayer,

Our records indicate that you owe $3,847.00 in unpaid federal taxes from tax year 2023. 
Failure to respond within 24 HOURS will result in immediate arrest and criminal prosecution.

To avoid arrest, you must pay immediately using Google Play gift cards or iTunes gift cards.
Call our agent at 1-888-555-0192 to make payment and close this case.

DO NOT IGNORE THIS NOTICE. This is your FINAL WARNING before law enforcement is dispatched.

IRS Collections Division
```

### Model Output

---

## Scam Assessment

**Verdict:** Likely Scam
**Confidence:** 98%

**Rationale:** This document exhibits multiple hallmark scam characteristics simultaneously: it demands payment via gift cards (a method the IRS never uses), threatens immediate arrest to manufacture panic, and provides a vague toll-free number with no verifiable IRS contact details.

**Red Flags Detected:**
- Demands payment via Google Play or iTunes gift cards — the IRS never accepts gift cards as payment
- Threatens "immediate arrest" within 24 hours — the IRS does not arrest taxpayers without prior written notices and court proceedings
- Extreme urgency pressure ("24 HOURS", "FINAL WARNING") designed to prevent the recipient from thinking critically
- No official IRS address, employee name, or case reference verifiable through IRS.gov
- Grammar inconsistency: unprofessional capitalization and phrasing inconsistent with official IRS communications

---

## Document Classification

**Document Type:** Government Notice (Fraudulent IRS Impersonation)
**Confidence:** 96%

**Justification:** The document mimics IRS formatting and references a tax debt, but the payment method, tone, and contact details are inconsistent with any authentic IRS correspondence. It is classified as a fraudulent impersonation of a government tax notice.

---

## Urgency Rating

**Rating:** MEDIUM
**Due Date / Deadline:** "Within 24 hours" (stated in document — not credible)

**Reason:** Although the document claims a 24-hour deadline, the Urgency Rating is capped at MEDIUM because this document is assessed as a Likely Scam. The manufactured deadline is a pressure tactic; no legitimate legal action will follow from ignoring it.

---

## Recommended Next Steps

- **Do not call** the number listed (1-888-555-0192) and do not purchase any gift cards.
- **Do not provide** any personal information (SSN, bank account, credit card) to anyone claiming to be from this letter.
- **Verify independently**: If you want to confirm whether you actually owe taxes, visit IRS.gov directly or call the official IRS number at 1-800-829-1040.
- **Report the scam** to the IRS phishing/fraud line at phishing@irs.gov and to the FTC at ReportFraud.ftc.gov.
- **Discard** the document. No legitimate action is required in response to it.

---

---

## Example 2 — Likely Legitimate, HIGH Urgency (Past-Due Utility Bill)

### Input Document Text

```
Pacific Gas & Electric Company
Account Number: 4821-009-334
Billing Date: February 18, 2026

PAST DUE NOTICE

Dear Customer,

Your account has an outstanding balance of $214.73, which was due on February 10, 2026.

If payment is not received by March 5, 2026, your electric service will be disconnected.

To pay online: pge.com/pay
To pay by phone: 1-800-743-5000
To pay by mail: PG&E Payment Processing, P.O. Box 997300, Sacramento, CA 95899

If you are experiencing financial hardship, please call us to discuss payment arrangements before the disconnection date.

Thank you,
Pacific Gas & Electric Customer Service
```

### Model Output (Today's date: March 3, 2026)

---

## Scam Assessment

**Verdict:** Likely Legitimate
**Confidence:** 91%

**Rationale:** The document uses verifiable PG&E contact information, provides multiple standard payment channels (website, phone, mail), and does not request unusual payment methods. The tone, account number format, and payment address are consistent with authentic utility billing practices.

**Red Flags Detected:**
- None detected.

---

## Document Classification

**Document Type:** Utility Bill (Past-Due Notice)
**Confidence:** 97%

**Justification:** The document explicitly identifies PG&E as the sender, references a specific account number and billing date, states an outstanding balance with a disconnection threat, and provides standard utility payment options — all hallmarks of a past-due utility bill.

---

## Urgency Rating

**Rating:** HIGH
**Due Date / Deadline:** March 5, 2026

**Reason:** Payment is due in 2 days (today is March 3, 2026), and failure to pay by that date will result in service disconnection — a serious and immediate consequence.

---

## Recommended Next Steps

- **Pay the balance of $214.73 before March 5, 2026** to avoid disconnection. Pay online at pge.com/pay or by calling 1-800-743-5000.
- **If you cannot pay in full**, call PG&E at 1-800-743-5000 before March 5 to ask about a payment plan or hardship extension — the letter explicitly offers this option.
- **Save your payment confirmation** (screenshot or reference number) as proof of payment in case of any billing dispute.
- **Check your autopay settings** to prevent future past-due notices.

---

---

## Example 3 — Likely Legitimate, LOW Urgency (Annual Insurance Renewal Notice)

### Input Document Text

```
Nationwide Insurance
Policy Number: HO-2291-887-44
Date: February 25, 2026

Dear Policyholder,

This is your annual renewal notice for your Homeowners Insurance Policy. Your current policy 
expires on May 1, 2026. Your renewed policy will automatically take effect on that date unless 
you choose to cancel.

Your estimated annual premium for the renewal period (May 1, 2026 – May 1, 2027) is $1,342.00, 
a 4% increase from last year's premium of $1,290.00.

If you have questions or wish to review your coverage options, please contact your local agent 
or call 1-800-882-2822.

No action is required if you wish to continue your current coverage.

Sincerely,
Nationwide Insurance Renewal Department
```

### Model Output

---

## Scam Assessment

**Verdict:** Likely Legitimate
**Confidence:** 94%

**Rationale:** The document is consistent with a standard annual insurance renewal notice: it references a specific policy number, states a modest premium increase with the prior year's figure for comparison, and requires no immediate action. There are no unusual payment demands or pressure tactics.

**Red Flags Detected:**
- None detected.

---

## Document Classification

**Document Type:** Insurance Document (Annual Renewal Notice)
**Confidence:** 98%

**Justification:** The document explicitly identifies Nationwide Insurance as the sender, references a homeowners policy number and expiration date, provides a premium amount and renewal period, and follows the standard format of an insurance renewal notification.

---

## Urgency Rating

**Rating:** LOW
**Due Date / Deadline:** May 1, 2026 (policy renewal/expiration date)

**Reason:** The policy renewal is nearly 2 months away, no payment is immediately required, and no action is needed to continue coverage — making this an informational notice with no near-term deadline.

---

## Recommended Next Steps

- **Review your coverage details** before the May 1, 2026 renewal date to confirm your coverage limits and deductibles still meet your needs.
- **Compare rates** if the 4% premium increase is a concern — you have time to shop around before the renewal date.
- **Contact your agent** at 1-800-882-2822 if you want to adjust coverage, ask about discounts, or switch providers.
- **No immediate action required** — your policy will auto-renew on May 1, 2026 if you do nothing.
