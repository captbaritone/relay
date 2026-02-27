/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @oncall relay
 */

'use strict';

const RelayNetwork = require('../../network/RelayNetwork');
const RelayObservable = require('../../network/RelayObservable');
const RelayFeatureFlags = require('../../util/RelayFeatureFlags');
const RelayModernEnvironment = require('../RelayModernEnvironment');
const {
  createOperationDescriptor,
} = require('../RelayModernOperationDescriptor');
const RelayModernStore = require('../RelayModernStore');
const RelayPublishQueue = require('../RelayPublishQueue');
const RelayRecordSource = require('../RelayRecordSource');
const defaultGetDataID = require('../defaultGetDataID');
const {
  disallowWarnings,
  expectWarningWillFire,
} = require('relay-test-utils-internal');

// Re-use existing test queries to avoid needing to recompile
const CommitPayloadQuery = require('./__generated__/RelayModernEnvironmentCommitPayloadTestActorQuery.graphql');
const CommitPayloadQuery2 = require('./__generated__/RelayModernEnvironmentCommitPayloadTest2ActorQuery.graphql');

disallowWarnings();

describe('RelayPublishQueue scheduleBatchedRun', () => {
  let store;
  let source;
  let logEvents;
  let scheduledCallbacks;
  let originalBatchFn;

  beforeEach(() => {
    logEvents = [];
    scheduledCallbacks = [];
    originalBatchFn = RelayFeatureFlags.BATCH_NETWORK_RESPONSES_FN;
    source = RelayRecordSource.create();
    store = new RelayModernStore(source);
  });

  afterEach(() => {
    RelayFeatureFlags.BATCH_NETWORK_RESPONSES_FN = originalBatchFn;
  });

  function createLogFn() {
    return event => {
      logEvents.push(event);
    };
  }

  function setBatchScheduler() {
    RelayFeatureFlags.BATCH_NETWORK_RESPONSES_FN = callback => {
      scheduledCallbacks.push(callback);
      let disposed = false;
      return {
        dispose: () => {
          disposed = true;
          scheduledCallbacks = scheduledCallbacks.filter(cb => cb !== callback);
        },
      };
    };
  }

  function flushBatch() {
    const callbacks = [...scheduledCallbacks];
    scheduledCallbacks = [];
    for (const cb of callbacks) {
      cb();
    }
  }

  describe('PublishQueue unit tests', () => {
    let queue;
    let notifySpy;

    beforeEach(() => {
      queue = new RelayPublishQueue(
        store,
        null,
        defaultGetDataID,
        [],
        createLogFn(),
      );
      notifySpy = jest.spyOn(store, 'notify');
    });

    afterEach(() => {
      notifySpy.mockRestore();
    });

    it('calls run() synchronously when flag is null', () => {
      RelayFeatureFlags.BATCH_NETWORK_RESPONSES_FN = null;

      const op = createOperationDescriptor(CommitPayloadQuery, {});
      const callback = jest.fn();

      queue.commitPayload(op, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });

      queue.scheduleBatchedRun(op, callback);

      // Should have called run() and notify() synchronously
      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('defers run() when batch flag is set', () => {
      setBatchScheduler();

      const op = createOperationDescriptor(CommitPayloadQuery, {});
      const callback = jest.fn();

      queue.commitPayload(op, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });

      queue.scheduleBatchedRun(op, callback);

      // Callback not yet called
      expect(callback).toHaveBeenCalledTimes(0);
      expect(notifySpy).toHaveBeenCalledTimes(0);
      expect(scheduledCallbacks.length).toBe(1);

      // Flush the batch
      flushBatch();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });

    it('coalesces multiple scheduleBatchedRun calls into one run()', () => {
      setBatchScheduler();

      const op1 = createOperationDescriptor(CommitPayloadQuery, {});
      const op2 = createOperationDescriptor(CommitPayloadQuery2, {});
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      queue.commitPayload(op1, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });

      queue.scheduleBatchedRun(op1, callback1);

      queue.commitPayload(op2, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {
            __id: '1',
            __typename: 'User',
            name: 'Bob',
            birthdate: {day: 1, month: 1, year: 2000},
          },
        }),
        fieldPayloads: [],
        errors: null,
      });

      queue.scheduleBatchedRun(op2, callback2);

      // Only one batch should be scheduled
      expect(scheduledCallbacks.length).toBe(1);

      // Neither callback has fired
      expect(callback1).toHaveBeenCalledTimes(0);
      expect(callback2).toHaveBeenCalledTimes(0);

      flushBatch();

      // Both callbacks fired
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      // notify was called only once
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });

    it('handles run() called during batch window (e.g. from commitUpdate)', () => {
      setBatchScheduler();

      const op = createOperationDescriptor(CommitPayloadQuery, {});
      const callback = jest.fn();

      queue.commitPayload(op, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });

      queue.scheduleBatchedRun(op, callback);

      // Simulate commitUpdate calling run() directly during batch window
      queue.commitUpdate(storeProxy => {
        const user = storeProxy.get('1');
        if (user) {
          user.setValue('Alice Updated', 'name');
        }
      });
      queue.run();

      // run() processes ALL pending data (including the network response data)
      expect(notifySpy).toHaveBeenCalledTimes(1);

      // But the scheduled callback hasn't fired yet
      expect(callback).toHaveBeenCalledTimes(0);

      // Flush the batch — run() finds no pending data, but callback fires
      expectWarningWillFire(
        'RelayPublishQueue.run was called, but the call would have been a noop.',
      );
      flushBatch();

      expect(callback).toHaveBeenCalledTimes(1);
      // notify called once from the explicit run().
      // The batch flush calls run() again but it's a noop (no pending data),
      // so notify is not called a second time.
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });

    it('emits batch log events', () => {
      setBatchScheduler();

      const op = createOperationDescriptor(CommitPayloadQuery, {});

      queue.commitPayload(op, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });

      queue.scheduleBatchedRun(op, () => {});

      const batchStartEvents = logEvents.filter(
        e => e.name === 'publishqueue.batch.start',
      );
      expect(batchStartEvents.length).toBe(1);

      flushBatch();

      const batchCompleteEvents = logEvents.filter(
        e => e.name === 'publishqueue.batch.complete',
      );
      expect(batchCompleteEvents.length).toBe(1);
      expect(batchCompleteEvents[0].batchSize).toBe(1);
      expect(batchCompleteEvents[0].operationNames).toEqual([
        'RelayModernEnvironmentCommitPayloadTestActorQuery',
      ]);
      expect(typeof batchCompleteEvents[0].batchDuration).toBe('number');
    });

    it('logs correct batch size and operation names for coalesced runs', () => {
      setBatchScheduler();

      const op1 = createOperationDescriptor(CommitPayloadQuery, {});
      const op2 = createOperationDescriptor(CommitPayloadQuery2, {});

      queue.commitPayload(op1, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });
      queue.scheduleBatchedRun(op1, () => {});

      queue.commitPayload(op2, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {
            __id: '1',
            __typename: 'User',
            name: 'Bob',
            birthdate: {day: 1, month: 1, year: 2000},
          },
        }),
        fieldPayloads: [],
        errors: null,
      });
      queue.scheduleBatchedRun(op2, () => {});

      flushBatch();

      const batchCompleteEvents = logEvents.filter(
        e => e.name === 'publishqueue.batch.complete',
      );
      expect(batchCompleteEvents.length).toBe(1);
      expect(batchCompleteEvents[0].batchSize).toBe(2);
      expect(batchCompleteEvents[0].operationNames).toEqual(
        expect.arrayContaining([
          'RelayModernEnvironmentCommitPayloadTestActorQuery',
          'RelayModernEnvironmentCommitPayloadTest2ActorQuery',
        ]),
      );
    });

    it('records epochs for all batched operations', () => {
      setBatchScheduler();

      const op1 = createOperationDescriptor(CommitPayloadQuery, {});
      const op2 = createOperationDescriptor(CommitPayloadQuery2, {});

      // Retain both operations so epochs are tracked
      const retain1 = store.retain(op1);
      const retain2 = store.retain(op2);

      const epochBefore = store.getEpoch();

      queue.commitPayload(op1, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Alice'},
        }),
        fieldPayloads: [],
        errors: null,
      });
      queue.scheduleBatchedRun(op1, () => {});

      queue.commitPayload(op2, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {
            __id: '1',
            __typename: 'User',
            name: 'Bob',
            birthdate: {day: 1, month: 1, year: 2000},
          },
        }),
        fieldPayloads: [],
        errors: null,
      });
      queue.scheduleBatchedRun(op2, () => {});

      flushBatch();

      const epochAfter = store.getEpoch();
      expect(epochAfter).toBeGreaterThan(epochBefore);

      // Verify recordOperationEpoch was called for the second operation
      // by checking that both operations' root entries have the current epoch
      const recordOperationEpochSpy = jest.spyOn(store, 'recordOperationEpoch');

      // Schedule another batch to verify the spy works
      queue.commitPayload(op1, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {__id: '1', __typename: 'User', name: 'Charlie'},
        }),
        fieldPayloads: [],
        errors: null,
      });
      queue.scheduleBatchedRun(op1, () => {});
      queue.commitPayload(op2, {
        source: RelayRecordSource.create({
          'client:root': {
            __id: 'client:root',
            __typename: '__Root',
            me: {__ref: '1'},
          },
          '1': {
            __id: '1',
            __typename: 'User',
            name: 'Dave',
            birthdate: {day: 2, month: 2, year: 2001},
          },
        }),
        fieldPayloads: [],
        errors: null,
      });
      queue.scheduleBatchedRun(op2, () => {});
      flushBatch();

      // recordOperationEpoch should have been called for one of the two
      // operations (the other is handled by notify via run)
      expect(recordOperationEpochSpy).toHaveBeenCalledTimes(1);

      recordOperationEpochSpy.mockRestore();
      retain1.dispose();
      retain2.dispose();
    });
  });

  describe('Environment integration tests', () => {
    let environment;

    function createEnvironment(fetch) {
      environment = new RelayModernEnvironment({
        // $FlowFixMe[invalid-tuple-arity]
        network: RelayNetwork.create(fetch),
        store,
        log: createLogFn(),
      });
      return environment;
    }

    describe('without batching', () => {
      it('processes responses synchronously', () => {
        RelayFeatureFlags.BATCH_NETWORK_RESPONSES_FN = null;

        let subject;
        const fetch = jest.fn(() =>
          RelayObservable.create(sink => {
            subject = sink;
          }),
        );
        const env = createEnvironment(fetch);
        const operation = createOperationDescriptor(CommitPayloadQuery, {});
        const next = jest.fn();
        env.execute({operation}).subscribe({next});

        subject.next({
          data: {me: {id: '1', __typename: 'User', name: 'Alice'}},
        });

        expect(next).toHaveBeenCalledTimes(1);
        const snapshot = env.lookup(operation.fragment);
        expect(snapshot.data).toEqual({me: {name: 'Alice'}});
      });
    });

    describe('with batching enabled', () => {
      beforeEach(() => {
        setBatchScheduler();
      });

      it('defers network response notification until batch fires', () => {
        let subject;
        const fetch = jest.fn(() =>
          RelayObservable.create(sink => {
            subject = sink;
          }),
        );
        const env = createEnvironment(fetch);
        const operation = createOperationDescriptor(CommitPayloadQuery, {});
        const next = jest.fn();
        env.execute({operation}).subscribe({next});

        subject.next({
          data: {me: {id: '1', __typename: 'User', name: 'Alice'}},
        });

        expect(next).toHaveBeenCalledTimes(0);
        expect(scheduledCallbacks.length).toBe(1);

        flushBatch();

        expect(next).toHaveBeenCalledTimes(1);
        const snapshot = env.lookup(operation.fragment);
        expect(snapshot.data).toEqual({me: {name: 'Alice'}});
      });

      it('coalesces two independent query responses into one notify', () => {
        let subject1;
        let subject2;
        let fetchCount = 0;
        const fetch = jest.fn(() =>
          RelayObservable.create(sink => {
            fetchCount++;
            if (fetchCount === 1) {
              subject1 = sink;
            } else {
              subject2 = sink;
            }
          }),
        );
        const env = createEnvironment(fetch);
        const op1 = createOperationDescriptor(CommitPayloadQuery, {});
        const op2 = createOperationDescriptor(CommitPayloadQuery2, {});

        const next1 = jest.fn();
        const next2 = jest.fn();
        env.execute({operation: op1}).subscribe({next: next1});
        env.execute({operation: op2}).subscribe({next: next2});

        const notifySpy = jest.spyOn(store, 'notify');

        subject1.next({
          data: {me: {id: '1', __typename: 'User', name: 'Alice'}},
        });
        subject2.next({
          data: {
            me: {
              id: '1',
              __typename: 'User',
              name: 'Bob',
              birthdate: {day: 1, month: 1, year: 2000},
            },
          },
        });

        expect(scheduledCallbacks.length).toBe(1);
        expect(next1).toHaveBeenCalledTimes(0);
        expect(next2).toHaveBeenCalledTimes(0);

        flushBatch();

        expect(next1).toHaveBeenCalledTimes(1);
        expect(next2).toHaveBeenCalledTimes(1);
        expect(notifySpy).toHaveBeenCalledTimes(1);

        notifySpy.mockRestore();
      });

      it('preserves next-before-complete ordering', () => {
        let subject;
        const fetch = jest.fn(() =>
          RelayObservable.create(sink => {
            subject = sink;
          }),
        );
        const env = createEnvironment(fetch);
        const operation = createOperationDescriptor(CommitPayloadQuery, {});

        const callOrder = [];
        const next = jest.fn(() => callOrder.push('next'));
        const complete = jest.fn(() => callOrder.push('complete'));
        env.execute({operation}).subscribe({next, complete});

        subject.next({
          data: {me: {id: '1', __typename: 'User', name: 'Alice'}},
        });
        subject.complete();

        expect(next).toHaveBeenCalledTimes(0);
        expect(complete).toHaveBeenCalledTimes(0);

        flushBatch();

        expect(next).toHaveBeenCalledTimes(1);
        expect(complete).toHaveBeenCalledTimes(1);
        expect(callOrder).toEqual(['next', 'complete']);
      });

      it('optimistic updates remain synchronous with batching enabled', () => {
        let subject;
        const fetch = jest.fn(() =>
          RelayObservable.create(sink => {
            subject = sink;
          }),
        );
        const env = createEnvironment(fetch);
        const operation = createOperationDescriptor(CommitPayloadQuery, {});

        // Populate store
        env.commitPayload(operation, {
          me: {id: '1', __typename: 'User', name: 'Alice'},
        });

        const snapshot = env.lookup(operation.fragment);
        expect(snapshot.data).toEqual({me: {name: 'Alice'}});

        // Optimistic update should be synchronous
        const disposable = env.applyUpdate({
          storeUpdater: storeProxy => {
            const me = storeProxy.get('1');
            if (me) {
              me.setValue('Optimistic Alice', 'name');
            }
          },
        });

        const snapshotAfter = env.lookup(operation.fragment);
        expect(snapshotAfter.data).toEqual({me: {name: 'Optimistic Alice'}});

        disposable.dispose();
      });

      it('commitUpdate during batch window processes all data', () => {
        let subject;
        const fetch = jest.fn(() =>
          RelayObservable.create(sink => {
            subject = sink;
          }),
        );
        const env = createEnvironment(fetch);
        const operation = createOperationDescriptor(CommitPayloadQuery, {});
        const next = jest.fn();
        env.execute({operation}).subscribe({next});

        subject.next({
          data: {me: {id: '1', __typename: 'User', name: 'Alice'}},
        });
        expect(next).toHaveBeenCalledTimes(0);

        // commitUpdate processes everything synchronously
        env.commitUpdate(storeProxy => {
          const me = storeProxy.get('1');
          if (me) {
            me.setValue('Alice Updated', 'name');
          }
        });

        const snapshot = env.lookup(operation.fragment);
        expect(snapshot.data).toEqual({me: {name: 'Alice Updated'}});

        // Batch still fires and delivers next callback.
        // run() will be a noop since commitUpdate already processed everything,
        // but the callback still fires.
        expectWarningWillFire(
          'RelayPublishQueue.run was called, but the call would have been a noop.',
        );
        flushBatch();
        expect(next).toHaveBeenCalledTimes(1);
      });
    });
  });
});
