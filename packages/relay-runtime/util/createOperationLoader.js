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

import type {OperationLoader} from '../store/RelayStoreTypes';
import type {NormalizationRootNode} from '../util/NormalizationNode';

function createOperationLoader(): OperationLoader {
  const cache: Map<unknown, NormalizationRootNode> = new Map();
  return {
    get(reference: unknown): ?NormalizationRootNode {
      return cache.get(reference) ?? null;
    },
    load(reference: unknown): Promise<?NormalizationRootNode> {
      if (typeof reference === 'function') {
        const loader: () => Promise<{default?: NormalizationRootNode, ...}> =
          reference as $FlowFixMe;
        return loader().then(mod => {
          const node: NormalizationRootNode =
            mod.default != null ? mod.default : (mod as $FlowFixMe);
          cache.set(reference, node);
          return node;
        });
      }
      return Promise.resolve(null);
    },
  };
}

module.exports = createOperationLoader;
