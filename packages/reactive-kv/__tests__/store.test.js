/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import ReactiveKV from '../';

describe('.setDerived', () => {
  test('lazy initialization', () => {
    const store = new ReactiveKV<number>();

    const floored = jest.fn(get => Math.floor(get('a')));
    const twiceFloored = jest.fn(get => get('floored') * 2);
    store.setDerived('floored', floored);
    store.setDerived('twiceFloored', twiceFloored);
    store.set('a', 1.5);

    // Writes are lazy. No derive functions should have been called
    expect(floored.mock.calls.length).toBe(0);
    expect(twiceFloored.mock.calls.length).toBe(0);
  });

  test('all dependencies called on read', () => {
    const store = new ReactiveKV<number>();

    const floored = jest.fn(get => Math.floor(get('a')));
    const twiceFloored = jest.fn(get => get('floored') * 2);
    store.setDerived('floored', floored);
    store.setDerived('twiceFloored', twiceFloored);
    store.set('a', 1.5);

    expect(store.get('twiceFloored')).toBe(2);
    expect(floored.mock.calls.length).toBe(1);
    expect(twiceFloored.mock.calls.length).toBe(1);
  });

  test('only needed dependencies called on read', () => {
    const store = new ReactiveKV<number>();

    const floored = jest.fn(get => Math.floor(get('a')));
    const twiceFloored = jest.fn(get => get('floored') * 2);
    store.setDerived('floored', floored);
    store.setDerived('twiceFloored', twiceFloored);
    store.set('a', 1.5);

    expect(store.get('floored')).toBe(1);
    expect(floored.mock.calls.length).toBe(1);
    expect(twiceFloored.mock.calls.length).toBe(0);
  });

  test('only needed dependencies called on read after update', () => {
    const store = new ReactiveKV<number>();

    const floored = jest.fn(get => Math.floor(get('a')));
    const twiceFloored = jest.fn(get => get('floored') * 2);
    store.setDerived('floored', floored);
    store.setDerived('twiceFloored', twiceFloored);
    store.set('a', 1.5);

    // Warm cache
    expect(store.get('twiceFloored')).toBe(2);

    // Write new value
    store.set('a', 1);

    // Read same value
    expect(store.get('twiceFloored')).toBe(2);
    expect(floored.mock.calls.length).toBe(2);
    expect(twiceFloored.mock.calls.length).toBe(1);
  });

  test('read after derived dependnecy (derived does not change)', () => {
    const store = new ReactiveKV<number>();

    const floored = jest.fn(get => Math.floor(get('a')));
    const twiceFloored = jest.fn(get => get('floored') * 2);
    store.setDerived('floored', floored);
    store.setDerived('twiceFloored', twiceFloored);
    store.set('a', 1.5);

    // Warm cache
    expect(store.get('twiceFloored')).toBe(2);

    // Write new value
    store.set('a', 1);

    // Read same value
    expect(store.get('floored')).toBe(1);
    expect(floored.mock.calls.length).toBe(2);
    expect(twiceFloored.mock.calls.length).toBe(1);

    expect(store.get('twiceFloored')).toBe(2);
    expect(floored.mock.calls.length).toBe(2);
    expect(twiceFloored.mock.calls.length).toBe(1);
  });

  test('read after derived dependnecy (derived Object.is the previous)', () => {
    const store = new ReactiveKV<number | boolean>();

    // We use NaN here to ensure we are using Object.is and not ===
    const dividedByNaN = jest.fn(get => get('a') / Number.NaN);
    const isNaN = jest.fn(get => Number.isNaN(get('dividedByNaN')));
    store.setDerived('dividedByNaN', dividedByNaN);
    store.setDerived('isNaN', isNaN);
    store.set('a', 1.5);

    // Warm cache
    expect(store.get('dividedByNaN')).toEqual(NaN);
    expect(store.get('isNaN')).toBe(true);

    // Write new value
    store.set('a', 1);

    // Read same value
    expect(store.get('isNaN')).toBe(true);
    expect(dividedByNaN.mock.calls.length).toBe(2);
    // dividedByNaN did not change, so we should not need to reevaluate isNaN
    expect(isNaN.mock.calls.length).toBe(1);

    expect(store.get('isNaN')).toBe(true);
    expect(dividedByNaN.mock.calls.length).toBe(2);
    expect(isNaN.mock.calls.length).toBe(1);
  });

  test('read after derived dependency (derived _does_ change)', () => {
    const store = new ReactiveKV<number>();

    const floored = jest.fn(get => Math.floor(get('a')));
    const twiceFloored = jest.fn(get => get('floored') * 2);
    store.setDerived('floored', floored);
    store.setDerived('twiceFloored', twiceFloored);
    store.set('a', 1.5);

    // Warm cache
    expect(store.get('twiceFloored')).toBe(2);

    // Write new value
    store.set('a', 2);

    // Read same value
    expect(store.get('floored')).toBe(2);
    expect(floored.mock.calls.length).toBe(2);
    expect(twiceFloored.mock.calls.length).toBe(1);

    expect(store.get('twiceFloored')).toBe(4);
    expect(floored.mock.calls.length).toBe(2);
    expect(twiceFloored.mock.calls.length).toBe(2);

    store.set('a', 2.1);

    expect(store.get('twiceFloored')).toBe(4);
    expect(floored.mock.calls.length).toBe(3);
    expect(twiceFloored.mock.calls.length).toBe(2);
  });

  test('Derive from a key that starts undefined, but becomes defined as concrete later', () => {
    const store = new ReactiveKV<number>();
    store.setDerived('derived', get => {
      return (get('other') ?? 0) * 2;
    });

    expect(store.get('derived')).toBe(0);
    store.set('other', 100);
    expect(store.get('derived')).toBe(200);
  });

  test('Derive from a key that starts undefined, but becomes defined as derived with zero dependencies later', () => {
    const store = new ReactiveKV<number>();
    store.setDerived('derived', get => {
      return (get('other') ?? 0) * 2;
    });

    expect(store.get('derived')).toBe(0);

    // The fact that this has zero dependencies exercises an edge case where
    // it's lastUpdatedAtEpoch might not get set correctly.
    store.setDerived('other', () => 100);
    expect(store.get('derived')).toBe(200);
  });

  test("Tracking each derived node's last verified at epoch allows us to avoid recomputation", () => {
    // https://excalidraw.com/#room=3d425cfa4ab27a97cf59,6iZq3ng7fyZCzWDVmN0Gcw
    const store = new ReactiveKV<string>();
    store.set('greeting', 'Hello world, Harry');
    const firstPhrase = jest.fn(get => get('greeting').split(',')[0]);
    const firstWord = jest.fn(get => get('first_phrase').split(' ')[0]);
    store.setDerived('first_phrase', firstPhrase);
    store.setDerived('first_word', firstWord);

    expect(store.get('first_word')).toBe('Hello');
    expect(firstWord.mock.calls.length).toBe(1);

    expect(store.set('greeting', 'Hello universe, Harry'));
    expect(store.get('first_word')).toBe('Hello');
    expect(firstWord.mock.calls.length).toBe(2); // first phrase changed, must reevaluate

    expect(store.set('greeting', 'Hello universe, Sally'));
    expect(store.get('first_word')).toBe('Hello');
    // This is the key assertion. If we didn't track the last verified at epoch
    // for each node, this would end up being 3.
    expect(firstWord.mock.calls.length).toBe(2); // first phrase did not change, no need to reevaluate
  });

  test('Reevaluates dependencies in order and rereads on first detected change', () => {
    const store = new ReactiveKV<string>();
    store.set('a', 'Hello');
    const upper = jest.fn(get => (get('a') ?? '').toUpperCase());
    const lower = jest.fn(get => (get('a') ?? '').toLowerCase());
    store.setDerived('upper_case_a', upper);
    store.setDerived('lower_case_a', lower);

    // Conditionally readers "upper_case_a" or "lower_case_a" based on the value
    // of "a".
    store.setDerived('upper_or_lower', get => {
      // Note that "a" is read first.
      const a = get('a') ?? '';
      if (a.length > 3) {
        return get('upper_case_a') ?? '';
      }
      return get('lower_case_a') ?? '';
    });

    expect(store.get('upper_or_lower')).toBe('HELLO');
    expect(upper.mock.calls.length).toBe(1);
    store.set('a', 'Hi');
    expect(store.get('upper_or_lower')).toBe('hi');

    // "upper_or_lower" had a dependency on both "a" and "upper_case_a". By
    // short circuting on the _first_ updated dependency, we avoid rereading
    // "updated_case_a", which is not needed to compute the new state of
    // "upper_or_lower", since it is conditionally read based on the value of
    // "a".
    expect(upper.mock.calls.length).toBe(1);
  });
  test('Derived value with no dependencies is not reevaluated', () => {
    const store = new ReactiveKV<string>();
    const a = jest.fn(get => 'a');
    store.setDerived('a', a);

    expect(store.get('a')).toEqual('a');
    store.set('unrelated_value', 'bar');

    expect(store.get('a')).toEqual('a');
    expect(a.mock.calls.length).toBe(1);
  });
});

