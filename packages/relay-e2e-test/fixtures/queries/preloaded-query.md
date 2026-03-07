# Preloaded Query

Demonstrates the "render-as-you-fetch" pattern using `useQueryLoader` and
`usePreloadedQuery`. A parent component calls `useQueryLoader` to manage a
query reference. Clicking a button triggers `loadQuery`, and a child
component reads the data via `usePreloadedQuery`.

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
  return "Hello from preloaded query!";
}
```

## App

```tsx title="App.tsx"
import { Suspense, useCallback } from "react";
import {
  RelayEnvironmentProvider,
  usePreloadedQuery,
  useQueryLoader,
} from "react-relay";
import type { PreloadedQuery } from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import type { AppPreloadedQueryGreetingQuery } from "./__generated__/AppPreloadedQueryGreetingQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

const GreetingQuery = graphql`
  query AppPreloadedQueryGreetingQuery {
    greeting
  }
`;

function Greeting({
  queryRef,
}: {
  queryRef: PreloadedQuery<AppPreloadedQueryGreetingQuery>;
}) {
  const data = usePreloadedQuery(GreetingQuery, queryRef);
  return <p>Result: {data.greeting}</p>;
}

function App() {
  const [queryRef, loadQuery] =
    useQueryLoader<AppPreloadedQueryGreetingQuery>(GreetingQuery);

  const handleLoad = useCallback(() => {
    loadQuery({});
  }, [loadQuery]);

  return (
    <div>
      <button onClick={handleLoad}>Load</button>
      {queryRef != null && (
        <Suspense fallback={<p>Fetching...</p>}>
          <Greeting queryRef={queryRef} />
        </Suspense>
      )}
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <App />
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait button "Load"
click button "Load"
wait "Result:"
```
