# Audit System - Complete Documentation

**Project:** Audit System (Proof Engine)
**URL:** https://audit.alirezasafaeisystems.ir/
**Role:** Bottom of Funnel - Lead magnet & conversion
**Last Updated:** 2026-06-18

---

## 🎯 Project Purpose

Audit System is the **proof engine** in the three-site revenue system. It provides free automated audits as a lead magnet, demonstrates technical expertise, and converts warm leads into paying clients through upsell opportunities.

### Revenue Role
- **Stage:** Decision & Conversion (Bottom of Funnel)
- **Goal:** Convert qualified leads into paid consulting/development clients
- **Monetization:** Free audit → Paid implementation/consulting

---

## 🏗️ Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.x (strict mode)
- **Queue System:** BullMQ + Redis
- **Styling:** Tailwind CSS 3.x
- **Components:** Custom + Radix UI
- **Worker:** Background job processing
- **Testing:** Vitest + Playwright
- **Package Manager:** pnpm

### Project Structure
```
sites/live/auditsystems/
├── app/
│   ├── api/
│   │   └── audit/              # Audit submission endpoint
│   ├── results/
│   │   └── [id]/               # Audit results page
│   ├── layout.tsx
│   └── page.tsx                # Audit form homepage
├── components/
│   ├── ui/                     # Base UI components
│   ├── audit/                  # Audit-specific components
│   │   ├── AuditForm.tsx
│   │   ├── AuditResults.tsx
│   │   └── MetricsDisplay.tsx
│   └── layout/
├── lib/
│   ├── queue/                  # BullMQ queue setup
│   │   ├── audit-queue.ts
│   │   └── worker.ts
│   ├── auditors/               # Audit logic modules
│   │   ├── performance.ts
│   │   ├── security.ts
│   │   ├── seo.ts
│   │   └── accessibility.ts
│   └── utils/
├── workers/
│   └── audit-worker.ts         # Background worker process
├── public/
├── tests/
├── REVENUE_SYSTEM.md
├── DOCUMENTATION.md            # This file
└── package.json
```

---

## 🔍 Audit System Features

### Free Automated Audit Includes:

**1. Performance Analysis**
- Core Web Vitals (LCP, FID, CLS)
- Page load time
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Bundle size analysis
- Resource optimization suggestions

**2. Security Scan**
- SSL/TLS configuration
- Security headers check
- Common vulnerabilities (XSS, CSRF, etc.)
- Dependency vulnerability scan
- Authentication best practices

**3. SEO Analysis**
- Meta tags validation
- Schema markup check
- Sitemap and robots.txt
- Mobile-friendliness
- Page structure (H1-H6)
- Internal linking
- Image optimization

**4. Accessibility Check**
- WCAG 2.1 compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Alt text on images
- ARIA attributes

**5. Best Practices**
- Code quality indicators
- Modern web standards
- Browser compatibility
- Responsive design
- Error handling

---

## 🔄 Audit Flow

### User Journey

```
User submits URL on homepage
  ↓
API validates URL and creates job
  ↓
Job queued in Redis (BullMQ)
  ↓
Background worker picks up job
  ↓
Worker runs audit modules in parallel
  ↓
Results saved to database/file
  ↓
User redirected to results page
  ↓
Results displayed with recommendations
  ↓
CTA: "Want professional help? Contact us"
  ↓
User contacts → Sales opportunity
```

### Technical Flow

**1. Form Submission**
```typescript
// app/page.tsx
export default function AuditHomePage() {
  async function handleSubmit(url: string) {
    const response = await fetch('/api/audit', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    
    const { jobId } = await response.json();
    router.push(`/results/${jobId}`);
  }
  
  return <AuditForm onSubmit={handleSubmit} />;
}
```

**2. API Endpoint**
```typescript
// app/api/audit/route.ts
import { auditQueue } from '@/lib/queue/audit-queue';

export async function POST(request: Request) {
  const { url } = await request.json();
  
  // Validate URL
  if (!isValidURL(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  
  // Create audit job
  const job = await auditQueue.add('audit-website', {
    url,
    timestamp: Date.now(),
  });
  
  return NextResponse.json({ 
    jobId: job.id,
    status: 'queued'
  });
}
```

**3. Background Worker**
```typescript
// workers/audit-worker.ts
import { auditQueue } from '@/lib/queue/audit-queue';
import { performanceAudit } from '@/lib/auditors/performance';
import { securityAudit } from '@/lib/auditors/security';
import { seoAudit } from '@/lib/auditors/seo';
import { accessibilityAudit } from '@/lib/auditors/accessibility';

auditQueue.process('audit-website', async (job) => {
  const { url } = job.data;
  
  // Run audits in parallel
  const [performance, security, seo, accessibility] = await Promise.all([
    performanceAudit(url),
    securityAudit(url),
    seoAudit(url),
    accessibilityAudit(url),
  ]);
  
  const results = {
    url,
    timestamp: Date.now(),
    scores: {
      performance: calculateScore(performance),
      security: calculateScore(security),
      seo: calculateScore(seo),
      accessibility: calculateScore(accessibility),
    },
    details: { performance, security, seo, accessibility },
  };
  
  // Save results
  await saveResults(job.id, results);
  
  return results;
});
```

