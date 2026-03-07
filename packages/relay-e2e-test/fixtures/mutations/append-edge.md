# @appendEdge

Demonstrates the `@appendEdge` declarative mutation directive for adding
items to a connection. When a mutation returns a new edge annotated with
`@appendEdge(connections: $connections)`, Relay automatically appends it to
the specified connections — no manual `updater` function needed.

The connection ID is obtained via the `__id` field on the connection.

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
import type { ID, Int } from "grats";

let nextId = 4;
const ALL_ITEMS = [
  { id: "item-1" as ID, name: "Apple" },
  { id: "item-2" as ID, name: "Banana" },
  { id: "item-3" as ID, name: "Cherry" },
];

/** @gqlType */
type Item = {
  /** @gqlField */
  id: ID;
  /** @gqlField */
  name: string;
};

/** @gqlType */
type ItemEdge = {
  /** @gqlField */
  node: Item;
  /** @gqlField */
  cursor: string;
};

/** @gqlType */
type PageInfo = {
  /** @gqlField */
  hasNextPage: boolean;
  /** @gqlField */
  hasPreviousPage: boolean;
  /** @gqlField */
  startCursor: string | null;
  /** @gqlField */
  endCursor: string | null;
};

/** @gqlType */
type ItemConnection = {
  /** @gqlField */
  edges: ItemEdge[];
  /** @gqlField */
  pageInfo: PageInfo;
};

/** @gqlQueryField */
export function items(args: { first?: Int | null; after?: string | null }): ItemConnection {
  const first = args.first ?? ALL_ITEMS.length;
  const startIndex = 0;
  const endIndex = Math.min(startIndex + first, ALL_ITEMS.length);
  const edges = ALL_ITEMS.slice(startIndex, endIndex).map((item, i) => ({
    node: item,
    cursor: String(i),
  }));
  return {
    edges,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}

/** @gqlType */
type AddItemPayload = {
  /** @gqlField */
  itemEdge: ItemEdge;
};

/** @gqlMutationField */
export function addItem(args: { name: string }): AddItemPayload {
  const item = { id: `item-${nextId++}` as ID, name: args.name };
  ALL_ITEMS.push(item);
  return {
    itemEdge: { node: item, cursor: String(ALL_ITEMS.length - 1) },
  };
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
import { AppAppendEdgeQuery } from "./__generated__/AppAppendEdgeQuery.graphql";
import { AppAppendEdgeAddMutation } from "./__generated__/AppAppendEdgeAddMutation.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function ItemList() {
  const data = useLazyLoadQuery<AppAppendEdgeQuery>(
    graphql`
      query AppAppendEdgeQuery {
        items(first: 10) @connection(key: "AppItems_items") {
          __id
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `,
    {},
  );

  const connectionId = data.items.__id;

  const [commit] = useMutation<AppAppendEdgeAddMutation>(
    graphql`
      mutation AppAppendEdgeAddMutation($connections: [ID!]!, $name: String!) {
        addItem(name: $name) {
          itemEdge @appendEdge(connections: $connections) {
            node {
              id
              name
            }
          }
        }
      }
    `,
  );

  const handleAdd = useCallback(() => {
    commit({
      variables: { connections: [connectionId], name: "Date" },
    });
  }, [commit, connectionId]);

  return (
    <div>
      <ul>
        {data.items?.edges?.map((edge, i) => (
          <li key={edge?.node?.id ?? i}>{edge?.node?.name}</li>
        ))}
      </ul>
      <button onClick={handleAdd}>Add Item</button>
    </div>
  );
}

export default function TestApp() {
  return (
    <RelayEnvironmentProvider environment={testEnvironment}>
      <Suspense fallback={<div>Loading...</div>}>
        <ItemList />
      </Suspense>
    </RelayEnvironmentProvider>
  );
}
```

## Steps

```steps
wait button "Add Item"
click button "Add Item"
wait "Date"
```
