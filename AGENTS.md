# Agent Governance - AuditSystems

**Last Updated**: 2026-06-12
**Status**: ✅ Active

---

## 🤖 Agent Guidelines

### Preferred Agent Profiles
- **subagent_general**: Use for general development tasks requiring write access
- **subagent_explore**: Use for codebase exploration and research
- **deep-review**: Use for complex architectural decisions or security reviews
- **fast-fix**: Use for quick bug fixes and small feature additions

### Agent Working Directory
- **Base Path**: `/home/dev13/my-project/sites/live/auditsystems`
- **Allowed Directories**: `src/`, `scripts/`, `docs/`, `tests/`
- **Restricted Directories**: `.git/`, `node_modules/`, `.next/`, `dist/`

### Key Constraints
- **No Global Installs**: Use project-local dependencies only
- **Testing Required**: All changes must pass `pnpm test` and `pnpm lint`
- **Type Safety**: Must pass `pnpm typecheck`
- **Security First**: No hardcoded secrets, use environment variables
- **Performance**: Changes must not degrade audit speed significantly

---

## 🚦 Decision Rules

### When to Use `subagent_general`
- API endpoint implementation
- Database schema changes
- Worker logic modifications
- Feature implementation
- Bug fixes requiring code changes

### When to Use `subagent_explore`
- Understanding existing codebase patterns
- Researching implementation approaches
- Analyzing dependencies
- Understanding architecture

### When to Use `deep-review`
- Security-sensitive implementations
- Database schema modifications
- Performance-critical changes
- Major refactoring

### When to Use `fast-fix`
- Typo corrections
- Simple bug fixes
- Minor UI improvements
- Documentation updates

### When to Ask for Approval
- Breaking changes to existing APIs
- Database migrations that delete data
- Security-related changes
- Performance regressions >10%

---

## 📋 Execution Checklist

### Pre-Development
- [ ] Read relevant existing code
- [ ] Understand the impact on existing features
- [ ] Check for similar implementations
- [ ] Review security implications
- [ ] Consider performance impact

### During Development
- [ ] Follow existing code patterns
- [ ] Write/update tests for new functionality
- [ ] Use TypeScript strictly (no `any`)
- [ ] Consider automation implications
- [ ] Implement proper error handling

### Post-Development
- [ ] Run `pnpm lint` - must pass
- [ ] Run `pnpm typecheck` - must pass
- [ ] Run `pnpm test` - must pass
- [ ] Test manually in development environment
- [ ] Check for automation script compatibility

### Before Commit
- [ ] Write clear, conventional commit message
- [ ] Ensure changes are minimal and focused
- [ ] Check for accidentally committed files
- [ ] Verify environment variables are not committed
- [ ] Run automation scripts if affected

---

## 🔧 Common Tasks

### Adding New Audit Feature
```bash
# 1. Implement feature in src/
# 2. Add tests in __tests__/
# 3. Update documentation
# 4. Test automation scripts
# 5. Verify performance impact
```

### Database Schema Change
```bash
# 1. Modify schema in prisma/schema.prisma
# 2. Run: pnpm db:migrate
# 3. Update TypeScript types
# 4. Test in development
# 5. Verify migration scripts
```

### Automation Script Addition
```bash
# 1. Add script in src/scripts/
# 2. Update package.json scripts
# 3. Add tests for script
# 4. Test in development
# 5. Update documentation
```

---

## 🚨 Critical Rules

### NEVER
- Commit `.env` files or secrets
- Remove error handling without replacement
- Disable security features
- Commit directly to `main` branch
- Skip tests for any reason
- Use `eval()` or similar dangerous functions
- Hardcode credentials or API keys
- Ignore TypeScript errors
- Commit node_modules or build artifacts

### ALWAYS
- Use environment variables for configuration
- Write tests for new functionality
- Follow existing code patterns
- Consider automation implications
- Think about performance impact
- Document complex logic
- Handle errors gracefully
- Validate user inputs

---

## 📊 Quality Gates

### Must Pass Before Merge
- ✅ All linting rules (`pnpm lint`)
- ✅ TypeScript compilation (`pnpm typecheck`)
- ✅ Unit tests (`pnpm test`)
- ✅ No security vulnerabilities
- ✅ Performance audit passed

### Optional But Recommended
- 📊 Full test suite
- 🚀 Automation script testing
- 📈 Performance metrics
- 🔍 Security deep scan

---

## 🆘 Troubleshooting

### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Regenerate Prisma client
pnpm db:generate
```

### Test Failures
```bash
# Run tests in verbose mode
pnpm test --verbose

# Run specific test file
pnpm test path/to/test.test.ts
```

### Type Errors
```bash
# Check TypeScript configuration
cat tsconfig.json

# Generate types
pnpm db:generate

# Check for any types
pnpm typecheck
```

---

## 📚 Project-Specific Resources

### Key Files
- **Package Configuration**: `package.json`
- **TypeScript Config**: `tsconfig.json`
- **Database Schema**: `prisma/schema.prisma`
- **Environment Variables**: `.env.example`
- **Testing Config**: Vitest configuration

### Important Scripts
- **Development**: `pnpm dev`
- **Build**: `pnpm build`
- **Test**: `pnpm test`
- **Lint**: `pnpm lint`
- **Type Check**: `pnpm typecheck`
- **Database**: `pnpm db:migrate`

### Automation Scripts
- **SEO Audit**: `pnpm seo:audit`
- **Roadmap**: `pnpm roadmap:run`
- **Documentation**: `pnpm docs:generate`
- **Payment**: `pnpm payment:preflight`

### Sprint 3 Scripts
- **Seed Plans**: `pnpm plans:seed`
- **Scheduled Audits**: `pnpm scheduled:run`
- **Auth Cleanup**: `pnpm auth:cleanup`
- **Subscription Expiry**: `pnpm subscriptions:expire`
- **Deploy**: `pnpm deploy:production`
- **PM2 Start**: `pm2 start ecosystem.config.cjs`
- **Cron Setup**: `bash scripts/setup-cron.sh`

---

## 🔄 Continuous Improvement

### Regular Maintenance Tasks
- **Weekly**: Dependency updates
- **Monthly**: Security audits
- **Quarterly**: Performance reviews
- **Biannually**: Architecture review

### Agent Feedback Loop
- Report patterns that could be automated
- Suggest improvements to testing coverage
- Identify areas needing documentation
- Flag technical debt for future sprints
- Recommend tooling improvements

---

*This governance document ensures consistent, high-quality contributions while maintaining the production-readiness of the AuditSystems platform.*