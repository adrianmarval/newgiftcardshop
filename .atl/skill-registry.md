# Skill Registry — newgiftcardshop

Generated: 2026-04-14

## Project-Level Skills (`.agents/skills/`)

| Skill                                      | Description                                                                                                                             | Trigger                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `better-auth-best-practices`               | Configure Better Auth server and client, set up database adapters, manage sessions, add plugins, and handle environment variables.      | Better Auth, betterauth, auth.ts, authentication, email/password, OAuth, plugin configuration                     |
| `better-auth-security-best-practices`      | Configure rate limiting, manage auth secrets, set up CSRF protection, define trusted origins, secure sessions and cookies.              | Security, rate limiting, CSRF, trusted origins, auth hardening                                                    |
| `email-and-password-best-practices`        | Configure email verification, password reset flows, set password policies, and customise hashing algorithms.                            | Email verification, password reset, login, sign-in, sign-up, credential auth                                      |
| `nextjs`                                   | Next.js 15+ App Router development patterns including Server Components, Client Components, data fetching, layouts, and server actions. | Creating pages, routes, layouts, components, API route handlers, server actions, loading states, error boundaries |
| `organization-best-practices`              | Configure multi-tenant organizations, manage members and invitations, define custom roles and permissions, set up teams, RBAC.          | Org setup, team management, member roles, access control, organization plugin                                     |
| `two-factor-authentication-best-practices` | Configure TOTP, OTP via email/SMS, backup codes, trusted devices, 2FA sign-in flows.                                                    | MFA, multi-factor auth, authenticator, 2FA, login security                                                        |

## User-Level SDD Skills (`~/.config/opencode/skills/`)

| Skill            | Description                                                       | Trigger                                                        |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `sdd-explore`    | Explore and investigate ideas before committing to a change.      | Orchestrator: explore a feature or investigate codebase        |
| `sdd-propose`    | Create a change proposal with intent, scope, and approach.        | Orchestrator: create/update a proposal                         |
| `sdd-spec`       | Write specifications with requirements and scenarios.             | Orchestrator: write/update specs for a change                  |
| `sdd-design`     | Create technical design document with architecture decisions.     | Orchestrator: write/update technical design                    |
| `sdd-tasks`      | Break down a change into an implementation task checklist.        | Orchestrator: create/update task breakdown                     |
| `sdd-apply`      | Implement tasks from the change, writing actual code.             | Orchestrator: implement tasks from a change                    |
| `sdd-verify`     | Validate that implementation matches specs, design, and tasks.    | Orchestrator: verify a completed change                        |
| `sdd-archive`    | Sync delta specs to main specs and archive a completed change.    | Orchestrator: archive a change after verification              |
| `sdd-init`       | Initialize Spec-Driven Development context in any project.        | "sdd init", "iniciar sdd", "openspec init"                     |
| `branch-pr`      | PR creation workflow for Agent Teams Lite.                        | Creating a pull request, opening a PR                          |
| `issue-creation` | Issue creation workflow for Agent Teams Lite.                     | Creating a GitHub issue, reporting a bug, requesting a feature |
| `judgment-day`   | Parallel adversarial review protocol with two independent judges. | "judgment day", "dual review", "juzgar"                        |
| `react-doctor`   | Run after making React changes to catch issues early.             | After React changes, reviewing code, fixing bugs in React      |
| `skill-creator`  | Creates new AI agent skills following the Agent Skills spec.      | Creating a new skill, adding agent instructions                |
| `skill-registry` | Create or update the skill registry for the current project.      | "update skills", "skill registry", "update registry"           |

## Project Convention Files

| File                          | Role                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `AGENTS.md`                   | Agent rules: Next.js 16+ — read `node_modules/next/dist/docs/` before writing code |
| `CLAUDE.md`                   | References `@AGENTS.md`                                                            |
| `.env.example`                | Environment variable reference                                                     |
| `openspec/changes/sell-flow/` | Active change: sell-flow (proposal, spec, design, tasks)                           |
