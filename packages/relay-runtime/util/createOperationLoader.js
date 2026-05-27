/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 * @oncall relay
 */

'use strict';

import type {NormalizationRootNode} from '../util/NormalizationNode';
import type {OperationLoader} from '../store/RelayStoreTypes';

function createOperationLoader(): OperationLoader {
  const cache: Map<mixed, NormalizationRootNode> = new Map();
  return {
    get(reference: mixed): ?NormalizationRootNode {
      return cache.get(reference) ?? null;
    },
    load(reference: mixed): Promise<?NormalizationRootNode> {
      if (typeof reference === 'function') {
        return Promise.resolve(reference()).then(
          (mod: ?{default?: ?NormalizationRootNode, ...}) => {
            const node: NormalizationRootNode = (mod != null &&
            mod.default != null
              ? mod.default
              : mod: $FlowFixMe);
            cache.set(reference, node);
            return node;
          },
        );
      }
      return Promise.resolve(null);
    },
  };
}

module.exports = createOperationLoader;
