# Optimistic Response

Demonstrates `optimisticResponse` on a mutation. When the mutation is fired,
Relay immediately applies the optimistic response to the store, updating the
UI before the server responds. Once the server responds, the real data
replaces the optimistic data.

The server resolver has an artificial delay so the optimistic state is
visible before the real response arrives.

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
  return { id: "msg-1" as ID, message: currentMessage };
}

/** @gqlMutationField */
export async function updateMessage(): Promise<MessageHolder> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  currentMessage = "Server says hi";
  return { id: "msg-1" as ID, message: currentMessage };
}
```

## App

```tsx title="App.tsx"
import { Suspense, useCallback } from "react";
import {
  RelayEnvironmentProvider,
  useLazyLoadQuery,
  useMutation,
} from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppOptimisticResponseQuery } from "./__generated__/AppOptimisticResponseQuery.graphql";
import { AppOptimisticResponseUpdateMutation } from "./__generated__/AppOptimisticResponseUpdateMutation.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function MessageDisplay() {
  const data = useLazyLoadQuery<AppOptimisticResponseQuery>(
    graphql`
      query AppOptimisticResponseQuery {
        messageHolder {
          id
          message
        }
      }
    `,
    {},
  );

  const [commit] = useMutation<AppOptimisticResponseUpdateMutation>(
    graphql`
      mutation AppOptimisticResponseUpdateMutation {
        updateMessage {
          id
          message
        }
      }
    `,
  );

  const handleUpdate = useCallback(() => {
    commit({
      variables: {},
      optimisticResponse: {
        updateMessage: {
          id: "msg-1",
          message: "Updating...",
        },
      },
    });
  }, [commit]);

  return (
    <div>
      <span>{data.messageHolder?.message}</span>
      <button onClick={handleUpdate}>Update</button>
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
wait "Hello"
click button "Update"
wait "Updating..."
wait "Server says hi"
```
