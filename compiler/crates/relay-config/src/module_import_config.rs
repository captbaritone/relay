/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use intern::string_key::Intern;
use intern::string_key::StringKey;
use schemars::JsonSchema;
use serde::Deserialize;
use serde::Serialize;

use crate::JsModuleFormat;

/// Configuration for @module.
#[derive(Debug, Deserialize, Serialize, Default, Copy, Clone, JsonSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ModuleImportConfig {
    /// Defines the custom import statement to be generated on the
    /// `ModuleImport` node in ASTs, used for dynamically loading
    /// components at runtime.
    pub dynamic_module_provider: Option<ModuleProvider>,
    /// Defines the custom import statement to be generated for the
    /// `operationModuleProvider` function on the `NormalizationModuleImport`
    /// node in ASTs. Used in exec time client 3D.
    pub operation_module_provider: Option<ModuleProvider>,
    /// Defines the surface upon which @module is enabled.
    pub surface: Option<Surface>,
}

impl ModuleImportConfig {
    /// Apply format-specific defaults. In CommonJS mode, defaults
    /// `dynamic_module_provider` to `Custom { statement: "() => import('<$module>')" }`
    /// so that `@module` works out of the box.
    pub fn with_defaults(mut self, format: JsModuleFormat) -> Self {
        if self.dynamic_module_provider.is_none() && matches!(format, JsModuleFormat::CommonJS) {
            self.dynamic_module_provider = Some(ModuleProvider::Custom {
                statement: "() => import('<$module>')".intern(),
            });
        }
        self
    }
}

#[derive(
    Debug,
    Deserialize,
    Serialize,
    Eq,
    Clone,
    Copy,
    PartialEq,
    Hash,
    JsonSchema
)]
#[serde(tag = "mode")]
pub enum ModuleProvider {
    /// Generates a module provider using JSResource
    JSResource,
    /// Generates a custom JS import, Use `<$module>` as the placeholder
    /// for the actual module. e.g. `"() => import('<$module>')"`
    Custom { statement: StringKey },
}

#[derive(
    Debug,
    Deserialize,
    Serialize,
    Eq,
    Clone,
    Copy,
    PartialEq,
    Hash,
    JsonSchema,
    strum::Display
)]
#[serde(rename_all = "camelCase")]
pub enum Surface {
    Resolvers,
    All,
}
