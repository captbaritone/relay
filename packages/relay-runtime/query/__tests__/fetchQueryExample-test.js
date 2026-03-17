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

const fetchQuery = require('../fetchQuery');
const {Environment, Network, RecordSource, Store, graphql} = require('relay-runtime');
const {disallowConsoleErrors, disallowWarnings} = require('relay-test-utils-internal');

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

    // Create a network implementation that returns our hardcoded response.
    const network = Network.create(() => Promise.resolve(networkResponse));

    // Assemble the Relay environment from a record source, store, and network.
    const source = new RecordSource();
    const store = new Store(source);
    const environment = new Environment({network, store});

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
