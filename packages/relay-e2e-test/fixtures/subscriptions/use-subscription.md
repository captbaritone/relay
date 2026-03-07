# useSubscription Hook

Demonstrates the `useSubscription` hook for subscribing to a GraphQL
subscription. Unlike `requestSubscription` (the imperative API), this hook
manages the subscription lifecycle automatically — subscribing on mount and
unsubscribing on unmount.

The setup is the same as the `requestSubscription` test: a pub/sub connects
a mutation to a subscription stream. Clicking "Send" fires a mutation and
the `useSubscription` hook receives the new message.

## Relay Config

```json title="relay.config.json"
{
  "src": "./",
  "schema": "./schema.graphql",
  "language": "typescript"
}
```

## Server

A module-scoped pub/sub connects the `addMessage` mutation to the
`messageAdded` subscription stream.

```ts title="server.ts"
const messages: string[] = [];
const listeners = new Set<(msg: string) => void>();

/** @gqlType */
type MessageEvent = {
  /** @gqlField */
  text: string;
};

/** @gqlQueryField */
export function allMessages(): string[] {
  return [...messages];
}

/** @gqlMutationField */
export function addMessage(args: { text: string }): string {
  messages.push(args.text);
  listeners.forEach((cb) => cb(args.text));
  return args.text;
}

/** @gqlSubscriptionField */
export async function* messageAdded(): AsyncIterable<MessageEvent> {
  const queue: MessageEvent[] = [];
  let resolve: (() => void) | null = null;

  const handler = (text: string) => {
    queue.push({ text });
    if (resolve) {
      resolve();
      resolve = null;
    }
  };
  listeners.add(handler);

  try {
    while (true) {
      while (queue.length === 0) {
        await new Promise<void>((r) => {
          resolve = r;
        });
      }
      yield queue.shift()!;
    }
  } finally {
    listeners.delete(handler);
  }
}
```

## App

```tsx title="App.tsx"
import { Suspense, useState, useCallback, useMemo } from "react";
import {
  RelayEnvironmentProvider,
  useLazyLoadQuery,
  useMutation,
  useSubscription,
} from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppUseSubscriptionQuery } from "./__generated__/AppUseSubscriptionQuery.graphql";
import { AppUseSubscriptionAddMutation } from "./__generated__/AppUseSubscriptionAddMutation.graphql";
import { AppUseSubscriptionMessageAddedSubscription } from "./__generated__/AppUseSubscriptionMessageAddedSubscription.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function MessageBoard() {
  const data = useLazyLoadQuery<AppUseSubscriptionQuery>(
    graphql`
      query AppUseSubscriptionQuery {
        allMessages
      }
    `,
    {},
  );

  const [received, setReceived] = useState<string[]>([]);

  const subscriptionConfig =
    useMemo<GraphQLSubscriptionConfig<AppUseSubscriptionMessageAddedSubscription>>(
      () => ({
        subscription: graphql`
          subscription AppUseSubscriptionMessageAddedSubscription {
            messageAdded {
              text
            }
          }
        `,
        variables: {},
        onNext: (response) => {
          if (response?.messageAdded?.text) {
            setReceived((prev) => [...prev, response.messageAdded.text]);
          }
        },
      }),
      [],
    );

  useSubscription(subscriptionConfig);

  const [commit] = useMutation<AppUseSubscriptionAddMutation>(
    graphql`
      mutation AppUseSubscriptionAddMutation($text: String!) {
        addMessage(text: $text)
      }
    `,
  );

  const handleSend = useCallback(() => {
    commit({ variables: { text: "Hello from useSubscription!" } });
  }, [commit]);

  const allMessages = [...(data.allMessages ?? []), ...received];

  return (
    <div>
      <ul>
        {allMessages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
      <button onClick={handleSend}>Send</button>
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<div>Loading...</div>}>
        <MessageBoard />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait button "Send"
click button "Send"
```
