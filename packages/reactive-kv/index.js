/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import invariant from 'invariant';

type Key = string;
type StoreRecord<V> =
  | ConcreteRecord<V>
  | DerivedRecord<V>
  | UninitializedRecord<V>;
type Getter<V> = (key: Key) => ?V;
type Reader<T> = {
  read(): T,
  subscribe: (cb: () => void) => () => void,
};

// A simple concrete value tied to a key
type ConcreteRecord<V> = {
  type: 'CONCRETE',
  value: V,
  lastUpdatedAtEpoch: number,
  dependents: ?Set<Derived<V>>,
};

// A lazily recomputed value in the store derived from arbitrary other values in
// the store.
type DerivedRecord<V> = {
  type: 'DERIVED',
  deriver: (get: Getter<V>) => V,
  dependencies: Set<StoreRecord<V>>,
  lastUpdatedAtEpoch: number,
  lastVerifiedAtEpoch: number,
  dirty: boolean,
  value: V,
  dependents: ?Set<Derived<V>>,
};

// Used for external subscription's views of the store. Reuses the same lazy
// recomputation strategy as DerivedRecord, but does not become a record in the
// store, and therefore cannot be depended upon by other DerivedRecords.
// Leaf nodes in the dependency graph.
type DerivedExternal<V> = {
  type: 'DERIVED_EXTERNAL',
  deriver: (get: Getter<V>) => V,
  dependencies: Set<StoreRecord<V>>,
  lastUpdatedAtEpoch: number,
  lastVerifiedAtEpoch: number,
  dirty: boolean,
  value: V,
  subscriptions: ?Set<() => void>,
};

// A placeholder for records that don't yet exist, or have been deleted.
type UninitializedRecord<V> = {
  type: 'UNINITIALIZED',
  value: void,
  lastUpdatedAtEpoch: number,
  dependents: ?Set<Derived<V>>,
};

type Derived<V> = DerivedRecord<V> | DerivedExternal<V>;

/**
 * ReactiveKV: A lazy, reactive key-value store.
 */
export default class ReactiveKV<V> {
  size: number = 0; // Because of uninitialized records, we maintain our own size.
  _epoch: number = 0;
  _records: Map<Key, StoreRecord<V>> = new Map();
  _toNotify: Set<DerivedExternal<V>> = new Set();

  /**
   * Write a concrete value to the store invalidating any derived values that
   * depended upon previous values.
   */
  set(key: Key, value: V) {
    this._epoch++;
    let record: ?StoreRecord<V> = this._records.get(key);
    if (record != null) {
      if (record.type === 'UNINITIALIZED') {
        record.type = 'CONCRETE';
        // We are lying to Flow here by mutating an object from one
        // type to another. This is required in order to preserve dependency
        // object references.
        // $FlowFixMe
        record.value = value;
        record.lastUpdatedAtEpoch = this._epoch;
        this.size++;
      } else if (record.type === 'CONCRETE') {
        if (Object.is(record.value, value)) {
          return;
        }
        record.value = value;
        record.lastUpdatedAtEpoch = this._epoch;
      }
    } else {
      record = {
        type: 'CONCRETE',
        value,
        lastUpdatedAtEpoch: this._epoch,
        dependents: null,
      };
      this.size++;
      this._records.set(key, record);
    }

    if (record.dependents != null) {
      this._markDependentsDirty(record.dependents);
    }
  }

  /**
   * Define a derived value in the store.
   */
  setDerived(key: Key, deriver: (getter: Getter<V>) => V): void {
    this.size++;
    const record = this._records.get(key);

    // $FlowFixMe Our internal logic ensures we never read a dirty value
    const value: V = undefined;
    if (record != null) {
      if (record.type === 'UNINITIALIZED') {
        this._epoch++;
        // We are lying to Flow here by mutating an object from one type to
        // another. This is required in order to preserve dependency object
        // references.
        // $FlowFixMe
        const derivedRecord: DerivedRecord<V> = record;
        derivedRecord.type = 'DERIVED';
        derivedRecord.deriver = deriver;
        derivedRecord.dependencies = new Set();
        // Note: We use the store's epoch here, rather than -1, to ensure that
        // anyone who depends upon this node recomputes.
        derivedRecord.lastUpdatedAtEpoch = this._epoch;
        derivedRecord.lastVerifiedAtEpoch = -1;
        derivedRecord.dirty = true;
        derivedRecord.value = value;
        if (derivedRecord.dependents != null) {
          this._markDependentsDirty(derivedRecord.dependents);
        }
      } else {
        throw new Error(
          'TODO: Support updating derived values with a new deriver.',
        );
      }
    } else {
      this._records.set(key, {
        type: 'DERIVED',
        deriver,
        dependencies: new Set(),
        lastUpdatedAtEpoch: -1,
        lastVerifiedAtEpoch: -1,
        dirty: true,
        value,
        dependents: null,
      });
    }
  }

