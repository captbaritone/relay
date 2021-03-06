/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+relay
 * @flow strict-local
 * @format
 */

// flowlint ambiguous-object-type:error

'use strict';

const useLazyLoadQueryNode = require('./useLazyLoadQueryNode');
const useMemoOperationDescriptor = require('./useMemoOperationDescriptor');

const {useTrackLoadQueryInRender} = require('./loadQuery');

import type {FetchPolicy, RenderPolicy} from './QueryResource';
import type {
  CacheConfig,
  GraphQLTaggedNode,
  OperationType,
} from 'relay-runtime';

function useLazyLoadQuery<TQuery: OperationType>(
  gqlQuery: GraphQLTaggedNode,
  variables: $ElementType<TQuery, 'variables'>,
  options?: {|
    fetchKey?: string | number,
    fetchPolicy?: FetchPolicy,
    networkCacheConfig?: CacheConfig,
    renderPolicy_UNSTABLE?: RenderPolicy,
  |},
): $ElementType<TQuery, 'response'> {
  // We need to use this hook in order to be able to track if
  // loadQuery was called during render
  useTrackLoadQueryInRender();

  const query = useMemoOperationDescriptor(gqlQuery, variables);
  const data = useLazyLoadQueryNode({
    componentDisplayName: 'useLazyLoadQuery()',
    fetchKey: options?.fetchKey,
    fetchPolicy: options?.fetchPolicy,
    networkCacheConfig: options?.networkCacheConfig,
    query,
    renderPolicy: options?.renderPolicy_UNSTABLE,
  });
  return data;
}

module.exports = useLazyLoadQuery;
