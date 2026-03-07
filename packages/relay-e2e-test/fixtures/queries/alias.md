# @alias

Demonstrates the `@alias` directive on an inline fragment for grouping
related fields. The aliased inline fragment creates a named property on the
data object, providing semantic grouping. When all fields in the group are
present, the alias is non-null; this pairs well with `@required(action: NONE)`
for null-checking entire groups at once.

## Relay Config

```json title="relay.config.json"
{
  "src": "./",
  "schema": "./schema.graphql",
  "language": "typescript"
}
```

## Server

```ts title="server.ts"
/** @gqlQueryField */
export function greeting(): string {
  return "Hello!";
}

/** @gqlQueryField */
export function farewell(): string {
  return "Goodbye!";
}

/** @gqlQueryField */
export function status(): string {
  return "Online";
}
```

## App

```tsx title="App.tsx"
import { Suspense } from "react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppAliasQuery } from "./__generated__/AppAliasQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function App() {
  const data = useLazyLoadQuery<AppAliasQuery>(
    graphql`
      query AppAliasQuery {
        ... @alias(as: "messages") {
          greeting
          farewell
        }
        status
      }
    `,
    {},
  );

  return (
    <div>
      <p>Greeting: {data.messages.greeting}</p>
      <p>Farewell: {data.messages.farewell}</p>
      <p>Status: {data.status}</p>
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait "Greeting:"
```
