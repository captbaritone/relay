/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @oncall relay
 */

import {useExplorerState} from '../compiler-explorer/ExplorerState';
import Layout from '@theme/Layout';
import clsx from 'clsx';
// We have a dynamic require later on which triggers a lint error here.
// eslint-disable-next-line relay-internal/no-mixed-import-and-require
import * as React from 'react';
import styles from './compiler-explorer.module.css';

const {useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback} =
  React;

export default function App() {
  return (
    <Layout title="Compiler Explorer" noFooter>
      <FillRemainingHeight minHeight={600}>
        <CompilerExplorer />
      </FillRemainingHeight>
    </Layout>
  );
}

// On mount, measures the window height and current vertical offset, and
// renders children into a div that stretches to the bottom of the viewport.
function FillRemainingHeight({children, minHeight}) {
  const [containerRef, setContainerRef] = useState(null);
  const [height, setHeight] = useState(null);
  useLayoutEffect(() => {
    if (containerRef == null) {
      return;
    }

    const verticalOffset = containerRef.getBoundingClientRect().y;
    const avaliable = Math.max(window.innerHeight - verticalOffset, minHeight);
    setHeight(avaliable);
  }, [containerRef, minHeight]);

  return (
    <div style={{height}} ref={setContainerRef}>
      {height != null && children}
    </div>
  );
}

