# AuditSystems

**Technical SEO and Website Audit Platform**

An automated SEO auditing platform that provides comprehensive website analysis, performance monitoring, and actionable insights for technical optimization.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## 📋 Project Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest for unit tests
- **Automation**: Custom automation scripts
- **Deployment**: VPS-hosted with manual deployment

### Core Features
- **SEO Auditing**: Automated technical SEO analysis
- **Performance Monitoring**: Lighthouse integration
- **Content Analysis**: Content quality assessment
- **Competitor Analysis**: Competitive benchmarking
- **Reporting**: Automated PDF report generation
- **Worker System**: Background job processing

### Deployment Status
- **Production**: https://audit.alirezasafaeisystems.ir
- **Environment**: Production VPS
- **Status**: ✅ Live and operational
- **Last Deploy**: June 2026

## 🏗️ Architecture

### Project Structure
```
auditsystems/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/      # React components
│   ├── scripts/         # Automation scripts
│   ├── worker/          # Background job processor
│   └── __tests__/       # Test files
├── prisma/             # Database schema
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

### Key Technologies
- **Next.js 15**: React framework with App Router
- **Prisma**: Type-safe ORM for PostgreSQL
- **Cheerio**: Web scraping and HTML parsing
- **PDF-lib**: PDF report generation
- **Vitest**: Testing framework
- **Custom Worker**: Background job processing

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 🔧 Automation Scripts

```bash
# Roadmap automation
pnpm roadmap:run
pnpm roadmap:dry

# SEO audit automation
pnpm seo:audit
pnpm seo:audit:dry

# Documentation generation
pnpm docs:generate
pnpm docs:refresh

# Payment system testing
pnpm payment:preflight
pnpm payment:zarinpal:smoke

# Deployment checks
pnpm deploy:check:hosting
pnpm deploy:readiness
```

## 📊 Key Features

### SEO Auditing
- **Technical Analysis**: Server response, redirects, canonicals
- **Performance Metrics**: Page speed, Core Web Vitals
- **Content Quality**: Duplicate content, thin content detection
- **Accessibility**: WCAG compliance checking
- **Mobile Optimization**: Mobile-friendliness analysis

### Automation System
- **Roadmap Automation**: Task scheduling and execution
- **SEO Audit Automation**: Scheduled website audits
- **Documentation Automation**: Auto-generate documentation
- **Network Baseline**: Network performance monitoring

### Reporting
- **PDF Generation**: Professional PDF reports
- **Custom Templates**: Branded report templates
- **Automated Delivery**: Scheduled report delivery
- **Data Export**: CSV/JSON export options

## 🌐 Live URLs

- **Main Application**: https://audit.alirezasafaeisystems.ir
- **API Endpoints**: Various internal APIs
- **Admin Dashboard**: Internal admin interface

## 🔧 Development Scripts

```bash
# Database operations
pnpm db:migrate
pnpm db:studio

# Worker management
pnpm worker:dev

# Job management
pnpm jobs:enqueue:sample

# Full automation
pnpm automation:run

# Smoke tests
pnpm smoke:audit-flow
```

## 📈 Performance Metrics

- **Audit Speed**: <30 seconds per page
- **Report Generation**: <10 seconds
- **Database Queries**: Optimized with indexing
- **Background Processing**: Efficient worker system
- **API Response Time**: <200ms average

## 🔒 Security Features

- Input validation and sanitization
- SQL injection prevention (Prisma)
- Rate limiting on API endpoints
- Secure file handling
- Environment-based configuration
- Regular security audits

## 🎯 Use Cases

### For SEO Professionals
- Comprehensive technical SEO audits
- Competitive analysis
- Performance monitoring
- Report generation for clients

### For Website Owners
- Identify technical issues
- Monitor performance over time
- Track SEO improvements
- Generate actionable insights

### For Agencies
- Bulk auditing capabilities
- White-label reporting
- Client management
- Automated workflows

## 🔮 Future Roadmap

### Phase 1 (Current)
- [x] Enhanced reporting features
- [x] Additional audit categories
- [x] Improved user interface
- [x] Performance optimizations

### Phase 2 (Planned)
- [x] Multi-language support
- [ ] Mobile application
- [ ] API platform for developers
- [ ] Advanced analytics

### Phase 3 (Future)
- [ ] Machine learning insights
- [ ] Real-time monitoring
- [ ] Integration with popular CMSs
- [ ] Enterprise features

## 🤝 Contributing

This is a commercial product. For licensing and partnership inquiries, please contact the maintainer.

## 📄 License

Proprietary - All rights reserved

## 👤 Author

**Alireza Safaei**
- Website: https://alirezasafaeisystems.ir
- GitHub: [@alirezasafaei-dev](https://github.com/alirezasafaei-dev)

---

**Professional SEO auditing platform for modern websites.**