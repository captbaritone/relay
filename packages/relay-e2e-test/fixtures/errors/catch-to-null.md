# Catch to Null

Demonstrates `@catch(to: NULL)` which replaces field errors with `null`
instead of wrapping in a Result type. Unlike `@catch(to: RESULT)`, the
field value is simply `null` on error — no `ok`/`errors` wrapper.

The fixture defines two fields: one that succeeds and one that throws.
The throwing field is silently replaced with `null`.

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
export function workingGreeting(): string {
  return "Hello!";
}

/** @gqlQueryField */
export function brokenGreeting(): string {
  throw new Error("Something went wrong!");
}
```

## App

```tsx title="App.tsx"
import { Suspense } from "react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppCatchToNullQuery } from "./__generated__/AppCatchToNullQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function Greeting() {
  const data = useLazyLoadQuery<AppCatchToNullQuery>(
    graphql`
      query AppCatchToNullQuery {
        workingGreeting @catch(to: NULL)
        brokenGreeting @catch(to: NULL)
      }
    `,
    {},
  );

  return (
    <div>
      <p>Working: {data.workingGreeting ?? "was null"}</p>
      <p>Broken: {data.brokenGreeting ?? "was null"}</p>
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<div>Loading...</div>}>
        <Greeting />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait "Working:"
```