test('subscribe to dirty marks', () => {
  const store = new ReactiveKV<number>();

  const floored = jest.fn(get => Math.floor(get('a')));
  const twiceFloored = jest.fn(get => get('floored') * 2);
  store.setDerived('floored', floored);
  store.set('a', 1.5);

  const value = store.readDerived(twiceFloored);

  const sub = jest.fn();
  const unSub = value.subscribe(sub);

  expect(sub.mock.calls.length).toBe(0);

  // Write new value
  store.set('a', 2);
  store.notify();
  // Got notified
  expect(sub.mock.calls.length).toBe(1);

  // Unrelated update
  store.set('b', 1.5);
  // Not notified
  expect(sub.mock.calls.length).toBe(1);

  // Unsubscribe
  unSub();
  // Write new value
  store.set('a', 3);
  store.notify();
  // Not notified
  expect(sub.mock.calls.length).toBe(1);
});

test('Subscribe to a key that starts undefined, but becomes defined later', () => {
  const store = new ReactiveKV<number>();
  const reader = store.readDerived(get => {
    return (get('other') ?? 0) * 2;
  });

  const sub = jest.fn();
  const unsub = reader.subscribe(sub);

  expect(reader.read()).toBe(0);
  store.notify();
  expect(sub.mock.calls.length).toBe(0);
  store.set('other', 100);
  store.notify();
  expect(sub.mock.calls.length).toBe(1);
  expect(reader.read()).toBe(200);
  unsub();
});

