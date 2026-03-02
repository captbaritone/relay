/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

mod local_persister;
#[cfg(not(target_arch = "wasm32"))]
mod remote_persister;

pub use local_persister::LocalPersister;
#[cfg(not(target_arch = "wasm32"))]
pub use remote_persister::RemotePersister;