  /**
   * Get notified when a specific record gets marked dirty.
   *
   * Useful for lazy subscriptions that avoid zombie children problems. For example,
   * if you have updates which are frequent and dirty a large number of records, you
   * could allow React components to subscribe to records using `useState`'s
   * callback style:
   *
   * function useDerivedValue(deriver) {
   *   const reader = useMemo(() => store.readDerived(deriver), [deriver])
   *   const [value, setValue] = useState(() => reader.read());
   *   useEffect(() => {
   *     return store.subscribe(() => {
   *       setState(() => reader.read())
   *     })
   *   }, [reader]);
   *   return value;
   * }
   *
   * Note: Currently this uses explicity dirty marking. However this requires
   * explicit dependency tracking which consumes memory and adds overhead to
   * writes.
   *
   * This API could also be implemented were dependency nodes don't know they
   * are depended upon, and instead maintain these subscriptions at the store
   * root. After each update we could then each subscribed value for overlap
   * with the updated/invalidated ids. This would mirror what Relay's Store
   * Subscription does today.
   *
   * We could even offer _both_ options and let users choose the right one for
   * them.
   */
  readDerived(deriver: (getter: Getter<V>) => V): Reader<V> {
    const record: DerivedExternal<V> = {
      type: 'DERIVED_EXTERNAL',
      deriver,
      dependencies: new Set(),
      lastUpdatedAtEpoch: -1,
      lastVerifiedAtEpoch: -1,
      dirty: true,
      subscriptions: null,
      // $FlowFixMe Our logic ensures we never use a dirty value
      value: undefined,
    };

    // Maybe we should do this in subscribe? If you subscribe without reading,
    // you will probably be confused, because we are not watching any records.
    this._update(record);

    return {
      read: () => {
        if (record.dirty) {
          this._update(record);
        }
        return record.value;
      },
      subscribe: (cb: () => void): (() => void) => {
        // TODO: Maybe expect only one subscriber?
        const wrapped = () => cb();
        if (record.subscriptions == null) {
          record.subscriptions = new Set([wrapped]);
        } else {
          record.subscriptions.add(wrapped);
        }
        return () => {
          if (record.subscriptions == null) {
            // Someone must have called unsubscribe multiple times.
            return;
          }
          record.subscriptions.delete(wrapped);
          invariant(
            record.subscriptions != null,
            'Expected subscriptions to still exist.',
          );
          if (record.subscriptions.size == 0) {
            record.subscriptions = undefined;

            // We now clean dependencies and reset the record.
            // This reclaims memory but also allows the value to be recomputed
            // in the future. In the common case, this operation will result in
            // nobody holding a reference to this record object any more.

            // Note: If this teardown is too expensive, we could instead use a
            // tombstone approach, where we mark this record as dead via some
            // means (perhaps by setting `dependencies` to null). Then, we
            // encounter such a record during invalidation, we could remove this
            // record from its dependents dependencies set at that point.
            for (const dependency of record.dependencies) {
              invariant(
                dependency.dependents != null,
                'Expected our dependency to have dependents.',
              );
              dependency.dependents.delete(record);
            }
            record.dirty = true;
            // $FlowFixMe Our logic ensures we never use a dirty value
            record.value = undefined;
            record.lastUpdatedAtEpoch = -1;
          }
        };
      },
    };
  }

  /**
   * Read the current value of a record (concrete or derived) in the store.
   */
  get(key: Key): ?V {
    const record = this._getCurrent(key);
    if (record == null) {
      return undefined;
    }
    return record.value;
  }

