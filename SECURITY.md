# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| latest on `main` | ✅ |
| older tags | ❌ (upgrade to latest) |

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting** (Security tab → Report a vulnerability).
Do not open a public issue with exploit details. You will get an acknowledgement
within 7 days and a fix or a mitigation plan within 30 days for confirmed issues.

## Scope

- This server is a **read-only market-data tool** (Tencent / Yahoo Finance upstreams).
  It never writes to your filesystem, executes shell commands, or requests secrets.
- The hosted Apify endpoint authenticates through the Apify platform's own token
  mechanism. This server stores no additional secrets and requires no API keys.
- Dependency health is monitored per release; report any CVE-reachability concern
  you spot in `package.json` / `package-lock.json`.

## What we will never ask for

This server never requests wallet keys, database passwords, or raw credentials of
any kind. Any "version" of it that does is not ours.
