/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<054d427b113977ea0f18474de8d7506f>>
 * @flow
 * @lightSyntaxTransform
 * @nogrep
 */

/* eslint-disable */

'use strict';

/*::
import type { Fragment, ReaderFragment } from 'relay-runtime';
import type { FragmentType } from "relay-runtime";
declare export opaque type DummyUserClientEdgeResolver$fragmentType: FragmentType;
export type DummyUserClientEdgeResolver$data = {|
  +name: ?string,
  +$fragmentType: DummyUserClientEdgeResolver$fragmentType,
|};
export type DummyUserClientEdgeResolver$key = {
  +$data?: DummyUserClientEdgeResolver$data,
  +$fragmentSpreads: DummyUserClientEdgeResolver$fragmentType,
  ...
};
*/

var node/*: ReaderFragment*/ = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "DummyUserClientEdgeResolver",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "name",
      "storageKey": null
    }
  ],
  "type": "User",
  "abstractKey": null
};

if (__DEV__) {
  (node/*: any*/).hash = "b95e3d7eb5ee261e5dda6b95c2ddc96e";
}

module.exports = ((node/*: any*/)/*: Fragment<
  DummyUserClientEdgeResolver$fragmentType,
  DummyUserClientEdgeResolver$data,
>*/);
