# Load Query

Demonstrates `loadQuery` for eagerly fetching a query outside of React render.
The query is loaded at module scope before the component mounts, and
`usePreloadedQuery` reads the preloaded data immediately.

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
  return "Hello from loadQuery!";
}
```

## App

```tsx title="App.tsx"
import { Suspense } from "react";
import { RelayEnvironmentProvider, usePreloadedQuery, loadQuery } from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import type { AppLoadQueryGreetingQuery } from "./__generated__/AppLoadQueryGreetingQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

const GreetingQuery = graphql`
  query AppLoadQueryGreetingQuery {
    greeting
  }
`;

const preloadedQueryRef = loadQuery<AppLoadQueryGreetingQuery>(
  testEnvironment,
  GreetingQuery,
  {},
);

function Greeting() {
  const data = usePreloadedQuery(GreetingQuery, preloadedQueryRef);
  return <p>Result: {data.greeting}</p>;
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<p>Loading...</p>}>
        <Greeting />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait "Result:"
```
