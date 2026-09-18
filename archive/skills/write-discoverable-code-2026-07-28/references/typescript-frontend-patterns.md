# TypeScript frontend patterns

Use this reference only for a TypeScript React, Astro, or similar web application. Adapt it to the repository's framework and feature conventions.

## Keep the data path explicit

Prefer a traceable flow such as:

`generated API shape -> boundary validation or mapper -> domain model -> service or hook -> presentation component`

- Treat generated API clients and types as read-only contracts.
- Map transport nullability, enums, and provider-specific shapes at the boundary instead of spreading casts through components.
- Keep server-only authentication, secrets, cookies, and privileged fetching in routes, server actions, middleware, or framework-native server modules.
- Services own remote operations and boundary translation. Hooks own reactive state and lifecycle. Components own presentation and user interaction.
- Pages and route components compose the feature. Avoid hiding business decisions in generic layout or utility modules.

## Organize by findable responsibility

- Prefer feature directories and filenames that expose the user or domain concept when the repository supports that convention.
- Name hooks for the state or operation they expose, not merely `useData` or `useHandler`.
- Name event handlers for the event plus effect when the effect is non-obvious, such as `handlePaymentMethodSelected`.
- Keep accessibility labels, analytics events, UI diagnostics, and feature flags tied to stable vocabulary that can be searched from observed behavior.
- Split a component when state, effects, server interaction, or rendering form separate responsibilities. Do not split only because of line count.
- Keep tightly coupled rendering logic together when extracting it would make the user flow harder to follow.

## Preserve useful states

Model loading, success, empty, unavailable, and failure states explicitly when they lead to different UI. Prefer discriminated state or exhaustive matching over combinations of loosely related booleans. Keep domain and transport types distinct when the UI relies on stronger guarantees than the API supplies.

Avoid `as any`, broad response casts, and client-side duplication of server policy. If an unavoidable framework boundary needs a cast, keep it narrow and explain the missing guarantee.

## Validate behavior as well as source

Run the repository's formatter, type checker, linter, component tests, and relevant end-to-end checks. Verify the requested desktop and mobile interaction when UI behavior changes. Check loading, empty, error, keyboard, and screen-reader behavior when the touched flow can expose them. Source inspection alone does not prove rendered behavior.
