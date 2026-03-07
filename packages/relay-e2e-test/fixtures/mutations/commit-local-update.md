# commitLocalUpdate

Demonstrates `commitLocalUpdate` for imperatively modifying the Relay store
without a server round-trip. A component reads a message from the store.
Clicking a button calls `commitLocalUpdate` to change the message field
directly in the store, and the component re-renders with the updated value.

Also exercises `useRelayEnvironment` to access the environment from context.

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

/** @gqlType */
type MessageHolder = {
  /** @gqlField */
  id: ID;
  /** @gqlField */
  message: string;
};

/** @gqlQueryField */
export function messageHolder(): MessageHolder {
  return { id: "message-holder" as ID, message: "Hello" };
}
```

## App

```tsx title="App.tsx"
import { Suspense, useCallback } from "react";
import {
  RelayEnvironmentProvider,
  useLazyLoadQuery,
  useRelayEnvironment,
} from "react-relay";
import { graphql, Environment, commitLocalUpdate } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppCommitLocalUpdateQuery } from "./__generated__/AppCommitLocalUpdateQuery.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function MessageDisplay() {
  const data = useLazyLoadQuery<AppCommitLocalUpdateQuery>(
    graphql`
      query AppCommitLocalUpdateQuery {
        messageHolder {
          message
        }
      }
    `,
    {},
  );

  const environment = useRelayEnvironment();

  const handleUpdate = useCallback(() => {
    commitLocalUpdate(environment, (store) => {
      const record = store.get("message-holder");
      if (record) {
        record.setValue("Updated locally!", "message");
      }
    });
  }, [environment]);

  return (
    <div>
      <span>{data.messageHolder?.message}</span>
      <button onClick={handleUpdate}>Update Locally</button>
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
click button "Update Locally"
wait "Updated locally!"
```
