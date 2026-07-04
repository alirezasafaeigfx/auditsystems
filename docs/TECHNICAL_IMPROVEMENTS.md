# Technical Improvements Documentation

**Last Updated**: 2026-07-04  
**Version**: 2.0.0

This document provides comprehensive technical documentation for improvements made to AuditSystems, including security, performance, SaaS layer, and developer experience.

---

## Table of Contents

1. [Dependency Updates](#dependency-updates)
2. [Testing Enhancements](#testing-enhancements)
3. [PDF Generation Improvements](#pdf-generation-improvements)
4. [CSRF Protection](#csrf-protection)
5. [Core Web Vitals Integration](#core-web-vitals-integration)
6. [Advanced Structured Data](#advanced-structured-data)
7. [Lazy Loading Implementation](#lazy-loading-implementation)
8. [Dark/Light Mode Toggle](#darklight-mode-toggle)
9. [Accessibility Enhancements](#accessibility-enhancements)
10. [SaaS Foundation (Sprint 1)](#saas-foundation-sprint-1)
11. [Dashboard & Billing (Sprint 2)](#dashboard-billing-sprint-2)
12. [Security Hardening](#security-hardening)
13. [Developer Experience](#developer-experience)

---

## Dependency Updates

### Overview
Updated all major dependencies to their latest stable versions to ensure security patches, performance improvements, and access to new features.

### Changes Made

- **Next.js**: 15.5.18 → 16.2.9
- **React**: 19.2.6 → 19.2.7
- **React DOM**: 19.2.6 → 19.2.7
- **Prisma**: 6.19.3 → 7.8.0
- **Vitest**: 2.1.9 → 4.1.9
- **Vite**: Latest → 8.0.16
- **TypeScript**: 5.9.3 → 6.0.3
- **ESLint**: 9.39.4 → 10.5.0

### Security Improvements
- Resolved critical and high-severity vulnerabilities in dependencies
- Updated build tools to address security advisories
- Enhanced development environment security

### Migration Notes
- Review breaking changes in Next.js 16 if custom configurations exist
- Update any deprecated TypeScript syntax
- Test all database migrations with new Prisma version

---

## Testing Enhancements

### Unit Test Expansion

#### URL Normalization Tests
Enhanced test coverage for `normalizeAuditTargetUrl` function with additional edge cases:

- IPv6 address handling
- International domain names (IDN/Punycode)
- Multiple tracking parameter stripping
- Query parameter sorting
- Complex path normalization
- Internal network domain blocking
- Port normalization
- Hostname validation

#### Audit Rules Tests
Expanded test suite for `evaluateAuditRules` function:

- reCAPTCHA dependency detection
- Non-fingerprinted static assets detection
- Request-heavy page identification
- SEO basics validation
- Slow server response detection
- Empty alt text image analysis
- HSTS header validation (HTTPS only)
- Form input label validation
- Structured data validation
- Core Web Vitals proxy checks
- Lazy loading implementation detection

### Integration Tests
Created integration test framework for API endpoints:

- **POST /api/audit/runs**: URL validation, rate limiting, SSRF protection
- **POST /api/orders**: Token validation, email validation, order creation
- **POST /api/reports/[token]/unlock**: Token validation, access control
- **GET /api/reports/[token]**: Token validation, access control
- Security headers validation
- Cache control verification

### Test Coverage Goals
- Unit tests: >90% coverage for critical functions
- Integration tests: All major API endpoints
- E2E tests: Critical user journeys

---

## PDF Generation Improvements

### RTL/BIDI Support
Enhanced PDF generation to support right-to-left languages (Persian, Arabic) using bidi-js library.

### Implementation Details

#### Before
```typescript
// Basic RTL support with right margin
const isRtl = input.locale === "fa" || input.locale === "ar";
const margin = isRtl ? 515 : 40;
```

#### After
```typescript
// Enhanced RTL with bidi algorithm
import { bidi } from "bidi-js";

function applyBidi(text: string): string {
  if (!isRtl) return text;
  
  try {
    const bidiText = bidi(text, {
      direction: isRtl ? "rtl" : "ltr",
      baseDirection: isRtl ? "rtl" : "ltr"
    });
    return bidiText;
  } catch (error) {
    console.warn("BIDI processing failed, using original text:", error);
    return text;
  }
}
```

### Features
- **Bidirectional Text Processing**: Proper shaping of RTL text
- **Character-based Wrapping**: Improved text wrapping for RTL languages
- **Fallback Mechanism**: Graceful degradation on bidi processing failures
- **Multi-language Support**: Persian, Arabic, and other RTL languages

### Testing
Added comprehensive tests for RTL text processing:
- Persian text rendering
- Arabic text rendering
- Mixed LTR/RTL content
- Long text wrapping in RTL

---

## CSRF Protection

### Implementation
Implemented comprehensive CSRF (Cross-Site Request Forgery) protection for all state-changing API endpoints.

### CSRF Token System

#### Token Generation
```typescript
export function generateCSRFToken(options: CSRFProtectionOptions = {}): string {
  const opts = { ...DEFAULT_CSRF_OPTIONS, ...options };
  const timestamp = Date.now();
  const randomString = randomBytes(32).toString("hex");
  
  const tokenData = `${timestamp}:${randomString}`;
  const signature = createHash("sha256")
    .update(tokenData + opts.secret)
    .digest("hex");
  
  return Buffer.from(`${tokenData}:${signature}`).toString("base64");
}
```

#### Token Verification
```typescript
export function verifyCSRFToken(token: string, options: CSRFProtectionOptions = {}): boolean {
  // Decode and validate token structure
  // Verify signature
  // Check expiration
  // Return validity status
}
```

### Protected Endpoints
- **POST /api/audit/runs**: Audit run creation
- **POST /api/orders**: Payment order creation
- **POST /api/reports/[token]/unlock**: Report unlock requests

### Integration
```typescript
// In API route handlers
const csrfCheck = await csrfProtection(request);
if (!csrfCheck.valid) {
  return respondJson(
    { error: "FORBIDDEN", requestId, details: csrfCheck.error },
    requestId,
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}
```

### Configuration
Environment variables:
- `CSRF_SECRET`: Secret key for token signing (required in production)
- `CSRF_EXPIRES_IN`: Token expiration time in seconds (default: 3600)

### Security Features
- Double-submit cookie pattern
- Timestamp-based expiration
- Cryptographic signature verification
- Configurable token lifetime

---

## Core Web Vitals Integration

### Overview
Added Core Web Vitals proxy checks to the audit system to estimate performance metrics based on server-side analysis.

### Implementation

#### LCP (Largest Contentful Paint) Proxy
```typescript
if (responseTime > 2000 && resourceCount > 50) {
  findings.push({
    code: "CWV_LCP_POOR_PROXY",
    category: "PERFORMANCE",
    severity: "HIGH",
    title: "Core Web Vitals: Likely poor Largest Contentful Paint (LCP)",
    recommendation: "Optimize LCP by preloading critical resources, using CDN, optimizing images, and reducing server response time."
  });
}
```

#### FID (First Input Delay) Proxy
```typescript
const blockingScripts = ctx.resources.filter(
  (r) => r.kind === "script" && r.isThirdParty && r.inHead && 
         r.attrs?.async !== true && r.attrs?.defer !== true
);

if (blockingScripts.length > 3) {
  findings.push({
    code: "CWV_FID_POOR_PROXY",
    title: "Core Web Vitals: Likely poor First Input Delay (FID)",
    recommendation: "Reduce JavaScript execution time, defer non-critical JS, and use code splitting."
  });
}
```

#### CLS (Cumulative Layout Shift) Proxy
```typescript
const imagesWithoutDimensions = ctx.resources.filter(
  (r) => r.kind === "image" && (!r.attrs?.width || !r.attrs?.height)
);

if (imagesWithoutDimensions.length > 5) {
  findings.push({
    code: "CWV_CLS_POOR_PROXY",
    title: "Core Web Vitals: Likely poor Cumulative Layout Shift (CLS)",
    recommendation: "Specify width and height for all images, reserve space for dynamic content."
  });
}
```

### Metrics Covered
- **LCP**: Largest Contentful Paint (loading performance)
- **FID**: First Input Delay (interactivity)
- **CLS**: Cumulative Layout Shift (visual stability)

### Limitations
Since these are server-side proxy metrics, they provide estimates rather than exact Core Web Vitals measurements. For accurate measurements, recommend using:
- Lighthouse
- PageSpeed Insights
- Real User Monitoring (RUM)

---

## Advanced Structured Data

### Enhanced Schema.org Validation
Improved structured data analysis with detailed validation and recommendations.

### Features

#### Schema Type Detection
```typescript
const recommendedTypes = ["WebSite", "Organization", "WebPage", "Article", "BreadcrumbList"];
const hasRecommended = uniqueTypes.some((type) => recommendedTypes.includes(type));
```

#### Type-Specific Validation
Validates required properties for common Schema.org types:
- **WebSite**: name or url
- **Organization**: name or url
- **WebPage**: url
- **Article/BlogPosting**: headline, datePublished
- **BreadcrumbList**: itemListElement array
- **Product**: name, offers or price

#### Error and Warning Reporting
```typescript
if (errors.length > 0) {
  findings.push({
    code: "SCHEMA_ORG_ERRORS",
    severity: "MEDIUM",
    title: "Schema.org structured data has errors",
    details: { errors }
  });
}
```

### New Finding Codes
- `SCHEMA_ORG_PRESENT`: Structured data detected
- `SCHEMA_ORG_NO_RECOMMENDED_TYPES`: Missing recommended types
- `SCHEMA_ORG_ERRORS`: Validation errors
- `SCHEMA_ORG_WARNINGS`: Optimization opportunities

### Recommendations
- Add WebSite schema for sitelinks search
- Add Organization schema for knowledge panel
- Add BreadcrumbList schema for navigation
- Fix JSON syntax errors
- Complete required properties for each type

---

## Lazy Loading Implementation

### Native Lazy Loading Detection
Added checks for native lazy loading implementation on images and iframes.

### Implementation

#### Image Lazy Loading Check
```typescript
const imagesWithoutLazy = images.filter(function() {
  const $img = $(this);
  const loading = $img.attr("loading");
  const isAboveFold = $img.closest("header, hero, .hero, #hero, [role='banner']").length > 0;
  
  // Skip above-fold images for lazy loading recommendation
  if (isAboveFold) return false;
  
  return loading !== "lazy";
});
```

#### Iframe Lazy Loading Check
```typescript
const isEmbedContent = /youtube|vimeo|dailymotion|soundcloud|spotify|twitter|facebook|instagram/i.test(src);
if (isEmbedContent && loading !== "lazy") {
  return true;
}
```

#### Script Loading Optimization
```typescript
const scriptsWithoutAsyncDefer = scriptsInBody.filter(function() {
  const $script = $(this);
  const async = $script.attr("async");
  const defer = $script.attr("defer");
  const type = $script.attr("type");
  
  if (async || defer || type === "module") return false;
  return true;
});
```

### New Finding Codes
- `IMAGES_MISSING_LAZY_LOADING`: Below-fold images need lazy loading
- `IFRAMES_MISSING_LAZY_LOADING`: Embed iframes need lazy loading
- `SCRIPTS_MISSING_ASYNC_DEFER`: Scripts need async/defer attributes
- `LAZY_LOADING_IMPLEMENTED`: Good lazy loading implementation

### Best Practices
- Use `loading="lazy"` for below-fold images
- Use `loading="lazy"` for embed iframes (YouTube, Vimeo, etc.)
- Add `async` or `defer` to non-critical scripts
- Skip lazy loading for above-fold content

---

## Dark/Light Mode Toggle

### Implementation
Added comprehensive dark/light mode toggle with system preference detection.

### Components

#### ThemeProvider
```typescript
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    let resolvedTheme: "light" | "dark";
    if (theme === "system") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolvedTheme = theme;
    }
    
    setEffectiveTheme(resolvedTheme);
    
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

#### ThemeToggle Component
```typescript
export default function ThemeToggle() {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button onClick={cycleTheme} aria-label={`Toggle theme, current: ${getThemeLabel()}`}>
      {getThemeIcon()}
    </button>
  );
}
```

### CSS Variables
```css
.dark {
  --bg: #0d1715;
  --surface: #12211f;
  --surface-soft: #162a27;
  --surface-strong: #1b322f;
  --text: #e9f7f3;
  --muted: #9fc1b9;
  --brand: #2fa88f;
  /* ... more variables */
}
```

### Features
- **System Preference**: Respects user's system theme preference
- **Manual Override**: Users can manually select light/dark mode
- **Persistence**: Theme preference saved in localStorage
- **Smooth Transitions**: CSS-based theme transitions
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Integration
- Added to main layout navigation
- Wrapped application with ThemeProvider
- Updated CSS for class-based dark mode
- Added theme toggle button with icons

---

## Accessibility Enhancements

### Existing Accessibility Features
The application already follows strong accessibility practices:

#### Form Labels
```typescript
<label htmlFor="username">Username</label>
<input id="username" type="text" />
```

#### ARIA Live Regions
```typescript
<p role="status" aria-live="polite">
  {message || "هنوز درخواستی ثبت نشده است."}
```

#### Semantic HTML
- Proper heading hierarchy
- Semantic elements (header, nav, main, footer)
- Alt text for images (enforced by audit rules)

### Audit Rule Accessibility Checks
The audit system includes comprehensive accessibility checks:

#### Image Accessibility
```typescript
const imagesWithoutAlt = $("img:not([alt])").length;
if (imagesWithoutAlt > 0) {
  findings.push({
    code: "IMG_MISSING_ALT",
    title: "Images missing alt text",
    severity: "MEDIUM"
  });
}
```

#### Form Accessibility
```typescript
const inputsWithoutLabels = $("input:not([aria-label]):not([placeholder])").filter(function() {
  const id = $(this).attr("id");
  return !id || $(`label[for="${id}"]`).length === 0;
}).length;
```

#### Skip Links
```css
.skip-link {
  position: absolute;
  top: 0;
  transform: translateY(-120%);
  z-index: 160;
  background: var(--brand);
  color: #fff;
}

.skip-link:focus {
  transform: translateY(0);
}
```

### Accessibility Improvements Made
- **Theme Toggle**: Proper ARIA labels and keyboard navigation
- **Status Updates**: ARIA live regions for dynamic content
- **Form Validation**: Clear error messages with proper semantics
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Focus Indicators**: Visible focus states for all interactive elements

---

## Security Considerations

### CSRF Protection
- All state-changing API endpoints protected
- Token-based validation with expiration
- Configurable secret key for production

### Dependency Security
- Regular dependency updates
- Vulnerability scanning
- Security advisory monitoring

### SSRF Protection
- DNS lookup validation
- Private IP blocking
- Hostname structure validation
- Internal network prevention

### Rate Limiting
- Distributed rate limiting
- Database fallback
- Configurable limits per endpoint

---

## Performance Optimizations

### Lazy Loading
- Native browser lazy loading
- Above-fold content detection
- Embed content optimization
- Script loading optimization

### Core Web Vitals
- Server-side proxy metrics
- Performance recommendations
- Resource optimization suggestions
- Loading strategy analysis

### Asset Optimization
- Font preloading
- Critical CSS inlining
- Image optimization recommendations
- Script deferring strategies

---

## Monitoring and Observability

### Logging
- Structured error logging
- Request tracking with request IDs
- Security event logging
- Performance metrics collection

### Analytics
- SEO event tracking
- User journey analytics
- Conversion funnel monitoring
- Real User Monitoring (RUM)

---

## Deployment Considerations

### Environment Variables
```bash
# CSRF Protection
CSRF_SECRET=your-secret-key-here
CSRF_EXPIRES_IN=3600

# DNS Protection
AUDIT_DNS_GUARD=true
AUDIT_DNS_FAIL_OPEN=true

# Rate Limiting
REDIS_URL=redis://localhost:6379
# Alternative: Use database fallback
```

### Database Migrations
```bash
pnpm db:migrate
```

### Build Process
```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

---

## Future Improvements

### Planned Enhancements
1. **Real Core Web Vitals**: Integration with RUM for actual CWV measurement
2. **Advanced PDF Features**: More sophisticated RTL shaping and layout
3. **Additional Schema Types**: Expand structured data validation
4. **Performance Budgets**: Implement resource budget constraints
5. **A/B Testing Framework**: For optimization experiments

### Monitoring Goals
- **Error Rate**: <0.1% for critical endpoints
- **Response Time**: <200ms for API endpoints
- **Uptime**: >99.9% availability
- **Test Coverage**: >90% for critical functions

---

## Contributing

### Development Workflow
1. Create feature branch
2. Make changes with tests
3. Run `pnpm check` (lint, typecheck, test, build)
4. Submit pull request
5. Ensure CI/CD pipeline passes

### Code Review Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Accessibility validated
- [ ] No breaking changes (unless intended)

---

## Support and Maintenance

### Issue Reporting
Report issues via GitHub with:
- Environment details
- Reproduction steps
- Expected vs actual behavior
- Error logs and stack traces

### Maintenance Schedule
- **Weekly**: Dependency updates
- **Monthly**: Security audits
- **Quarterly**: Performance reviews
- **Biannually**: Architecture review

---

## SaaS Foundation (Sprint 1)

**Date**: 2026-07-04  
**PR**: #4 (merged)

### Database Models Added

| Model | Purpose | Key Fields |
|---|---|---|
| User | Account management | email (unique), passwordHash, name |
| Organization | Workspace/tenant | name, slug (unique) |
| Membership | User-org association | userId, organizationId, role |
| Session | Auth sessions | token (unique), expiresAt, userId |
| Project | Website tracking | organizationId, name, domain, normalizedUrl |

### API Routes Added

| Route | Method | Purpose | Auth Required |
|---|---|---|---|
| /api/auth/signup | POST | Create account | No |
| /api/auth/login | POST | Authenticate | No |
| /api/auth/logout | POST | End session | Yes (CSRF) |
| /api/auth/me | GET | Current user | Yes |
| /api/csrf | GET | CSRF token | No |
| /api/projects | POST | Create project | Yes (CSRF) |
| /api/projects/[id]/audit | POST | Run audit | Yes (CSRF) |

### Security Features
- scrypt password hashing with random salt
- httpOnly session cookies (secure in production)
- CSRF double-submit cookie pattern
- Organization ownership enforcement on all routes
- Generic login errors (no email enumeration)

---

## Dashboard & Billing (Sprint 2)

**Date**: 2026-07-04  
**PRs**: #6, #7, #8, #9 (merged)

### Dashboard Improvements
- Usage stats cards (projects, audits, remaining)
- Latest audit status indicator
- Upgrade CTAs when limits reached
- Better empty states
- Billing link in navigation

### New Pages
- `/app/billing` — Plan comparison and upgrade CTA
- `/app/projects/[id]/audits/[runId]` — Audit detail with findings by severity

### Centralized Plans
```typescript
// src/lib/plans.ts
PLANS.free: { projectLimit: 1, monthlyAuditLimit: 3 }
PLANS.starter: { projectLimit: 3, monthlyAuditLimit: 20 }
PLANS.pro: { projectLimit: 10, monthlyAuditLimit: 100 }
```

### Operations
- Backup/rollback documentation
- Post-deploy smoke checklist
- Automated smoke test script
- Session/job cleanup helpers

---

## Security Hardening

**Date**: 2026-07-04  
**PR**: #8 (merged)

### Auth Rate Limiting
- In-memory rate limiter (15 min window)
- 10 attempts per email per window
- Independent per email address
- Applied to login and signup routes

### Password Validation
- Minimum 8 characters
- Maximum 128 characters
- Must contain uppercase, lowercase, and number
- Centralized validation helper

### Session Cleanup
- Expired sessions removed after 30 days
- Stale jobs removed after 7 days
- Script: `pnpm cleanup`

---

## Developer Experience

**Date**: 2026-07-04  
**PR**: #9 (merged)

### New Commands
| Command | Purpose |
|---|---|
| `pnpm dev:check` | Fast lint/typecheck/test loop |
| `pnpm smoke:routes` | Check public route health |
| `pnpm cleanup` | Remove expired sessions/jobs |
| `pnpm test:coverage` | Generate coverage report |

### Documentation
- CONTRIBUTING.md with dev setup guide
- Improved .env.example organization
- Vitest coverage configuration

### Test Coverage
- 278 tests (up from 210 in Sprint 1)
- 31 test files covering all lib modules
- Coverage for CSRF, auth, plans, usage, cleanup, rate limiting