  has(key: Key): boolean {
    const record = this._records.get(key);
    return record != null && record.type !== 'UNINITIALIZED';
  }

  keys(): Array<Key> {
    const entries = this._records.entries();
    const keys: Array<Key> = [];
    for (const [key, value] of entries) {
      if (value.type !== 'UNINITIALIZED') {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Delete a value.
   */
  delete(key: Key): void {
    const record = this._records.get(key);
    if (record == null || record.type === 'UNINITIALIZED') {
      return;
    }
    this.size--;

    // Tell our dependencies we don't care about them anymore.
    if (record.type === 'DERIVED') {
      this._updateDependencies(record, new Set());
    }

    if (record.dependents != null) {
      this._epoch++;
      if (record.type === 'CONCRETE') {
        // Someone is still depending on this value, but it's now deleted. We
        // must convert it to an uninitialized record.

        // Here we lie to Flow in order to change this objects type while
        // retaining its referential identity.
        // $FlowFixMe
        record.type = 'UNINITIALIZED';
        // $FlowFixMe
        record.value = undefined;
        record.lastUpdatedAtEpoch = this._epoch;
      } else {
        throw new Error('TODO: Support uninitialized derived values.');
      }
      if (record.dependents != null) {
        this._markDependentsDirty(record.dependents);
      }
    } else {
      this._records.delete(key);
    }
  }

  /**
   * Notify all external subscribers of updates.
   */
  notify(): void {
    for (const derivedExternal of this._toNotify) {
      if (derivedExternal.subscriptions != null) {
        for (const sub of derivedExternal.subscriptions) {
          sub();
        }
      }
    }

    this._toNotify = new Set();
  }

  // Used for debug purposes.
  toJSON(): {[Key]: ?V} {
    const obj: {[Key]: ?V} = {};
    for (const [key, value] of this._records) {
      // TODO: What should we do with derived values?
      if (value.type === 'CONCRETE') {
        obj[key] = value.value;
      }
    }
    return obj;
  }

  /**
   * Recursively mark all derived values that depend upon this record (directly
   * or transitively) as dirty.
   */
  _markDependentsDirty(dependents: Set<Derived<V>>) {
    for (const dependent of dependents) {
      if (dependent.dirty) {
        return;
      }
      dependent.dirty = true;
      // This conditional is only here to appease the typechecker.
      if (dependent.type === 'DERIVED_EXTERNAL') {
        if (dependent.subscriptions != null) {
          this._toNotify.add(dependent);
        }
      } else {
        if (dependent.dependents) {
          this._markDependentsDirty(dependent.dependents);
        }
      }
    }
  }

  /**
   * Get a record, ensuring it is up to date.
   */
  _getCurrent(key: Key): ?StoreRecord<V> {
    const record = this._records.get(key);
    if (record == null) {
      return undefined;
    }
    if (record.type === 'DERIVED' && record.dirty) {
      this._update(record);
    }
    return record;
  }

  /**
   * Get a record, ensuring it is up to date. If the key does not exist, create
   * a uninitialized record.
   */
  _getCurrentOrUninitialized(key: Key): StoreRecord<V> {
    const record = this._getCurrent(key);
    if (record == null) {
      const newRecord = {
        type: 'UNINITIALIZED',
        lastUpdatedAtEpoch: this._epoch,
        value: undefined,
        dependents: null,
      };
      this._records.set(key, newRecord);
      return newRecord;
    }
    return record;
  }

  // Takes a dirty derived value and ensures its up to date with a warm cache.
  // Tries to avoid actually recomputing the value if no dependencies have
  // actually changed.
  _update(record: Derived<V>) {
    // We are dirty. Some of our inputs have _potentially_ changed, but we
    // don't know which, if any, have _actually_ changed.

    // If we've never been computed, recompute right away. If we were deleted
    // and added back, we need to be recomputed. In this case we will have a
    // `lastUpdatedAtEpoch` of the epoch at which we were set, but no
    // dependencies.
    //
    // It should be impossible for an up to date resolver that has zero
    // dependencies to ever get to this point because there is not way for it to
    // have been marked dirty.
    if (record.lastUpdatedAtEpoch === -1 || record.dependencies.size === 0) {
      this._recompute(record);
      record.dirty = false;
      record.lastVerifiedAtEpoch = this._epoch;
      return;
    }

    // Check each of our dependencies to see if they have changed since our last
    // read.
    for (const dependency of record.dependencies) {
      // If our dependency is itself derived _and_ dirty, we first ask it to
      // recompute itself. This gives depth-first recomputation, allowing us to
      // short-circuit if none of our dependencies have changed.
      if (dependency.type === 'DERIVED' && dependency.dirty) {
        this._update(dependency);
      }
      if (dependency.lastUpdatedAtEpoch > record.lastVerifiedAtEpoch) {
        // One of our dependencies has changed since we were last verified.
        // We must recompute.

        // We intentionally avoid calling _update on any more of our
        // dependencies, because they may not be read when we recompute.
        // e.g. an edge change in a fragment.
        this._recompute(record);
        break;
      }
    }

    // We were marked dirty, but none of our dependencies actually changed. We
    // can mark ourselves clean.
    record.dirty = false;
    record.lastVerifiedAtEpoch = this._epoch;
  }

  // Recomputes a Derived value, and manages any dependency changes.
  _recompute(record: Derived<V>) {
    // Construct a `get` function that tracks seen keys.
    const seenRecords: Set<StoreRecord<V>> = new Set();
    let lastDependencyUpdate = record.lastUpdatedAtEpoch;

    // TODO: This could be a class method with a stack of getter contexts
    // (rather than relying on the JS stack).
    const get = (key: Key): ?V => {
      const record = this._getCurrentOrUninitialized(key);
      seenRecords.add(record);
      if (record.lastUpdatedAtEpoch > lastDependencyUpdate) {
        lastDependencyUpdate = record.lastUpdatedAtEpoch;
      }
      return record.value;
    };

    // TODO: Pass in old value to enable recyle into?
    const newValue = record.deriver(get);

    if (Object.is(newValue, record.value)) {
      // We didn't change, so we leave our lastUpdatedAtEpoch as is.
      // This will allow our dependents to avoid reevaluating if they
      // had already computed with our previous value.
    } else {
      // Not only did our inputs change, but _we_ changed!
      record.value = newValue;
      // We changed, so we have to report a new update epoch. Our dependents
      // will use this to know that they also must update.
      //
      // Note: We only compute if one of our dependencies is newer than our last
      // update. So this value should only ever _increase_. We might pickup some
      // dependencies which last updated during an older epoch, but the _most
      // recent_ dependency will only ever increase.
      record.lastUpdatedAtEpoch = lastDependencyUpdate;
    }

    this._updateDependencies(record, seenRecords);
  }

  /**
   * Checks for any differences between the derived record's previous
   * dependencies, and its new dependencies. Starts tracking new dependencies
   * and cleans up old ones.
   */
  _updateDependencies(
    record: Derived<V>,
    newDependencies: Set<StoreRecord<V>>,
  ) {
    // This set will be replaced, so we mutate it in place to track overlap.
    const oldDependencies = record.dependencies;

    // Add any new dependencies
    for (const newDependency of newDependencies) {
      if (!oldDependencies.has(newDependency)) {
        // Lazily create dependency set
        if (newDependency.dependents == null) {
          newDependency.dependents = new Set([record]);
        } else {
          newDependency.dependents.add(record);
        }
      } else {
        oldDependencies.delete(newDependency);
      }
    }

    // We are now left with oldDependencies being just the dependencies that are
    // no-longer depended upon.

    // TODO: Could we use a WeakSet to have the runtime handle some of this for us?

    // Remove any old dependencies
    for (const dependency of oldDependencies) {
      invariant(
        dependency.dependents != null,
        'Expected our dependency to have a dependent',
      );
      dependency.dependents.delete(record);

      // Reclaim memory if this record has no remaining dependents
      if (dependency.dependents?.size === 0) {
        dependency.dependents = null;
        // Note: If we also have no subscribers here, we could consider deleting
        // the value and resetting the epoch to reclaim memory.
      }
    }
    record.dependencies = newDependencies;
  }
}
