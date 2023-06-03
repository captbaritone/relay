/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<0a04f17832c2931f871d3a85c74edd78>>
 */

mod print_schema_ast;

use print_schema_ast::transform_fixture;
use fixture_tests::test_fixture;

#[test]
fn basic_schema() {
    let input = include_str!("print_schema_ast/fixtures/basic_schema.graphql");
    let expected = include_str!("print_schema_ast/fixtures/basic_schema.expected");
    test_fixture(transform_fixture, "basic_schema.graphql", "print_schema_ast/fixtures/basic_schema.expected", input, expected);
}
