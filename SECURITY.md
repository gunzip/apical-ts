# Security Policy

## Supported Versions

We actively support the following versions of @apical-ts/craft with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in @apical-ts/craft, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. **Do NOT** disclose the vulnerability publicly until it has been addressed

Instead, please report security vulnerabilities by:

1. **Email**: Send details to the maintainer at [gunzip's GitHub profile](https://github.com/gunzip)
2. **GitHub Security Advisories**: Use GitHub's [security advisory feature](https://github.com/gunzip/apical-ts/security/advisories/new) for this repository

### What to Include

Please include the following information in your security report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes or mitigations
- Your contact information for follow-up questions

### Response Timeline

- **Initial Response**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will provide an initial assessment within 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will coordinate responsible disclosure after fixes are available

### Security Best Practices for Users

When using @apical-ts/craft:

1. **Keep Dependencies Updated**: Regularly update to the latest version
2. **Review Generated Code**: Always review generated client code before using in production
3. **Validate Inputs**: Ensure OpenAPI specifications are from trusted sources
4. **Secure Secrets**: Never commit API keys or secrets to version control
5. **Use HTTPS**: Always use HTTPS for API communications in generated clients

### Security Features

@apical-ts/craft includes security-conscious features:

- **Input Validation**: Generated Zod schemas provide runtime validation
- **Type Safety**: Full TypeScript typing prevents many common vulnerabilities
- **Secure Headers**: Proper handling of authentication headers in generated clients
- **No Arbitrary Code Execution**: The generator only processes OpenAPI specifications

### Dependencies Security

We use:

- **Dependabot**: Automated dependency updates for known vulnerabilities
- **CodeQL**: Static analysis for security issues
- **npm audit**: Regular auditing of dependency vulnerabilities

### Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors who help improve our security will be acknowledged in our release notes (with their permission).

## Questions?

If you have questions about this security policy, please create a [GitHub Discussion](https://github.com/gunzip/apical-ts/discussions) or contact the maintainers.