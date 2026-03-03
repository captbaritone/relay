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
import {deserializeState, serializeState} from './ExplorerStateSerialization';
import * as React from 'react';

const {useReducer, useMemo, useEffect} = React;

const LOCAL_STORAGE_KEY = 'relayCompilerExplorerLastContent';

export function useExplorerState() {
  const [state, dispatch] = useReducer(reducer, null, initializeState);

  // Persist the current state to the URL hash and local storage.
  useEffect(() => {
    const serialized = serializeState(state);
    const hash = `#${serialized}`;
    window.history.replaceState(null, null, hash);
    localStorage.setItem(LOCAL_STORAGE_KEY, hash);
  }, [state]);

  const actionHandlers = useMemo(() => {
    return {
      setFileContent: (path, content) =>
        dispatch({type: 'SET_FILE_CONTENT', path, content}),
      setActiveInputTab: path =>
        dispatch({type: 'SET_ACTIVE_INPUT_TAB', path}),
      addFile: (path, content) =>
        dispatch({type: 'ADD_FILE', path, content}),
      removeFile: path => dispatch({type: 'REMOVE_FILE', path}),
      renameFile: (oldPath, newPath) =>
        dispatch({type: 'RENAME_FILE', oldPath, newPath}),
    };
  }, []);
  return {
    state,
    ...actionHandlers,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FILE_CONTENT':
      return {
        ...state,
        files: {...state.files, [action.path]: action.content},
      };
    case 'SET_ACTIVE_INPUT_TAB':
      return {...state, activeInputTab: action.path};
    case 'ADD_FILE': {
      const files = {...state.files, [action.path]: action.content ?? ''};
      return {...state, files, activeInputTab: action.path};
    }
    case 'REMOVE_FILE': {
      const {[action.path]: _, ...rest} = state.files;
      const remainingKeys = Object.keys(rest);
      const activeInputTab =
        state.activeInputTab === action.path
          ? remainingKeys[0] || ''
          : state.activeInputTab;
      return {...state, files: rest, activeInputTab};
    }
    case 'RENAME_FILE': {
      if (action.oldPath === action.newPath) {
        return state;
      }
      // Rebuild files object preserving key order, with the old key replaced
      const files = {};
      for (const [key, value] of Object.entries(state.files)) {
        if (key === action.oldPath) {
          files[action.newPath] = value;
        } else {
          files[key] = value;
        }
      }
      const activeInputTab =
        state.activeInputTab === action.oldPath
          ? action.newPath
          : state.activeInputTab;
      return {...state, files, activeInputTab};
    }
    default:
      throw new Error('Unexpected action type: ' + action.type);
  }
}

// Get the initial state. Either from the URL hash, local storage, or the default state.
function initializeState() {
  const hash = window.location.hash || localStorage.getItem(LOCAL_STORAGE_KEY);
  if (hash != null && hash[0] === '#' && hash.length > 1) {
    const serialized = hash.slice(1);
    try {
      return deserializeState(new URLSearchParams(serialized)) || DEFAULT_STATE;
    } catch (e) {
      console.warn('Failed to decode previous state: ', e);
      return DEFAULT_STATE;
    }
  }
  return DEFAULT_STATE;
}
