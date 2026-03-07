# Required Bubbles to Catch

Demonstrates that `@required(action: THROW)` null-bubbling is intercepted by
`@catch(to: RESULT)` on a parent field. When a `@required` field is `null`,
instead of throwing, the `@catch` boundary captures it as a result with
`ok: false`. This lets components handle missing required data inline without
needing an error boundary.

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
/** @gqlType */
type Greeting = {
  /** @gqlField */
  message: string | null;
};

/** @gqlQueryField */
export function presentGreeting(): Greeting {
  return { message: "Hello, world!" };
}

/** @gqlQueryField */
export function missingGreeting(): Greeting {
  return { message: null };
}
```

## App

```tsx title="App.tsx"
import { Suspense } from "react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppRequiredBubblesToCatchQuery } from "./__generated__/AppRequiredBubblesToCatchQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function Greetings() {
  const data = useLazyLoadQuery<AppRequiredBubblesToCatchQuery>(
    graphql`
      query AppRequiredBubblesToCatchQuery {
        presentGreeting @catch(to: RESULT) {
          message @required(action: THROW)
        }
        missingGreeting @catch(to: RESULT) {
          message @required(action: THROW)
        }
      }
    `,
    {},
  );

  return (
    <div>
      <p>
        Present:{" "}
        {data.presentGreeting.ok
          ? data.presentGreeting.value.message
          : "Caught missing data"}
      </p>
      <p>
        Missing:{" "}
        {data.missingGreeting.ok
          ? data.missingGreeting.value.message
          : "Caught missing data"}
      </p>
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<div>Loading...</div>}>
        <Greetings />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait "Present:"
```
