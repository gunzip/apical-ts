# Repository Security Configuration

This document outlines the recommended security configurations for the
@apical-ts/apical-ts repository.

## Branch Protection Rules

### Main Branch Protection

The `main` branch should be protected with the following settings:

#### Required Status Checks

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Required checks:
  - `test` (from test.yml workflow)
  - `CodeQL` (from codeql.yml workflow)
  - `dependency-scan` (from security.yml workflow)

#### Pull Request Requirements

- ✅ Require a pull request before merging
- ✅ Require at least 1 review from code owners
- ✅ Dismiss stale PR reviews when new commits are pushed
- ✅ Require review from CODEOWNERS
- ✅ Restrict pushes that create files larger than 100MB

#### Additional Protections

- ✅ Restrict deletions
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**
- ✅ Include administrators in these restrictions

### Development Branch Patterns

For feature branches (`feature/*`, `fix/*`, `security/*`):

- No specific protection required
- Will be covered by PR requirements to merge to main

## Repository Security Settings

### General Settings

- ✅ Private vulnerability reporting: **Enabled**
- ✅ Dependency graph: **Enabled**
- ✅ Dependabot alerts: **Enabled**
- ✅ Dependabot security updates: **Enabled**
- ✅ Code scanning alerts: **Enabled**

### Secret Scanning

- ✅ Secret scanning: **Enabled**
- ✅ Secret scanning for partner patterns: **Enabled**
- ✅ Push protection: **Enabled**

### Actions Permissions

- ✅ Actions permissions: **Allow actions created by GitHub, and select
  non-GitHub actions**
- ✅ Allow actions created by GitHub: **Enabled**
- ✅ Allow Marketplace actions by verified creators: **Enabled**
- ✅ Allow specified actions and reusable workflows
- ✅ Fork pull request workflows: **Require approval for first-time
  contributors**

## Secrets Management

### Repository Secrets

- `NPM_TOKEN`: Used for publishing to npm registry
  - Should be a granular access token with minimal permissions
  - Only needs publish access to @apical-ts/craft package
  - Should be rotated regularly (every 90 days recommended)

### Environment Secrets

Consider using environment-specific secrets for different deployment targets.

## Automated Security Measures

### Dependabot Configuration

- Located in `.github/dependabot.yml`
- Weekly dependency updates
- Grouped updates for development dependencies
- Automatic security patches

### CodeQL Scanning

- Located in `.github/workflows/codeql.yml`
- Runs on push to main, PRs, and weekly schedule
- Analyzes JavaScript/TypeScript code
- Results available in Security tab

### Security Workflow

- Located in `.github/workflows/security.yml`
- Dependency vulnerability scanning
- License compliance checking
- Weekly scheduled runs

## Security Contacts

- **Primary**: Repository owner/maintainer
- **Security Policy**: See `SECURITY.md` for vulnerability reporting
- **Emergency**: Use GitHub Security Advisories for critical issues

## Compliance and Auditing

### Regular Security Tasks

- [ ] Monthly review of dependency updates
- [ ] Quarterly secret rotation
- [ ] Annual security configuration review
- [ ] Review and update security contacts

### Audit Trail

- All security-related changes tracked in git history
- Security scan results archived as workflow artifacts
- Dependabot updates create audit trail via PRs

## Implementation Checklist

### Repository Administrator Tasks

- [ ] Enable branch protection rules for main branch
- [ ] Configure repository security settings
- [ ] Set up required status checks
- [ ] Add CODEOWNERS file if not present
- [ ] Verify secret scanning is enabled
- [ ] Review and update NPM_TOKEN permissions

### Team Tasks

- [ ] Review security policy and procedures
- [ ] Set up security notification preferences
- [ ] Understand vulnerability reporting process
- [ ] Configure IDE security plugins if applicable

## Resources

- [GitHub Security Documentation](https://docs.github.com/en/code-security)
- [npm Security Best Practices](https://docs.npmjs.com/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Note**: This configuration assumes a public repository. For private
repositories, some settings may need adjustment.
