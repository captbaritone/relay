/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @oncall relay
 */

import {DEFAULT_STATE} from './ExplorerStateConstants';
import * as LZString from 'lz-string';

// Current version indicating our URL encoding scheme.
// Version 3: files object + activeInputTab.
const ENCODING_VERSION = '3';

export function serializeState(state) {
  const params = new URLSearchParams();
  params.set('enc', ENCODING_VERSION);
  params.set(
    'files',
    LZString.compressToEncodedURIComponent(JSON.stringify(state.files)),
  );
  params.set('activeInputTab', state.activeInputTab);
  return params.toString();
}

export function deserializeState(params) {
  const version = params.get('enc');
  if (version !== ENCODING_VERSION) {
    return null;
  }
  const compressed = params.get('files');
  if (compressed == null) {
    return null;
  }
  const filesJson = LZString.decompressFromEncodedURIComponent(compressed);
  if (filesJson == null) {
    return null;
  }
  try {
    const files = JSON.parse(filesJson);
    const activeInputTab =
      params.get('activeInputTab') || Object.keys(files)[0] || '';
    return {files, activeInputTab};
  } catch {
    return null;
  }
}
