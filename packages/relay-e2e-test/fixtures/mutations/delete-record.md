# @deleteRecord

Demonstrates the `@deleteRecord` declarative mutation directive. When a
mutation returns a deleted record's ID annotated with `@deleteRecord`, Relay
automatically removes that record from the store. Any component reading the
deleted record sees it disappear on re-render.

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

const items = [
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

/** @gqlQueryField */
export function allItems(): Item[] {
  return [...items];
}

/** @gqlMutationField */
export function deleteItem(args: { id: ID }): ID {
  const index = items.findIndex((item) => item.id === args.id);
  if (index >= 0) items.splice(index, 1);
  return args.id;
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
import { AppDeleteRecordQuery } from "./__generated__/AppDeleteRecordQuery.graphql";
import { AppDeleteRecordMutation } from "./__generated__/AppDeleteRecordMutation.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function ItemList() {
  const data = useLazyLoadQuery<AppDeleteRecordQuery>(
    graphql`
      query AppDeleteRecordQuery {
        allItems {
          id
          name
        }
      }
    `,
    {},
  );

  const [commit] = useMutation<AppDeleteRecordMutation>(
    graphql`
      mutation AppDeleteRecordMutation($id: ID!) {
        deleteItem(id: $id) @deleteRecord
      }
    `,
  );

  const handleDelete = useCallback(
    (id: string) => {
      commit({ variables: { id } });
    },
    [commit],
  );

  return (
    <ul>
      {data.allItems
        ?.filter(Boolean)
        .map((item) => (
          <li key={item.id}>
            {item.name}
            <button onClick={() => handleDelete(item.id)}>
              Delete {item.name}
            </button>
          </li>
        ))}
    </ul>
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
wait button "Delete Banana"
click button "Delete Banana"
```
