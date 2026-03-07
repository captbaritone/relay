# Refetchable Fragment

Demonstrates `useRefetchableFragment` for refetching a fragment with different
variables. A query field accepts a `greetingStyle` argument, and the fragment
uses `@argumentDefinitions` plus `@refetchable` to allow refetching. Clicking
a button calls `refetch` with a new variable value, causing the component to
re-render with updated data.

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
export function greeting(args: { style?: string | null }): string {
  if (args.style === "formal") {
    return "Good day, esteemed visitor.";
  }
  return "Hey there!";
}
```

## App

```tsx title="App.tsx"
import { Suspense, useCallback } from "react";
import {
  RelayEnvironmentProvider,
  useLazyLoadQuery,
  useRefetchableFragment,
} from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppRefetchableFragmentQuery } from "./__generated__/AppRefetchableFragmentQuery.graphql";
import { AppRefetchableGreeting$key } from "./__generated__/AppRefetchableGreeting.graphql";
import { AppRefetchableGreetingRefetchQuery } from "./__generated__/AppRefetchableGreetingRefetchQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function GreetingDisplay({ queryRef }: { queryRef: AppRefetchableGreeting$key }) {
  const [data, refetch] = useRefetchableFragment<
    AppRefetchableGreetingRefetchQuery,
    AppRefetchableGreeting$key
  >(
    graphql`
      fragment AppRefetchableGreeting on Query
      @argumentDefinitions(style: { type: "String", defaultValue: "casual" })
      @refetchable(queryName: "AppRefetchableGreetingRefetchQuery") {
        greeting(style: $style)
      }
    `,
    queryRef,
  );

  const handleRefetch = useCallback(() => {
    refetch({ style: "formal" });
  }, [refetch]);

  return (
    <div>
      <p>Greeting: {data.greeting}</p>
      <button onClick={handleRefetch}>Go Formal</button>
    </div>
  );
}

function App() {
  const data = useLazyLoadQuery<AppRefetchableFragmentQuery>(
    graphql`
      query AppRefetchableFragmentQuery {
        ...AppRefetchableGreeting
      }
    `,
    {},
  );

  return <GreetingDisplay queryRef={data} />;
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
wait "Hey there!"
click button "Go Formal"
wait "Good day"
```