describe('.readDerived', () => {
  test('Subscribe to derived value', () => {
    const store = new ReactiveKV<number>();
    const aOrB = jest.fn(get => get('a') || get('b'));
    store.set('a', 1);
    store.set('b', 2);
    const value = store.readDerived(aOrB);

    expect(value.read()).toBe(1);

    const sub = jest.fn();
    const unSub = value.subscribe(sub);

    // We never read b, so changing it should not notify us
    store.set('b', 100);
    expect(sub.mock.calls.length).toBe(0);
    expect(value.read()).toBe(1);

    // However, we did read a, so changing a should notify us
    store.set('a', 0);
    store.notify();
    expect(sub.mock.calls.length).toBe(1);
    expect(value.read()).toBe(100);

    // Now we are also reading b, so changing b should notify us
    store.set('b', 200);
    store.notify();
    expect(sub.mock.calls.length).toBe(2);
    expect(value.read()).toBe(200);

    // Now if we go back to not reading b...
    store.set('a', 1);
    store.notify();
    expect(sub.mock.calls.length).toBe(3);
    expect(value.read()).toBe(1);

    // And then update b again, we should not get notified.
    store.set('b', 300);
    store.notify();
    expect(sub.mock.calls.length).toBe(3);
    expect(value.read()).toBe(1);

    unSub();
  });

  test('Updating a single dependency multiple times result in just one notification', () => {
    const store = new ReactiveKV<number>();
    const getA = jest.fn(get => get('a'));
    store.set('a', 1);
    const value = store.readDerived(getA);

    expect(value.read()).toBe(1);

    const sub = jest.fn();
    const unSub = value.subscribe(sub);

    store.set('a', 10);
    store.set('a', 100);
    store.notify();
    expect(sub.mock.calls.length).toBe(1);
    expect(value.read()).toBe(100);

    unSub();
  });

  test('Updating multiple dependencies result in just one notification', () => {
    const store = new ReactiveKV<number>();
    const aPlusB = jest.fn(get => get('a') + get('b'));
    store.set('a', 1);
    store.set('b', 2);
    const value = store.readDerived(aPlusB);

    expect(value.read()).toBe(3);

    const sub = jest.fn();
    const unSub = value.subscribe(sub);

    store.set('a', 100);
    store.set('b', 200);
    store.notify();
    expect(sub.mock.calls.length).toBe(1);
    expect(value.read()).toBe(300);

    unSub();
  });

  test('Notifies at most once per read', () => {
    const store = new ReactiveKV<number>();
    const aPlusOne = jest.fn(get => get('a') + 1);
    store.set('a', 1);
    const value = store.readDerived(aPlusOne);

    expect(value.read()).toBe(2);

    const sub = jest.fn();
    const unSub = value.subscribe(sub);

    store.set('a', 100);
    store.notify();

    // Our dependency changed, so we should have gotten notified.
    expect(sub.mock.calls.length).toBe(1);
    store.set('a', 200);
    store.notify();

    // We didn't read, so even though our dependencies changed again, we won't
    // get notified again.
    expect(sub.mock.calls.length).toBe(1);

    unSub();
  });
});

