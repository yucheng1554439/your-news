# Runbooks

Operational playbooks for Your News production incidents.

| Runbook | When to use |
|---------|-------------|
| [redis-down.md](./redis-down.md) | Persistence errors, empty dashboard |
| [clerk-down.md](./clerk-down.md) | Auth failures, 401 spikes |
| [refresh-failure.md](./refresh-failure.md) | Intelligence refresh errors |
| [briefing-generation-failure.md](./briefing-generation-failure.md) | Stale or empty briefings |
| [app-store-build-failure.md](./app-store-build-failure.md) | EAS build/submit failures |
| [mobile-api-failure.md](./mobile-api-failure.md) | Mobile cannot load data |
| [vercel-failure.md](./vercel-failure.md) | Web/API outage |

**Escalation:** On-call engineer → platform lead → rotate secrets if breach suspected.
