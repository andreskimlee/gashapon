# White-label Domain Setup Guide

This guide explains how to configure white-label domains for partnership games.

## Overview

The white-label system allows partners to host their game on their own subdomain (e.g., `games.store.fun`) while using Grabbit's infrastructure. Visitors to the partner domain see:

- Custom branded header with partner logo
- Only the partner's game
- "Powered by Grabbit" footer
- Full wallet and gameplay functionality

## Architecture

```
games.store.fun (partner domain)
        │
        ▼
   Vercel CDN
        │
        ▼
  Next.js Middleware (detects domain)
        │
        ▼
  /store-fun route (white-label layout + page)
```

## Adding a New Partner Domain

### Step 1: Vercel Dashboard Configuration

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter the partner domain: `games.store.fun`
5. Vercel will provide a CNAME target (e.g., `cname.vercel-dns.com`)

### Step 2: Partner DNS Configuration

The partner needs to add a DNS record:

| Type  | Name  | Value                |
| ----- | ----- | -------------------- |
| CNAME | games | cname.vercel-dns.com |

> Note: The exact CNAME value will be shown in Vercel after adding the domain.

### Step 3: Code Configuration

1. **Update middleware.ts** - Add the domain mapping:

```typescript
const WHITELABEL_DOMAINS: Record<string, string> = {
  "games.store.fun": "store-fun",
  "games.newpartner.com": "new-partner", // Add new partner
};
```

2. **Create partner route** - Create `app/new-partner/` with:
   - `layout.tsx` - Custom header/footer with partner branding
   - `page.tsx` - Landing page showing only the partner's game

3. **Update useDomainContext.ts** - Add partner to the domain map and config.

## Existing Partners

### store.fun

- **Domain**: `games.store.fun`
- **Game ID**: 24
- **Route**: `/store-fun`
- **Brand Color**: `#4F46E5` (Indigo)

## Testing Locally

To test white-label domains locally, add an entry to your `/etc/hosts` file:

```
127.0.0.1 games.store.fun
```

Then access `http://games.store.fun:3000` in your browser.

## Files Reference

| File                        | Purpose                              |
| --------------------------- | ------------------------------------ |
| `middleware.ts`             | Domain detection and route rewriting |
| `app/store-fun/layout.tsx`  | store.fun branded layout             |
| `app/store-fun/page.tsx`    | store.fun landing page               |
| `hooks/useDomainContext.ts` | Client-side domain detection hook    |

## Troubleshooting

### Domain shows main site instead of white-label

1. Check that the domain is added in Vercel
2. Verify DNS propagation (can take up to 48 hours)
3. Check middleware.ts has the domain mapping

### SSL Certificate Issues

Vercel automatically provisions SSL certificates for added domains. This can take a few minutes after DNS propagation.

### Partner sees "Game not found"

Ensure the game ID in the partner page matches an active game in the database.
