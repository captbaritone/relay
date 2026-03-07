# commitMutation

Demonstrates the imperative `commitMutation` API for executing a GraphQL
mutation outside of React hooks. Unlike `useMutation`, `commitMutation` is
called directly with the environment and a mutation config object. It returns
a `Disposable` for cancellation.

The test loads an initial message, then clicking a button calls
`commitMutation` to update it. Relay's normalized store merges the result
automatically.

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
import type { ID } from "grats";

let currentMessage = "Hello";

/** @gqlType */
type MessageHolder = {
  /** @gqlField */
  id: ID;
  /** @gqlField */
  message: string;
};

/** @gqlQueryField */
export function messageHolder(): MessageHolder {
  return { id: "message-holder" as ID, message: currentMessage };
}

/** @gqlMutationField */
export function toggleMessage(): MessageHolder {
  currentMessage = currentMessage === "Hello" ? "Goodbye" : "Hello";
  return { id: "message-holder" as ID, message: currentMessage };
}
```

## App

```tsx title="App.tsx"
import { Suspense, useCallback } from "react";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { graphql, Environment, commitMutation } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppCommitMutationQuery } from "./__generated__/AppCommitMutationQuery.graphql";
import { AppCommitMutationToggleMutation } from "./__generated__/AppCommitMutationToggleMutation.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

const ToggleMutation = graphql`
  mutation AppCommitMutationToggleMutation {
    toggleMessage {
      message
    }
  }
`;

function MessageDisplay() {
  const data = useLazyLoadQuery<AppCommitMutationQuery>(
    graphql`
      query AppCommitMutationQuery {
        messageHolder {
          message
        }
      }
    `,
    {},
  );

  const handleToggle = useCallback(() => {
    commitMutation<AppCommitMutationToggleMutation>(testEnvironment, {
      mutation: ToggleMutation,
      variables: {},
    });
  }, []);

  return (
    <div>
      <span>{data.messageHolder?.message}</span>
      <button onClick={handleToggle}>Toggle</button>
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<div>Loading...</div>}>
        <MessageDisplay />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait button "Toggle"
click button "Toggle"
```
