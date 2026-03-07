# Fragment

Demonstrates `useFragment` for reading fragment data. A parent component
fetches a query that spreads a fragment, and a child component reads the
fragment data via `useFragment`. This tests Relay's data masking: the parent
cannot access fields defined in the child's fragment.

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

/** @gqlType */
type User = {
  /** @gqlField */
  id: ID;
  /** @gqlField */
  name: string;
  /** @gqlField */
  age: Int;
};

/** @gqlQueryField */
export function viewer(): User {
  return { id: "user-1" as ID, name: "Alice", age: 30 as Int };
}
```

## App

```tsx title="App.tsx"
import { Suspense } from "react";
import {
  RelayEnvironmentProvider,
  useLazyLoadQuery,
  useFragment,
} from "react-relay";
import { graphql, Environment } from "relay-runtime";
import { gratsNetwork } from "../GratsNetwork";
import { AppFragmentQuery } from "./__generated__/AppFragmentQuery.graphql";
import { AppFragmentUserInfo$key } from "./__generated__/AppFragmentUserInfo.graphql";

const testEnvironment = new Environment({
  network: gratsNetwork,
});

function UserInfo({ userRef }: { userRef: AppFragmentUserInfo$key }) {
  const user = useFragment(
    graphql`
      fragment AppFragmentUserInfo on User {
        name
        age
      }
    `,
    userRef,
  );

  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Age: {user.age}</p>
    </div>
  );
}

function App() {
  const data = useLazyLoadQuery<AppFragmentQuery>(
    graphql`
      query AppFragmentQuery {
        viewer {
          ...AppFragmentUserInfo
        }
      }
    `,
    {},
  );

  return <UserInfo userRef={data.viewer} />;
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
wait "Name:"
```