function CompilerExplorer() {
  const {state, setFileContent, setActiveInputTab, addFile, removeFile, renameFile} =
    useExplorerState();
  const {outputFiles, error} = useResults(state);
  const [activeOutputTab, setActiveOutputTab] = useState(null);
  const Editor = useMemo(() => {
    // Loading the Editor component causes Docusaurus' build time pre-rendering to
    // crash, so we initialize it lazily.
    return require('../compiler-explorer/Editor').default;
  }, []);

  const inputFileNames = Object.keys(state.files);
  const outputFileNames = outputFiles != null ? Object.keys(outputFiles) : [];

  // Keep active output tab in sync with available output files
  const effectiveOutputTab =
    activeOutputTab != null && outputFileNames.includes(activeOutputTab)
      ? activeOutputTab
      : outputFileNames[0] || null;

  const activeInputFile = inputFileNames.includes(state.activeInputTab)
    ? state.activeInputTab
    : inputFileNames[0] || null;

  const [copied, setCopied] = useState(false);
  const copyAsFixture = useCallback(() => {
    const lines = [];
    for (const [path, content] of Object.entries(state.files)) {
      lines.push(`//- ${path}`);
      lines.push(content);
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [state.files]);

  return (
    <div className={styles.container}>
      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderTabs}>
              <Tabs
                values={inputFileNames.map(name => ({value: name, label: name}))}
                selectedValue={activeInputFile}
                setSelectedValue={setActiveInputTab}
                onClose={removeFile}
                onRename={(oldName, newName) => renameFile(oldName, newName)}
                onAdd={() => {
                  const name = prompt('File name:');
                  if (name != null && name.trim() !== '') {
                    addFile(name.trim(), '');
                  }
                }}
              />
            </div>
            <button
              onClick={copyAsFixture}
              title="Copy all files as test fixture"
              className={styles.copyButton}>
              {copied ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
          <div className={styles.panelBody}>
            {activeInputFile != null && (
              <Editor
                key={activeInputFile}
                text={state.files[activeInputFile]}
                onDidChange={content => setFileContent(activeInputFile, content)}
                style={{height: '100%'}}
                language={languageForFilename(activeInputFile)}
              />
            )}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            {error != null ? (
              <ExplorerHeading isError>Error</ExplorerHeading>
            ) : outputFileNames.length > 0 ? (
              <div className={styles.panelHeaderTabs}>
                <Tabs
                  values={outputFileNames.map(name => ({
                    value: name,
                    label: name,
                  }))}
                  selectedValue={effectiveOutputTab}
                  setSelectedValue={setActiveOutputTab}
                />
              </div>
            ) : (
              <ExplorerHeading>Compiling...</ExplorerHeading>
            )}
          </div>
          <div className={styles.panelBody}>
            <Editor
              key={error != null ? '__error__' : effectiveOutputTab}
              text={
                error != null
                  ? error
                  : effectiveOutputTab != null
                    ? outputFiles[effectiveOutputTab]
                    : ''
              }
              style={{height: '100%'}}
              language={
                error != null
                  ? 'plaintext'
                  : languageForFilename(effectiveOutputTab)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function languageForFilename(filename) {
  if (filename == null) {
    return 'plaintext';
  }
  if (filename.endsWith('.json')) {
    return 'json';
  }
  if (filename.endsWith('.graphql') || filename.endsWith('.gql')) {
    return 'graphql';
  }
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
    return 'typescript';
  }
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) {
    return 'javascript';
  }
  return 'plaintext';
}

// A fork of @theme/Tabs which is a controlled component
function Tabs({
  values,
  selectedValue,
  setSelectedValue,
  onClose,
  onAdd,
  onRename,
}) {
  const [editingTab, setEditingTab] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (e, value) => {
    if (onRename == null) {
      return;
    }
    e.preventDefault();
    setEditingTab(value);
    setEditValue(value);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed !== '' && trimmed !== editingTab) {
      onRename(editingTab, trimmed);
    }
    setEditingTab(null);
  };

  return (
    <div className={clsx('tabs-container', styles.tabs)}>
      <ul role="tablist" aria-orientation="horizontal" className="tabs">
        {values.map(({value, label}) => {
          const selected = selectedValue === value;
          const isEditing = editingTab === value;
          return (
            <li
              role="tab"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              className={clsx('tabs__item', {
                'tabs__item--active': selected,
              })}
              key={value}
              onClick={() => setSelectedValue(value)}
              onDoubleClick={e => startEditing(e, value)}>
              <span className={styles.tab}>
                {isEditing ? (
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        commitRename();
                      } else if (e.key === 'Escape') {
                        setEditingTab(null);
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    className={styles.tabEditInput}
                    style={{width: Math.max(editValue.length, 3) + 'ch'}}
                  />
                ) : (
                  label
                )}
                {onClose != null && !isEditing && (
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      onClose(value);
                    }}
                    className={styles.tabClose}
                    title={`Remove ${label}`}>
                    ×
                  </span>
                )}
              </span>
            </li>
          );
        })}
        {onAdd != null && (
          <li className={styles.tabAdd}>
            <span
              className="tabs__item"
              onClick={onAdd}
              title="Add file">
              +
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

function ExplorerHeading({children, isError}) {
  return (
    <span className={clsx(styles.heading, isError && styles.errorHeading)}>
      {children}
    </span>
  );
}

function useResults(state) {
  const {files} = state;
  const wasm = useWasm();
  const [result, setResult] = useState({outputFiles: null, error: null});
  const debounceRef = useRef(null);
  const inflightRef = useRef(false);
  const pendingRef = useRef(null);

  const compileInput = useCallback(
    async inputFiles => {
      if (wasm == null) {
        return;
      }
      // If a compilation is already running, queue this one for later
      if (inflightRef.current) {
        pendingRef.current = inputFiles;
        return;
      }
      inflightRef.current = true;
      try {
        const inputJson = JSON.stringify(inputFiles);
        const resultJson = await wasm.compile(inputJson);
        const parsed = JSON.parse(resultJson);
        if (parsed.Ok != null) {
          setResult({outputFiles: parsed.Ok, error: null});
        } else if (parsed.Err != null) {
          setResult({outputFiles: null, error: parsed.Err});
        }
      } catch (e) {
        setResult({
          outputFiles: null,
          error: `Error: The compiler crashed: ${e.message}`,
        });
      } finally {
        inflightRef.current = false;
        // If files changed while we were compiling, recompile with latest
        if (pendingRef.current != null) {
          const next = pendingRef.current;
          pendingRef.current = null;
          compileInput(next);
        }
      }
    },
    [wasm],
  );

  useEffect(() => {
    if (wasm == null) {
      return;
    }
    if (debounceRef.current != null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      compileInput(files);
    }, 300);
    return () => {
      if (debounceRef.current != null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [files, wasm, compileInput]);

  return result;
}

// The Wasm module must be initialized async. Return `null` until the module is ready.
function useWasm() {
  const [wasm, setWasm] = useState(null);
  useEffect(() => {
    let unmounted = false;

    // Loading the `relay-compiler-playground` module in Docusaurus' build time
    // prerender crashes, so we lazily load it here in a useEffect.
    const _wasm = require('relay-compiler-playground');
    const init = _wasm.default;

    init().then(() => {
      if (!unmounted) {
        setWasm(_wasm);
      }
    });

    return () => {
      unmounted = true;
    };
  }, []);
  return wasm;
}