**4. Results Page**
```typescript
// app/results/[id]/page.tsx
export default async function ResultsPage({ params }: { params: { id: string } }) {
  const results = await getAuditResults(params.id);
  
  if (!results) {
    return <div>Audit in progress...</div>;
  }
  
  return (
    <div>
      <AuditResults data={results} />
      
      {/* Upsell CTA */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3>Need Professional Help?</h3>
        <p>Get expert assistance to fix these issues</p>
        <Button href="https://alirezasafaeisystems.ir/contact">
          Contact for Consultation
        </Button>
      </div>
    </div>
  );
}
```

---

## 📊 Queue System (BullMQ)

### Setup

```typescript
// lib/queue/audit-queue.ts
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const auditQueue = new Queue('audit-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
});
```

### Worker Configuration

```typescript
// lib/queue/worker.ts
import { Worker } from 'bullmq';
import { connection } from './audit-queue';

export const auditWorker = new Worker(
  'audit-jobs',
  async (job) => {
    // Worker logic here
    return await processAudit(job.data);
  },
  {
    connection,
    concurrency: 5, // Process 5 audits simultaneously
    limiter: {
      max: 10,      // Max 10 jobs
      duration: 60000, // Per minute
    },
  }
);

auditWorker.on('completed', (job) => {
  console.log(`Audit ${job.id} completed`);
});

auditWorker.on('failed', (job, err) => {
  console.error(`Audit ${job?.id} failed:`, err);
});
```

### Running the Worker

```bash
# Development
pnpm dev:worker

# Production (PM2)
pm2 start ecosystem.config.js --only audit-worker
```

---

## 🧪 Audit Modules

### 1. Performance Auditor

```typescript
// lib/auditors/performance.ts
export async function performanceAudit(url: string) {
  const page = await browser.newPage();
  await page.goto(url);
  
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    return {
      lcp: getLCP(),
      fid: getFID(),
      cls: getCLS(),
      ttfb: perfData.responseStart - perfData.requestStart,
      domLoad: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
    };
  });
  
  return {
    metrics,
    score: calculatePerformanceScore(metrics),
    recommendations: generateRecommendations(metrics),
  };
}
```

### 2. Security Auditor

```typescript
// lib/auditors/security.ts
export async function securityAudit(url: string) {
  const checks = {
    ssl: await checkSSL(url),
    headers: await checkSecurityHeaders(url),
    vulnerabilities: await scanVulnerabilities(url),
    mixedContent: await checkMixedContent(url),
  };
  
  return {
    checks,
    score: calculateSecurityScore(checks),
    recommendations: generateSecurityRecommendations(checks),
  };
}
```

### 3. SEO Auditor

```typescript
// lib/auditors/seo.ts
export async function seoAudit(url: string) {
  const page = await browser.newPage();
  await page.goto(url);
  
  const seoData = await page.evaluate(() => ({
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content,
    h1Tags: Array.from(document.querySelectorAll('h1')).map(h => h.textContent),
    images: Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
    })),
    internalLinks: Array.from(document.querySelectorAll('a[href^="/"]')).length,
  }));
  
  return {
    data: seoData,
    score: calculateSEOScore(seoData),
    recommendations: generateSEORecommendations(seoData),
  };
}
```

### 4. Accessibility Auditor

```typescript
// lib/auditors/accessibility.ts
import { AxePuppeteer } from '@axe-core/puppeteer';

export async function accessibilityAudit(url: string) {
  const page = await browser.newPage();
  await page.goto(url);
  
  const results = await new AxePuppeteer(page).analyze();
  
  return {
    violations: results.violations,
    passes: results.passes,
    score: calculateA11yScore(results),
    recommendations: generateA11yRecommendations(results),
  };
}
```

---

## 💰 Revenue Integration

### Upsell Strategy

**Audit Results → Paid Services**

1. **Low Score (0-50):** 
   - "Your site needs urgent attention"
   - CTA: "Get Emergency Fix Package - $1,999"

2. **Medium Score (51-75):**
   - "Several critical issues found"
   - CTA: "Get Professional Audit + Fix - $999"

3. **Good Score (76-90):**
   - "Almost perfect! Few optimizations needed"
   - CTA: "Get Performance Optimization - $499"

4. **Excellent Score (91-100):**
   - "Great job! Want to maintain this?"
   - CTA: "Monthly Maintenance Package - $299/mo"

### Conversion Tracking

```typescript
// Track when user clicks upsell CTA
import { trackEvent } from '@/shared/analytics/cross-site-tracker';

function handleUpsellClick() {
  trackEvent({
    event: 'conversion',
    source: 'auditsystems',
    conversionType: 'upsell_click',
    metadata: {
      score: auditScore,
      package: selectedPackage,
    },
  });
  
  // Redirect to portfolio contact page
  window.location.href = 'https://alirezasafaeisystems.ir/contact?ref=audit';
}
```

---

