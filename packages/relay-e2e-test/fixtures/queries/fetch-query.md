# fetchQuery

Demonstrates `fetchQuery` for imperatively fetching query data outside of
React's render cycle. Clicking a button calls `fetchQuery` which returns an
Observable. The component subscribes to it and renders the result.

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
  return "Hello from fetchQuery!";
}
```

## App

```tsx title="App.tsx"
import { Suspense, useState, useCallback } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { graphql, Environment, fetchQuery } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppFetchQueryGreetingQuery } from "./__generated__/AppFetchQueryGreetingQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

const GreetingQuery = graphql`
  query AppFetchQueryGreetingQuery {
    greeting
  }
`;

function App() {
  const [result, setResult] = useState<string | null>(null);

  const handleFetch = useCallback(() => {
    fetchQuery<AppFetchQueryGreetingQuery>(
      testEnvironment,
      GreetingQuery,
      {},
    ).subscribe({
      next: (data) => {
        setResult(data.greeting);
      },
    });
  }, []);

  return (
    <div>
      <button onClick={handleFetch}>Fetch</button>
      {result != null && <p>Result: {result}</p>}
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
wait button "Fetch"
click button "Fetch"
wait "Result:"
```
