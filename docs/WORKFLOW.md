# Development workflow

How changes get from an idea to alexandrugrigore.com, and why it is shaped this
way.

The short version:

```
work and commit on  dev   →  push dev whenever (no build, free)
                              ↓  only when you say "deploy"
                            main  →  exactly one Netlify build
```

---

## The problem this solves

Netlify rebuilds the entire site on every push to the branch it is watching.
Each rebuild costs build minutes, and we have a monthly allowance. Working
directly on `main` meant:

- every small commit cost a full rebuild;
- half-finished or broken work cost a rebuild too;
- a five-commit afternoon cost five rebuilds to ship one change.

We hit the limit on 2026-09-04, which left an urgent fix undeployable. The
workflow below exists to make that not happen again.

## The important part: a branch alone saves nothing

This is the thing that is easy to get wrong. **By default Netlify also builds
every other branch you push, and every pull request.** Creating a `dev` branch
and pushing to it would have cost exactly as much as pushing to `main` — or
more, because a PR produces a Deploy Preview *and* a branch deploy.

So the workflow has two halves, and the Netlify half is the one that actually
saves the credits:

| Layer | What it does | Where it lives |
|---|---|---|
| **1. Netlify settings** | Stops non-production builds being queued at all | Netlify UI (one-time) |
| **2. `ignore` in `netlify.toml`** | Kills any build that starts in a non-production context | This repo |
| **3. The `dev` branch** | Lets us commit freely without touching the branch Netlify watches | Git |

Layer 1 is the saving. Layer 2 is insurance in case someone flips the toggle
back. Layer 3 is the ergonomics.

### One-time Netlify setup

In **Project configuration → Build & deploy → Continuous deployment → Branches
and deploy contexts → Configure**:

- **Production branch:** `main`
- **Branch deploys:** `None`
- **Deploy Previews:** off

Do this **before** pushing `dev` for the first time. `netlify.toml` only takes
effect once it has been deployed, so layer 2 cannot protect the very first push
of a new branch — only the UI setting can.

---

## Day to day

### 1. Work on `dev`

```bash
git switch dev
```

Commit as often as you like. Nothing here triggers a build.

```bash
git add -A
git commit -m "fix: correct the og:image aspect ratio"
```

### 2. Push `dev` when you want a backup

```bash
git push origin dev
```

Costs nothing once the Netlify settings above are in place. Worth doing at the
end of a session so the work is not only on your laptop.

### 3. Deploy — only when you say so

```bash
git switch main
git merge dev          # fast-forward: dev's commits move onto main as-is
git push origin main   # ← the one and only build
git switch dev         # go back to working
```

Ten commits merged and pushed together produce **one** build, because Netlify
builds the branch head, not each commit. That is the whole saving: batching.

### 4. After deploying

`dev` and `main` now point at the same commit, so there is nothing to sync.
Carry on committing to `dev`.

---

## Verify before you spend a build

A build is expensive now, so it is worth being confident before spending one.
All of these run locally and cost nothing:

```bash
npm run build            # does it compile and prerender?
npm run check:metadata   # OG tags, JSON-LD, image hosts in the build output
npx tsc --noEmit         # types
```

And after the deploy goes out:

```bash
npm run check:crawlers   # does the LIVE site serve real pages to WhatsApp/Google?
```

`check:crawlers` is the one that catches problems no browser will ever show
you — see the note in `netlify.toml` about the Prerender extension.

---

## Why this shape, and what it costs

The honest framing: a long-lived branch that sits parallel to `main` is
**not** what current practice recommends. GitHub Flow and trunk-based
development both push toward `main` plus *short-lived* branches, and the
long-lived `develop` branch from GitFlow is widely considered its worst part —
the constant `main` ↔ `develop` reconciliation is pure overhead.

Those objections are almost entirely about **teams**: branches drift apart,
merges become archaeology, and people integrate late. Here:

- there is one developer, so there are no competing branches to drift from;
- `dev` and `main` are identical the moment a deploy happens;
- merges are fast-forwards, so there is no reconciliation at all.

What we are really doing is trunk-based development with the *push* batched
rather than the *work*. The cost is one extra concept (`dev`) and remembering
to merge. The benefit is that build spend is decoupled from commit frequency,
which is the actual constraint.

**We deliberately do not use a branch per feature.** For a solo project that is
ceremony without a payoff — nobody is reviewing a PR, and each PR would cost a
Deploy Preview build. One working branch is the right amount of structure here.

### When to reconsider

- **A second developer joins** → switch to short-lived feature branches off
  `main` with PRs, and turn Deploy Previews back on. Review is worth the build
  minutes at that point.
- **Something risky is being tried** (a Next.js major upgrade, a redesign) →
  make a throwaway branch off `dev` for it, so `dev` stays deployable.
- **Build minutes stop being scarce** → the `ignore` line and the Netlify
  toggles can stay; they cost nothing and still prevent accidental builds.

---

## Reference

| Task | Command |
|---|---|
| Start working | `git switch dev` |
| See what is unmerged | `git log --oneline main..dev` |
| See what will deploy | `git diff main..dev --stat` |
| Back up without deploying | `git push origin dev` |
| Deploy | `git switch main && git merge dev && git push origin main && git switch dev` |
| Undo a local commit, keep changes | `git reset --soft HEAD~1` |
| Check which branch you are on | `git status -sb` |

If `git merge dev` ever reports something other than a fast-forward, it means
`main` gained a commit that `dev` does not have — most likely an edit made
directly on `main`. Get back in sync with:

```bash
git switch dev
git merge main    # bring main's commit into dev first
```

then deploy as usual.

## Sources

- [Netlify — Branch deploys](https://docs.netlify.com/deploy/deploy-types/branch-deploys/)
- [Netlify — Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/)
- [Netlify — Ignore builds](https://docs.netlify.com/build/configure-builds/ignore-builds/)
- [Netlify — Build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/)
