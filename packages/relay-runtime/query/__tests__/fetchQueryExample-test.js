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

import {Observable} from '../..';
import type {
  ExecuteFunction,
  FetchFunction,
  INetwork,
} from '../../network/RelayNetworkTypes';
const normalizeResponse = require('../../store/normalizeResponse');

const fetchQuery = require('../fetchQuery');
const {Environment, RecordSource, Store, graphql} = require('relay-runtime');
const {
  disallowConsoleErrors,
  disallowWarnings,
} = require('relay-test-utils-internal');
const fetchQueryExampleQuery = require('./__generated__/fetchQueryExampleQuery.graphql');
const defaultGetDataID = require('../../store/defaultGetDataID');
import {createNormalizationSelector} from '../../store/RelayModernSelector';
import {getOperationVariables} from '../../store/RelayConcreteVariables';
import type {NormalizationOptions} from '../../store/RelayResponseNormalizer';
import {ROOT_ID, ROOT_TYPE} from '../../store/RelayStoreUtils';

disallowWarnings();
disallowConsoleErrors();

describe('fetchQuery example', () => {
  it('fetches a query and returns the result', async () => {
    // Define the hardcoded mock response that the network will return.
    // This must match the shape of the query's expected GraphQL response.
    const networkResponse = {
      data: {
        node: {
          __typename: 'User',
          id: '4',
          name: 'Mark',
        },
      },
    };

    const execute: ExecuteFunction = (
      request,
      variables,
      CacheConfig,
      uploadables,
      logRequestInfo,
    ) => {
      const dataID = ROOT_ID;
      const operationVariables = getOperationVariables(
        fetchQueryExampleQuery.operation,
        fetchQueryExampleQuery.params.providedVariables,
        variables,
      );
      const selector = createNormalizationSelector(
        fetchQueryExampleQuery.operation,
        dataID,
        operationVariables,
      );
      return Observable.from(networkResponse).map(response => {
        const typename = ROOT_TYPE; // TODO: For incremental payloads this is not right.
        const options: NormalizationOptions = {
          getDataID: defaultGetDataID,
          treatMissingFieldsAsNull: false,
          deferDeduplicatedFields: false,
          log: undefined,
          // TODO: Incremental payloads need a path
          // TODO: 3D requires extra stuff here
        };
        const payload = normalizeResponse(
          response,
          selector,
          typename,
          options,
          false, // useExecTimeResolvers
        );
        // Return as a normalized response: flat record map with is_normalized flag.
        // OperationExecutor will skip normalization and commit directly to the store.
        return {
          data: payload.source.toJSON(),
          extensions: {
            ...((response: $FlowFixMe).extensions),
            is_normalized: true,
          },
        };
      });
    };

    // Assemble the Relay environment from a record source, store, and network.
    const source = new RecordSource();
    const store = new Store(source);
    const environment = new Environment({
      network: {execute},
      store,
    });

    // Define a query to fetch.
    const query = graphql`
      query fetchQueryExampleQuery($id: ID!) {
        node(id: $id) {
          id
          ... on User {
            name
          }
        }
      }
    `;

    // Execute the query and await the result.
    const data = await fetchQuery(environment, query, {id: '4'}).toPromise();

    // Verify we got back the data from our mocked network response.
    // Note: fetchQuery returns data shaped by the fragment reader, which
    // strips fields like __typename that weren't explicitly selected.
    expect(data).toEqual({
      node: {
        id: '4',
        name: 'Mark',
      },
    });
  });
});
