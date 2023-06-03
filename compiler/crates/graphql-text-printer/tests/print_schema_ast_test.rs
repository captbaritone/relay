/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<33a6b825586c39cd2965f52d4f181582>>
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

#[test]
fn directive_arg() {
    let input = include_str!("print_schema_ast/fixtures/directive_arg.graphql");
    let expected = include_str!("print_schema_ast/fixtures/directive_arg.expected");
    test_fixture(transform_fixture, "directive_arg.graphql", "print_schema_ast/fixtures/directive_arg.expected", input, expected);
}

#[test]
fn field_drective() {
    let input = include_str!("print_schema_ast/fixtures/field_drective.graphql");
    let expected = include_str!("print_schema_ast/fixtures/field_drective.expected");
    test_fixture(transform_fixture, "field_drective.graphql", "print_schema_ast/fixtures/field_drective.expected", input, expected);
}

#[test]
fn interface_implements_interface_() {
    let input = include_str!("print_schema_ast/fixtures/interface_implements_interfaceå.graphql");
    let expected = include_str!("print_schema_ast/fixtures/interface_implements_interfaceå.expected");
    test_fixture(transform_fixture, "interface_implements_interfaceå.graphql", "print_schema_ast/fixtures/interface_implements_interfaceå.expected", input, expected);
}

#[test]
fn kitchen_sink() {
    let input = include_str!("print_schema_ast/fixtures/kitchen_sink.graphql");
    let expected = include_str!("print_schema_ast/fixtures/kitchen_sink.expected");
    test_fixture(transform_fixture, "kitchen_sink.graphql", "print_schema_ast/fixtures/kitchen_sink.expected", input, expected);
}

#[test]
fn type_implements_interface() {
    let input = include_str!("print_schema_ast/fixtures/type_implements_interface.graphql");
    let expected = include_str!("print_schema_ast/fixtures/type_implements_interface.expected");
    test_fixture(transform_fixture, "type_implements_interface.graphql", "print_schema_ast/fixtures/type_implements_interface.expected", input, expected);
}
