/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @oncall relay
 */

export const DEFAULT_FILES = {
  'relay.config.json': `{
  "language": "typescript",
  "schema": "./schema.graphql",
  "src": "./"
}`,
  'schema.graphql': `type User {
  name: String
  age: Int
  best_friend: User
}

type Query {
  me: User
}`,
  'MyQuery.ts': `graphql\`
  query MyQuery {
    me {
      name
      ...AgeFragment
      best_friend {
        ...AgeFragment
      }
    }
  }
\``,
  'AgeFragment.ts': `graphql\`
  fragment AgeFragment on User {
    age
  }
\``,
};

export const DEFAULT_STATE = {
  files: DEFAULT_FILES,
  activeInputTab: 'MyQuery.ts',
};
