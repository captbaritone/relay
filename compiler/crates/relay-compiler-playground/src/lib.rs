/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use std::collections::BTreeMap;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;

use common::NoopPerfLogger;
use relay_compiler::FileSourceKind;
use relay_compiler::InMemoryVfs;
use relay_compiler::LocalPersister;
use relay_compiler::OperationPersister;
use relay_compiler::Vfs;
use relay_compiler::VfsSourceReader;
use relay_compiler::build_project::generate_extra_artifacts::default_generate_extra_artifacts_fn;
use relay_compiler::compiler::Compiler;
use relay_compiler::config::Config;
use relay_compiler::errors::Error;
use relay_config::PersistConfig;
use wasm_bindgen::prelude::*;

/// The virtual root used for all VFS-based compilation.
const VIRTUAL_ROOT: &str = "/virtual/root";

/// Compile a Relay project.
///
/// Input: JSON object mapping file paths to file contents.
///   e.g. `{"relay.config.json": "{...}", "schema.graphql": "...", "MyQuery.ts": "graphql`...`"}`
///
/// Output: JSON `{"Ok": {path: content, ...}}` with generated files, or `{"Err": "error message"}`.
#[wasm_bindgen]
pub async fn compile(input: &str) -> String {
    console_error_panic_hook::set_once();

    let files: BTreeMap<String, String> = match serde_json::from_str(input) {
        Ok(files) => files,
        Err(err) => {
            return serde_json::to_string(
                &Result::<BTreeMap<String, String>, String>::Err(format!(
                    "Invalid input JSON: {}",
                    err
                )),
            )
            .unwrap();
        }
    };

    let result = compile_impl(files).await;
    match result {
        Ok(output) => {
            serde_json::to_string(&Result::<BTreeMap<String, String>, String>::Ok(output)).unwrap()
        }
        Err(error) => {
            serde_json::to_string(&Result::<BTreeMap<String, String>, String>::Err(error)).unwrap()
        }
    }
}

async fn compile_impl(
    files: BTreeMap<String, String>,
) -> Result<BTreeMap<String, String>, String> {
    let root = PathBuf::from(VIRTUAL_ROOT);

    // Create and populate VFS
    let vfs = Arc::new(InMemoryVfs::new());
    for (path, content) in &files {
        let file_path = normalize_vfs_path(&root.join(path));
        vfs.add_file(file_path, content.as_bytes().to_vec());
    }

    // Build config from the relay.config.json in the input
    let config_string = files
        .get("relay.config.json")
        .ok_or_else(|| "Input must contain a relay.config.json file".to_string())?;

    let config = Config::from_string_for_test_with_vfs(config_string, vfs.clone() as Arc<dyn Vfs>)
        .map_err(|error| format_compiler_error(&root, error, &vfs))?;

    let config = configure_config(config);
    let config = Arc::new(config);

    let compiler = Compiler::new(Arc::clone(&config), Arc::new(NoopPerfLogger));
    let compiler_result = compiler.compile().await;

    match compiler_result {
        Ok(_state) => {
            let snapshot = vfs.snapshot();
            let mut output = BTreeMap::new();
            for (path, content) in snapshot {
                let relative = path.strip_prefix(&root).unwrap_or(&path);
                let relative_str = relative.to_string_lossy().to_string().replace('\\', "/");
                // Skip files that were in the original input
                if files.contains_key(&relative_str) {
                    continue;
                }
                if let Ok(s) = String::from_utf8(content) {
                    output.insert(relative_str, s);
                }
            }
            Ok(output)
        }
        Err(compiler_error) => Err(format_compiler_error(&root, compiler_error, &vfs)),
    }
}

/// Normalize a path by resolving `.` and `..` components lexically.
fn normalize_vfs_path(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                result.pop();
            }
            other => result.push(other),
        }
    }
    result
}

fn configure_config(mut config: Config) -> Config {
    config.file_source_config = FileSourceKind::WalkDir;
    let vfs = config.vfs.clone();
    config.create_operation_persister = Some(Box::new(move |project_config| {
        let vfs = vfs.clone();
        project_config.persist.as_ref().map(
            move |persist_config| -> Box<dyn OperationPersister + Send + Sync> {
                match persist_config {
                    PersistConfig::Remote(_) => {
                        panic!(
                            "RemotePersister is not available on wasm32. \
                             Use local persist configuration instead."
                        );
                    }
                    PersistConfig::Local(local_config) => {
                        Box::new(LocalPersister::new(local_config.clone(), vfs.clone()))
                    }
                }
            },
        )
    }));
    config.generate_extra_artifacts = Some(Box::new(default_generate_extra_artifacts_fn));
    config
}

fn format_compiler_error(root_dir: &Path, error: Error, vfs: &Arc<InMemoryVfs>) -> String {
    let source_reader = Box::new(VfsSourceReader {
        vfs: vfs.clone() as Arc<dyn Vfs>,
    });
    let output = relay_compiler::errors::print_compiler_error_with_source_reader(
        root_dir,
        error,
        source_reader,
    );
    let output = output.replace(root_dir.to_str().unwrap(), "<root>");
    output.replace('\\', "/")
}

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}
