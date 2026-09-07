# Development workflow

How changes get from an idea to alexandrugrigore.com, and why it is shaped this
way.

The short version:

```
work and commit on  dev   →  push dev  →  preview URL you can actually open
                              ↓  only when you say "deploy"
                            main  →  production
```

---

## History: what this used to protect against

The site ran on Netlify until September 2026. Netlify rebuilt the whole site on
every push to the branch it watched, each rebuild cost minutes from a monthly
allowance, and **we exhausted that allowance on 2026-09-04, which left an urgent
fix undeployable.** The workflow at the time existed almost entirely to ration
builds: branch deploys off, deploy previews off, and an `ignore` line in
`netlify.toml` that killed any build outside the production context.

That constraint is gone. Vercel's Hobby plan does not meter builds the same way,
so **the `dev` branch now gets a preview deployment** — a real URL, on real
infrastructure, that you can click through before merging. That is a safety net
this project never had, and it is the main day-to-day improvement from the move.

**The `dev` → `main` discipline stays**, for a better reason than cost: `main`
is what the public sees, and nothing should land there that has not been looked
at somewhere else first.

## What builds, and what does not

Controlled by `vercel.json` plus one dashboard setting:

| Branch | What happens | Set where |
|---|---|---|
| `main` | Deploys to **production** (`alexandrugrigore.com`) | Vercel → Settings → Git → Production Branch |
| `dev` | Deploys to a **preview URL** | Default behaviour |
| `REACT-SPA-VERSION`, `REACT-NEXT-MIGRATION` | **Never build.** Archived. | `vercel.json` → `git.deploymentEnabled` |

To stop a branch building, add it to `git.deploymentEnabled` in `vercel.json`
with `false`. Unlike Netlify's `ignore` line — which ran *after* the build had
already been queued and started — this prevents the deployment being created at
all.

---

## Day to day

```bash
# you are on dev
git add -A
git commit -m "fix(blog): ..."
git push origin dev          # → preview URL appears in the Vercel dashboard
```

Open the preview, click through what you changed. When it is right:

```bash
git checkout main
git merge dev
git push origin main         # → production
git checkout dev
```

Ten commits merged and pushed together produce **one** production deployment.

### Rolling back

Vercel → **Deployments** → find the last good one → ⋯ → **Promote to
Production**. Instant, and it does not rebuild.

This is strictly better than reverting a commit and pushing, which takes a full
build cycle. Revert the commit afterwards, at your leisure.

---

## Verify locally first

A production deployment is not expensive any more, but a broken one is still
public. Before merging to `main`:

```bash
npm run build            # must compile and prerender cleanly
npx tsc --noEmit         # must be silent
npm run check:metadata   # post-build guard, reads .next/
```

After deploying:

```bash
npm run check:crawlers   # hits the LIVE site as five crawler user agents
```

`check:metadata` inspects build output; `check:crawlers` inspects the live edge.
**Both are needed** — correct HTML that crawlers cannot reach is still broken,
and that exact failure has happened here before. See the header comments in
`scripts/check-crawler-access.mjs` for the incident it was written after.

---

## Things that can silently break the live site

Each of these produces a site that looks perfect to you, logged in, in a
browser — and is broken for everyone or everything else.

1. **Deployment Protection left on for production.**
   Vercel → Settings → Deployment Protection. If Vercel Authentication is
   enabled on production, Google and every visitor get a login wall. You will
   not notice, because your browser is authenticated. `npm run check:crawlers`
   catches this.

2. **A new image host not added to `image-hosts.json`.**
   Every remote image host must be listed there. Miss one and `next/image`
   throws, and social cards fall back to the generic default.
   `npm run check:metadata` catches this.

3. **`REVALIDATE_SECRET` drifting from the database.**
   Supabase's `trigger_revalidate()` has the token hardcoded. If the Vercel
   environment variable stops matching, content edits stop appearing on the
   public site — with no error anywhere the admin can see. Test by editing a
   post title and loading the public page in a private window.

4. **Putting anything crawlers need under `/api/`.**
   `robots.ts` disallows `/api/` for all user agents. This is why the og:image
   transformer is at `/og` and not `/api/og`. Meta's scrapers apply robots.txt
   to image fetches, so an og:image under `/api/` yields a blank card and
   flawless-looking HTML.

---

## Reference

- Migration runbook: [`docs/VERCEL-MIGRATION.md`](./VERCEL-MIGRATION.md)
- Project config: [`vercel.json`](../vercel.json) and [`vercel.README.md`](../vercel.README.md)
- Image hosts: [`image-hosts.json`](../image-hosts.json) and [`image-hosts.README.md`](../image-hosts.README.md)
- [Vercel — Git configuration](https://vercel.com/docs/project-configuration/git-configuration)
- [Vercel — Instant rollback](https://vercel.com/docs/deployments/rollback-production-deployment)
- [Vercel — Deployment protection](https://vercel.com/docs/deployment-protection)
