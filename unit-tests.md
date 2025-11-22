# Unit tests coverage

This document lists the unit tests added to the repository and a short description of the cases covered for each module.

## General notes
- Tests focus on service business logic and validation branches.
- Prisma client calls are mocked by replacing the `prisma` property on each service instance with a simple mock object.
- Ledger and external-service dependencies are injected/mocked where services accept them in constructors.

## Modules and test files

### Clients - `src/modules/clients/clients.service.spec.ts`
- create(): asserts `prisma.client.create` is called and the created client is returned.
- findOne(): when `prisma.client.findUnique` returns null, the service throws `NotFoundException`.
- update(): ensures `findOne` is called implicitly and `prisma.client.update` called with correct args.

### Loans - `src/modules/loans/loans.service.spec.ts`
- create(): ensures new loan created with status `PENDING`.
- submitForApproval(): throws `BadRequestException` when loan is not `PENDING`.
- submitForApproval(): updates status to `APPROVED` when initial status is `PENDING`.
- approveOrReject(): throws when loan not `APPROVED`.
- approveOrReject(): updates status when loan is `APPROVED`.

### Disbursements - `src/modules/disbursements/disbursements.service.spec.ts`
- createDisbursement(): throws `NotFoundException` when loan missing.
- createDisbursement(): throws `BadRequestException` when loan not `approved`.
- createDisbursement(): happy-path: sets up transaction flow and calls ledger service and schedule creation.

### Ledger - `src/modules/ledger/ledger.service.spec.ts`
- createLedgerEntry(): throws when debit and credit accounts are equal.
- createLedgerEntry(): happy-path writes a ledger entry and returns it.

### Repayments - `src/modules/repayments/repayments.service.spec.ts`
- createRepayment(): throws when loan not found.
- createRepayment(): happy-path: processes a repayment (creates payment and ledger entries) using a mocked transaction.

### Rollbacks - `src/modules/rollbacks/rollbacks.service.spec.ts`
- rollbackTransaction(): throws when transaction not found for rollback.
- rollbackTransaction(): handles disbursement rollback by reversing ledger and creating rollback record.

### Auth - `src/modules/auth/auth.service.spec.ts` & `auth.controller.spec.ts`
- validateUser(): throws `UnauthorizedException` if user is missing or password mismatch (bcrypt mocked).
- validateUser(): returns sanitized user object on success.
- login(): returns JWT access token shape.
- controller login/logout: ensure controller delegates to service and returns values.

### Audit - `src/modules/audit/audit.service.spec.ts` & `audit.interceptor.spec.ts`
- logTransaction(): creates an audit log when `transactionId` and `metadata` provided.
- logTransaction(): returns `null` when `metadata` is absent (no-op).
- AuditInterceptor: minimal smoke test (class exists). The interceptor in this repo is currently a stub.

## How to run tests

Install dev dependencies and run Jest:

```powershell
Set-Location -Path 'M:\Work\Flend Task\loan-disbursement-system-flend'
npm ci
npm test
```

Notes
- These tests mock Prisma usage by replacing the `prisma` property on services; they don't require a running database.
- If your services require additional constructor parameters, tests instantiate the class and then overwrite the `prisma` property (and other dependencies) with mocks.

If you want, I can also:
- Add DTO validation tests using `class-validator` to assert validation fails/passes for invalid inputs.
- Add additional negative cases and edge cases (e.g., idempotency edge cases, concurrency scenarios mocked via rejected promises).