describe('.set', () => {
  test('Does not notify subscribers if Object.is equal', () => {
    const store = new ReactiveKV<number>();
    store.set('concrete', 100);
    const double = jest.fn(get => get('concrete') * 2);
    const doubled = store.readDerived(double);
    expect(doubled.read()).toBe(200);
    const sub = jest.fn();
    const unsub = doubled.subscribe(sub);

    store.set('concrete', 100);
    expect(sub.mock.calls.length).toBe(0);
    unsub();
  });
  test('Does not invalidate depenents if Object.is equal', () => {
    const store = new ReactiveKV<number>();
    store.set('concrete', 100);
    const double = jest.fn(get => get('concrete') * 2);
    store.setDerived('doubled', double);
    expect(store.get('doubled')).toBe(200);
    expect(double.mock.calls.length).toBe(1);
    store.set('concrete', 100);
    expect(store.get('doubled')).toBe(200);
    expect(double.mock.calls.length).toBe(1);
  });
});

describe('.get', () => {
  test('Get a concrete key', () => {
    const store = new ReactiveKV<number>();
    store.set('concrete', 100);
    expect(store.get('concrete')).toBe(100);
  });
  test('Get a derived key', () => {
    const store = new ReactiveKV<number>();
    store.set('concrete', 100);
    store.setDerived('double', get => (get('concrete') ?? 0) * 2);
    expect(store.get('double')).toBe(200);
  });
  test('Get an undefined key', () => {
    const store = new ReactiveKV<mixed>();
    expect(store.get('does-not-exist')).toBe(undefined);
  });
  test('Get a tombstoned key', () => {
    const store = new ReactiveKV<mixed>();
    store.setDerived('derived', get => {
      get('tombstone');
      return null;
    });

    store.get('derived');
    expect(store.get('tombstone')).toBe(undefined);
  });
});

describe('.has', () => {
  test('Has a concrete key', () => {
    const store = new ReactiveKV<null>();
    store.set('concrete-does-exist', null);
    expect(store.has('concrete-does-exist')).toBe(true);
  });
  test('Has a derived key', () => {
    const store = new ReactiveKV<null>();
    store.setDerived('derived-does-exist', () => null);
    expect(store.has('derived-does-exist')).toBe(true);
  });
  test('Has an undefined key', () => {
    const store = new ReactiveKV<null>();
    expect(store.has('does-not-exist')).toBe(false);
  });
  test('Has a tombstoned key', () => {
    const store = new ReactiveKV<null>();
    store.setDerived('derived', get => {
      get('tombstone');
      return null;
    });

    store.get('derived');
    expect(store.has('tombstone')).toBe(false);
  });
});

describe('.keys()', () => {
  test('Get the set of keys', () => {
    const store = new ReactiveKV<null>();
    store.set('concrete-does-exist', null);
    store.setDerived('derived-does-exist', () => null);

    expect(Array.from(store.keys())).toEqual([
      'concrete-does-exist',
      'derived-does-exist',
    ]);
  });
  test('Excludes tombstones', () => {
    const store = new ReactiveKV<null>();
    store.setDerived('derived', get => {
      get('tombstone');
      return null;
    });

    store.get('derived');

    expect(Array.from(store.keys())).toEqual(['derived']);
  });
});

describe('.size', () => {
  test('Get the size of the store', () => {
    const store = new ReactiveKV<null>();
    store.set('concrete-does-exist', null);
    store.setDerived('derived-does-exist', () => null);
    expect(store.size).toBe(2);
  });

  test('Excludes tombstones', () => {
    const store = new ReactiveKV<null>();
    store.setDerived('derived', get => {
      get('tombstone');
      return null;
    });

    store.get('derived');

    expect(store.size).toBe(1);
  });
});

