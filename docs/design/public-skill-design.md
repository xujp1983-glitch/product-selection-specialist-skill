# Product Selection Specialist Public Skill Design

## Goal

Publish a reusable, installable skill that teaches an AI agent how to perform evidence-based product discovery from commerce ranking data. The public package captures the method, safeguards, input contract, output contract, and evaluation prompts without exposing the owner's private automation system.

## Scope

The public skill covers the discovery stage:

1. Confirm the intended browser identity and ranking context.
2. Separate ranking date from content publication date.
3. Collect ranking rows without silently applying extra filters.
4. Apply only the user's explicit filters in list mode.
5. Keep product links and content links as separate evidence fields.
6. Optionally hand validated rows to an external storage adapter.
7. Stop before product verification, scoring, or business outreach.

It does not include private browser profiles, credentials, Feishu identifiers, server addresses, internal CLI commands, private selectors, or platform API implementations.

## Package Structure

- `SKILL.md`: Triggering rules, workflow, safety boundaries, and response contract.
- `README.md`: Installation, usage, examples, and integration overview.
- `references/workflow.md`: Detailed discovery and filtering semantics.
- `references/adapter-contract.md`: Generic interface for browser and storage adapters.
- `references/failure-handling.md`: Fail-closed behavior and user-facing explanations.
- `evals/evals.json`: Realistic prompts and expected behavior.
- `scripts/validate_skill.py`: Standard-library validation and sensitive-data checks.
- `LICENSE`: MIT License.

## Portability Strategy

The skill describes capabilities instead of hard-coding one repository's commands. An adopting project supplies adapters for page collection and optional storage. If those adapters are unavailable, the skill must report the missing capability rather than pretending it executed the workflow.

## Security And Privacy

- Never export cookies, tokens, passwords, browser profiles, or private request headers.
- Never bypass CAPTCHA, login controls, rate limits, or platform risk controls.
- Never infer product identity from an ambiguous result.
- Never perform business actions such as adding products, requesting samples, or contacting merchants.
- Treat evidence insufficiency as a valid outcome.

## Acceptance Criteria

- The repository can be installed by copying one directory into an agent skill directory.
- No absolute personal paths or private project identifiers remain.
- The skill distinguishes ranking date from content publication date.
- Explicit `newly ranked` requests require the platform's new-entry signal.
- Full-result requests do not silently become Top-N lists.
- Product and content links remain separate.
- Validation passes locally and the repository is publicly accessible on GitHub.
