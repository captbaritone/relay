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
  const cache: Map<mixed, NormalizationRootNode> = new Map();
  return {
    get(reference: mixed): ?NormalizationRootNode {
      return cache.get(reference) ?? null;
    },
    load(reference: mixed): Promise<?NormalizationRootNode> {
      if (typeof reference === 'function') {
        const loader: () => mixed = reference as $FlowFixMe;
        return Promise.resolve(loader()).then(mod => {
          const node = (mod != null && mod.default != null
            ? mod.default
            : mod) as $FlowFixMe as NormalizationRootNode;
          cache.set(reference, node);
          return node;
        });
      }
      return Promise.resolve(null);
    },
  };
}

module.exports = createOperationLoader;