describe('.delete', () => {
  test('Delete a record', () => {
    const store = new ReactiveKV<null>();
    store.set('concrete-does-exist', null);
    store.setDerived('derived-does-exist', () => null);

    store.delete('concrete-does-exist');
    expect(store.has('concrete-does-exist')).toBe(false);

    store.delete('derived-does-exist');
    expect(store.has('derived-does-exist')).toBe(false);
  });

  test('Delete a record that has dependents', () => {
    const store = new ReactiveKV<number>();
    store.set('a', 50);
    store.setDerived('aOr100', get => {
      return get('a') ?? 100;
    });

    expect(store.get('aOr100')).toBe(50);

    store.delete('a');

    expect(store.has('a')).toBe(false);

    expect(store.get('aOr100')).toBe(100);
  });
});

describe('.toJSON', () => {
  test('Includes concrete values only', () => {
    const store = new ReactiveKV<null>();
    store.set('concrete-does-exist', null);
    store.setDerived('derived-does-exist', () => null);

    expect(store.toJSON()).toEqual({
      'concrete-does-exist': null,
    });
  });
});

describe('Examples of patterns', () => {
  test('Modeling a Fragment', () => {
    const store = new ReactiveKV<Object>();
    store.set('root', {me: {__id: '10'}});
    store.set('10', {name: 'Jordan', bestFriend: {__id: '20'}});
    store.set('20', {name: 'Elizabeth', bestFriend: {__id: '10'}});

    const read = jest.fn((get: any) => {
      const root = get('root');
      const me = get(root.me.__id);
      const bestFriend = get(me.bestFriend.__id);
      return {
        me: {
          name: me.name,
          bestFriend: {
            name: bestFriend.name,
          },
        },
      };
    });

    // Fragments could define their own key space using a prefix.
    const fragment = store.readDerived(read);

    // Initial read
    expect(fragment.read()).toEqual({
      me: {name: 'Jordan', bestFriend: {name: 'Elizabeth'}},
    });
    expect(read.mock.calls.length).toBe(1);

    // Subscribe
    const sub = jest.fn();
    const unsub = fragment.subscribe(sub);

    // Updating a dependency notifies us, but does not call read
    store.set('root', {me: {__id: '20'}});
    store.notify();
    expect(sub.mock.calls.length).toBe(1);
    expect(read.mock.calls.length).toBe(1);

    // Reading the fragment calls read
    expect(fragment.read()).toEqual({
      me: {name: 'Elizabeth', bestFriend: {name: 'Jordan'}},
    });
    expect(read.mock.calls.length).toBe(2);

    unsub();
  });
  test('Modeling a Live Resolver', () => {
    const store = new ReactiveKV<Object>();

    const externalStore = new ExternalStore();

    const liveValue = {
      read() {
        return externalStore.getValue();
      },
      subscribe(cb: () => void): () => void {
        return externalStore.subscribe(cb);
      },
    };

    registerLiveResolver(store, 'live_resolver', liveValue);

    expect(store.get('live_resolver')).toBe(0);
    externalStore.setValue(10);
    expect(store.get('live_resolver')).toBe(10);
  });

  test('Modeling a React component subscribed', () => {
    // TODO
    /*
    function useStoreValue(key) {
      const [state, setState] = useState(() => store.read(key));
      useEffect(() => {
        return store.onDirty(key, () => {
          // Set state here will notify React of a _potential_ update,
          // but if the read value has not changed (Object.is equality)
          // React will not call the component's render method.
          setState(() => store.read(key));
        });
      }, [key]);
      return state;
    }
    */
  });
});

type LiveValue = any;

function registerLiveResolver(
  store: ReactiveKV<Object>,
  key: string,
  liveValue: LiveValue,
) {
  const updateKey = `updates:${key}`;
  // We model live resolver invalidations as a separate key in the store.
  let i = 0;
  store.set(updateKey, i);

  // The live resolver itself gets re-read every time its input changes
  store.setDerived(key, getter => {
    getter(updateKey);
    return liveValue.read();
  });
  liveValue.subscribe(() => {
    store.set(updateKey, ++i);
  });
}

class ExternalStore {
  _value: number = 0;
  _subscription: (() => void) | null = null;
  setValue(n: number) {
    this._value = n;
    if (this._subscription != null) {
      this._subscription();
    }
  }
  getValue(): number {
    return this._value;
  }
  subscribe(cb: () => void): () => void {
    this._subscription = cb;
    return () => {
      this._subscription = null;
    };
  }
}