## 🚀 Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start Redis (required for queue)
redis-server

# Run development server
pnpm dev

# Run worker (separate terminal)
pnpm dev:worker

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build
```

### Environment Variables

```bash
# .env.local (development)
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_SITE_URL=http://localhost:3002
NEXT_PUBLIC_PORTFOLIO_URL=http://localhost:3001
NEXT_PUBLIC_ANALYTICS_API=http://localhost:3001/api/track

# Worker settings
WORKER_CONCURRENCY=5
AUDIT_TIMEOUT=60000

# Browser (for audits)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

```bash
# .env.production (VPS)
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_SITE_URL=https://audit.alirezasafaeisystems.ir
NEXT_PUBLIC_PORTFOLIO_URL=https://alirezasafaeisystems.ir
NEXT_PUBLIC_ANALYTICS_API=https://alirezasafaeisystems.ir/api/track

WORKER_CONCURRENCY=10
AUDIT_TIMEOUT=120000
```

---

## 📦 Deployment

### Production Deployment

```bash
# SSH to VPS
ssh user@audit.alirezasafaeisystems.ir

# Navigate to project
cd /var/www/auditsystems

# Pull latest
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Restart PM2 processes
pm2 restart audit-app
pm2 restart audit-worker

# Verify
pm2 logs audit-app --lines 50
pm2 logs audit-worker --lines 50
curl -I https://audit.alirezasafaeisystems.ir/
```

### PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'audit-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/auditsystems',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      }
    },
    {
      name: 'audit-worker',
      script: 'node',
      args: 'dist/workers/audit-worker.js',
      cwd: '/var/www/auditsystems',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        WORKER_CONCURRENCY: 10,
      }
    }
  ]
};
```

### Deployment Checklist
- ✅ Redis running and accessible
- ✅ Environment variables configured
- ✅ Puppeteer/Chromium installed
- ✅ All tests passing
- ✅ Worker process healthy
- ✅ Queue processing jobs
- ✅ Results saving correctly
- ✅ Analytics tracking working
- ✅ SSL certificate valid
- ✅ Nginx config correct

---

## 🧪 Testing

### Unit Tests

```typescript
// tests/auditors/performance.test.ts
import { describe, it, expect } from 'vitest';
import { performanceAudit } from '@/lib/auditors/performance';

describe('Performance Auditor', () => {
  it('should audit website performance', async () => {
    const result = await performanceAudit('https://example.com');
    
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('score');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
```

### Integration Tests

```typescript
// tests/api/audit.test.ts
import { describe, it, expect } from 'vitest';

describe('Audit API', () => {
  it('should create audit job', async () => {
    const response = await fetch('http://localhost:3002/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('jobId');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/audit-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete audit flow', async ({ page }) => {
  await page.goto('/');
  
  // Submit URL
  await page.fill('#url-input', 'https://example.com');
  await page.click('#submit-button');
  
  // Wait for redirect to results
  await page.waitForURL(/\/results\/.+/);
  
  // Wait for audit to complete
  await page.waitForSelector('.audit-results', { timeout: 60000 });
  
  // Verify results displayed
  await expect(page.locator('.performance-score')).toBeVisible();
  await expect(page.locator('.security-score')).toBeVisible();
  await expect(page.locator('.seo-score')).toBeVisible();
  
  // Verify upsell CTA
  await expect(page.locator('[data-upsell-cta]')).toBeVisible();
});
```

---

## 🐛 Common Issues

### Issue: Worker not processing jobs
**Solution:**
```bash
# Check Redis connection
redis-cli ping

# Check worker logs
pm2 logs audit-worker

# Restart worker
pm2 restart audit-worker
```

### Issue: Puppeteer fails to launch
**Solution:**
```bash
# Install Chromium dependencies
sudo apt-get install -y chromium-browser

# Or use system Chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### Issue: Audit takes too long
**Solution:**
- Increase timeout in worker config
- Optimize audit modules
- Use caching for repeat audits
- Scale horizontally (more workers)

---

## 📚 Related Documentation

- **[REVENUE_SYSTEM.md](./REVENUE_SYSTEM.md)** - Revenue integration
- **[../../.agents/CONTEXT.md](../../.agents/CONTEXT.md)** - Project context
- **[../../docs/backend/worker-queues.md](../../docs/backend/worker-queues.md)** - Queue system docs
- **[../../docs/roadmaps/30-day-mvp.md](../../docs/roadmaps/30-day-mvp.md)** - Roadmap

---

## 🎯 Current Sprint

### Week 1 (Current)
- [x] Basic audit system working
- [x] BullMQ queue setup
- [x] Background worker
- [ ] Analytics integration
- [ ] Upsell CTA refinement

### Week 2-4 (Upcoming)
- [ ] Enhanced audit modules
- [ ] Caching system
- [ ] Email reports
- [ ] Premium detailed reports (paid feature)
- [ ] API for third-party integrations

---

**Document Version:** 1.0.0
**Last Updated:** 2026-06-18
**Next Review:** 2026-06-25
**Maintained By:** Alireza Safaei + AI Agents
