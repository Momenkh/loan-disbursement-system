# Solution Overview

Approach
- The project was implemented as a two-tier system: a NestJS backend (API, business logic, Prisma ORM) and a React Admin frontend (management UI). The goal was to provide a production-like developer experience with clear API documentation (Swagger), automated database schema management (Prisma migrations), idempotent data seeding, unit tests for critical business flows, and a rollback mechanism to safely reverse disbursements.

Key technical decisions and why
- NestJS + Prisma: NestJS provides a modular architecture, decorators, guards, and a great DX for APIs; Prisma offers a type-safe ORM with migrations and a clear schema to match domain models. These choices speed up development and make tests and migrations reliable.
- React Admin (Vite) for frontend: Rapid admin UI construction with maintained components (ReferenceInput, FunctionField) and a configurable `dataProvider` to connect to the NestJS API.
- Use of enums & DTOs: Domain enums (loan status, payment status, transaction types) were modeled in Prisma and mirrored in DTOs to ensure validation and consistent API surface.
- Testing with Jest: Unit tests mock Prisma and service behavior, focusing on business rules (approval → disbursement → repayment flows, idempotency, rollback).

How the rollback system is implemented
- Atomic Prisma transactions: Rollbacks are executed inside a Prisma transaction to ensure all related writes (ledger reversal entries, account balance adjustments, rollback record creation, audit log entry) are committed together or rolled back on error.
- Idempotency checks: Before creating rollback entries the service checks whether a rollback record for the disbursement/transaction already exists to avoid double-reversal.
- Ledger reversal entries: For each original ledger entry created during disbursement, a symmetric reversing ledger entry is created that mirrors amount and swapped debit/credit sides (or inverted sign depending on the ledger model). This preserves an auditable trail and keeps aggregate balances consistent.
- Account balance handling: Account balances are adjusted consistently by applying the reversing entries; in some implementations balances are derived from ledger entries rather than stored, but this project updates balances to keep queries cheap while ledger entries remain authoritative for audits.
- Rollback record: A `RollbackRecord` (or equivalent) rows records metadata (who performed, when, original transaction id, reason) so rollbacks themselves are auditable and visible in the UI.

Logging strategy
- Audit logs: Significant state transitions (loan approval, disbursement, rollback, payment) are written to an `AuditLog` entity. Each entry includes actor, timestamp, entity ids, previous and new status, and a free-form message.
- Application logs: The service currently uses structured console logs for debug/error paths. For production, a pluggable logger (e.g., Winston or Pino) would be used to centralize logs, ship them to a log aggregation service, and add levels and structured metadata.

Security
- Threats identified
  - Broken or missing authorization (users accessing operations they shouldn't)
  - Token leakage or weak JWT handling
  - SQL/ORM injection vectors (malformed inputs)
  - CSRF/XSS in the frontend
  - Missing rate limiting leading to brute-force / DoS

- Measures implemented and why
  - Authentication & roles: JWT-based guards (`JwtAuthGuard`) and a role-based guard (`RolesGuard`) protect endpoints and actions (approve/disburse/disburse rollback, etc.). This prevents unauthorized users from triggering sensitive transitions.
  - DTO validation: DTOs and request validation (class-validator / class-transformer) ensure inputs conform to expected schemas, reducing injection risk and logical errors.
  - Parameterized queries via Prisma: Prisma API prevents raw string building for queries; avoids classic SQL injection.
  - Minimal exposure in frontend: The React Admin frontend calls secured endpoints and obtains tokens via the `authProvider`. LocalStorage access is guarded in the `dataProvider` to avoid SSR/test crashes.

- Security trade-offs
  - No global rate-limiting or WAF configured by default (trade-off: simpler dev UX). This should be added for hardened deployments.
  - Secrets are in env files; not using a secret-management service by default (trade-off: simpler local setup). Production should use vault/key-management.

- What I'd add with more time
  - Centralized logging/monitoring + alerting (ELK/Datadog + SLOs)
  - Rate-limiting, IP throttling, and WAF rules
  - Certificate management & HTTPS enforcement at ingress
  - Short-lived tokens + refresh flow + token revocation list
  - Advanced API security testing and dependency scanning

Challenges faced and solutions
- Understanding the project requirements and focusing on business logic and then implementing it using technologies I'm not fluent with.
- Mapping domain model to Prisma constraints: Some relationships and enums required iterative adjustments (migrations) to satisfy unique constraints and relations. Solution: idempotent seed and small incremental migrations.
- Tests with Prisma: Mocking Prisma transactions for unit tests required a thin wrapper to emulate `$transaction` behavior and returned model methods. Solution: create a mock transaction helper that executes the closure with a `tx` object exposing only the used model methods.
- UI behavior around `Datagrid` row clicks: Buttons inside rows triggered navigation. Solution: wrapped action buttons in containers calling `e.stopPropagation()` and added `onClick` guards inside button handlers.

What I'd improve with more time
- Wrap transactions with try and catch to create rollback records for failed transactions and be able to visualize them in the UI.
- Figure out a way to keep functions smaller with less responsibilities while maintaining the transactions,(especially repayments.service.ts) because I believe if I was fluent with nestJS, there is simpler ways to do stuff.
- Convert some account balance denormalizations to derived queries so balances are always derived from ledger entries (simpler to reason about, avoid drift).
- Add integration (e2e) tests using a test database (Docker) to validate full flows (approve → disburse → repay → rollback).
- Add CI with lint/test/coverage gates and automated migration checks.
- Make good use of current backend services to implement more features for the frontend user.
- Add a reason for loans or connect them to a product.
- Change Prisma schema to initialize it for clients to login to see their statuses and loans and be able to pay online.
- Implement ThrottlerModule in controllers and main module for rate limiting to handle DDoS attacks.

Time breakdown by feature (approximate)
- Project scaffolding & Prisma schema: 3 hours
- Loan CRUD + DTOs + validation: 2 hours
- Approval + Disbursement + Ledger flows: 3 hours
- Rollback implementation + audit logging: 1.5 hours
- Unit tests & coverage improvements: 1 hour
- Frontend (React Admin) + UX fixes: 4 hours
- Seed script + migrations: 1 hour
- Docker + Github: 1 hour
- Misc (docs, debugging, small fixes): 4 hours

