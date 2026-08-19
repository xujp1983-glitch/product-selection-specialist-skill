# Product Selection Specialist Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a portable, privacy-safe, installable product-selection methodology skill on GitHub.

**Architecture:** Keep the agent workflow in `SKILL.md`, move detailed behavior into focused references, and define generic browser/storage adapter capabilities instead of private commands. A standard-library validator checks structure, evaluation data, and forbidden private strings before release.

**Tech Stack:** Markdown, JSON, Python 3 standard library, Git, GitHub CLI.

## Global Constraints

- Publish only the discovery methodology skill.
- Do not publish private automation source code, credentials, selectors, server details, browser profiles, or Feishu identifiers.
- Keep product links and content links as separate evidence fields.
- Stop before verification, scoring, or business actions.
- Use the MIT License.

---

### Task 1: Build The Portable Skill Package

**Files:**
- Create: `SKILL.md`
- Create: `README.md`
- Create: `references/workflow.md`
- Create: `references/adapter-contract.md`
- Create: `references/failure-handling.md`
- Create: `evals/evals.json`
- Create: `LICENSE`

**Interfaces:**
- Consumes: ranking rows supplied by a browser or data adapter.
- Produces: a complete user list or validated rows passed to an optional storage adapter.

- [ ] **Step 1: Write the portable workflow and adapter contract**

Describe identity verification, ranking-date validation, explicit filtering, link separation, full-result behavior, storage handoff, and stop boundaries without private commands.

- [ ] **Step 2: Add installation and usage documentation**

Document clone/copy installation for Codex-compatible agent skill directories and include Chinese invocation examples.

- [ ] **Step 3: Add evaluation prompts**

Include prompts covering stale rankings, exact publication dates, newly-ranked semantics, full results, link ambiguity, and unsupported adapters.

- [ ] **Step 4: Commit the package**

```bash
git add SKILL.md README.md references evals LICENSE
git commit -m "feat: publish portable product selection skill"
```

### Task 2: Validate And Publish

**Files:**
- Create: `scripts/validate_skill.py`
- Create: `.gitignore`

**Interfaces:**
- Consumes: repository root path.
- Produces: exit code `0` with `validation passed`, or a non-zero exit with actionable errors.

- [ ] **Step 1: Write validator expectations**

Require `SKILL.md`, required frontmatter keys, valid `evals/evals.json`, at least six evals, and no absolute personal paths or credential-like assignments.

- [ ] **Step 2: Implement the standard-library validator**

Scan repository text files while excluding `.git`, validate JSON structure, and print each failure before returning exit code `1`.

- [ ] **Step 3: Run release checks**

```bash
python3 scripts/validate_skill.py
git diff --check
git status --short
```

Expected: validator prints `validation passed`; `git diff --check` is silent.

- [ ] **Step 4: Commit validation tooling**

```bash
git add scripts/validate_skill.py .gitignore
git commit -m "test: add public skill release validation"
```

- [ ] **Step 5: Create and publish the repository**

```bash
gh repo create xujp1983-glitch/product-selection-specialist-skill --public --source=. --remote=origin --push
git tag v0.1.0
git push origin v0.1.0
```

Expected: the public repository and `v0.1.0` tag are available on GitHub.
