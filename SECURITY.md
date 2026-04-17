# Security Policy

## Scope

The following are in scope for security reports:

- Authentication and JWT token handling (`lib/auth.ts`, `middleware.ts`)
- Payment processing (`app/api/payments/`)
- SOS and safety system (`app/api/safety/`)
- API authorization and role middleware (`lib/auth/middleware.ts`)
- SQL injection or data exposure via API endpoints
- Sensitive data leakage (user PII, operator data, booking details)

## Reporting a Vulnerability

Do **not** open a public GitHub issue for security vulnerabilities.

Send a report to: **pospkam@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

## Response

You will receive an acknowledgement within 48 hours. Critical issues affecting payments or user data will be treated as highest priority.

## Out of Scope

- Denial of service attacks
- Social engineering
- Issues in third-party services (Telegram, Tochka Bank, OpenRouter)
