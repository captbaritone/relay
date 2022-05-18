/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 * @emails oncall+relay
 */

// flowlint ambiguous-object-type:error

'use strict';

import type {DummyUserClientEdgeResolver$key} from './__generated__/DummyUserClientEdgeResolver.graphql';

const {graphql} = require('relay-runtime');
const {readFragment} = require('relay-runtime/store/ResolverFragments');

/**
 * @RelayResolver
 * @fieldName client_edge
 * @rootFragment DummyUserClientEdgeResolver
 * @onType User
 * @edgeTo User
 */
function userClientEdge(rootKey: DummyUserClientEdgeResolver$key): string {
  const user = readFragment(
    graphql`
      fragment DummyUserClientEdgeResolver on User {
        name
      }
    `,
    rootKey,
  );
  const name = user.name ?? 'Stranger';
  return `Hello, ${name}!`;
}

module.exports = userClientEdge;
