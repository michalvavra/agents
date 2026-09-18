# TypeScript service and integration patterns

Use this reference only for a TypeScript API, Worker, integration service, or background workflow. Adapt it to the repository's established architecture.

## Make layer ownership searchable

- Entrypoints compose dependencies, register routes or consumers, and start the runtime. Keep business decisions elsewhere.
- Routes and handlers own transport concerns: authentication context, request parsing, response status, and serialization.
- Schemas and DTOs define external contracts. Keep provider, API, persistence, and domain shapes distinct when their guarantees differ.
- Services own cohesive domain operations. Name them for the business effect, not the transport that happened to trigger it.
- Workflows own multi-step or durable coordination, including retries, state transitions, and idempotency decisions.
- Repositories own persistence queries and storage mapping. They should not silently invoke providers or implement workflow policy.
- Provider adapters own protocol details, provider vocabulary, error translation, and boundary validation.
- Mappers explicitly translate between shapes. Avoid broad casts that conceal disagreement between generated or external types and the domain.
- Generated clients and types are read-only inputs unless the repository explicitly says otherwise.
- Treat versioned events, queue messages, and webhooks as cross-service contracts. Trace both producer and consumer, preserve compatibility deliberately, and validate untrusted messages at the receiving boundary.

A reader should be able to trace `entrypoint -> route or consumer -> service or workflow -> repository or provider adapter` by searching the concept's vocabulary. Preserve that direction unless the repository documents another one.

## Prefer domain-bearing contracts

- Include the operation and object in exported names, such as `scheduleReservationCharge`, `reconcileProviderPayment`, or `loadBookingForCancellation`.
- Make lifecycle state visible when it changes behavior, such as `PendingCharge`, `CommittedOrder`, or a discriminated result union.
- Distinguish identifiers that are easy to transpose only when doing so removes a real ambiguity. An options object may be simpler than branded primitives.
- Include units and time semantics in boundary names or types when confusion is costly, such as `amountMinor`, `scheduledAtUtc`, or `stayDateLocal`.
- Keep stable provider or domain error codes searchable at the source and translate them at an explicit boundary.

## Keep orchestration readable

An orchestrator should read as a short sequence of domain operations. Extract policy decisions, provider calls, persistence, and mapping when each extraction creates a meaningful boundary. Keep steps together when separating them would force readers to bounce between files for one concept.

For asynchronous financial or external workflows, make ownership of idempotency, retries, durable state, and the exact event that permits a state transition explicit. Do not infer these guarantees from function names alone.

## Validate the real contract

Run the repository's formatter, compiler, linter, unit tests, and focused integration or contract tests. Check generated types, migration or schema expectations, exhaustiveness, dead exports, and the external boundary that actually owns truth. A transport response or mocked unit test alone may not verify an end-to-end integration claim.
