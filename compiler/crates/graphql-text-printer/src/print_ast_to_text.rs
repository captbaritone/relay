/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

use std::fmt::Result as FmtResult;
use std::fmt::Write;

use graphql_syntax::Argument;
use graphql_syntax::ConstantArgument;
use graphql_syntax::ConstantDirective;
use graphql_syntax::Directive;
use graphql_syntax::ExecutableDefinition;
use graphql_syntax::FieldDefinition;
use graphql_syntax::FragmentDefinition;
use graphql_syntax::FragmentSpread;
use graphql_syntax::Identifier;
use graphql_syntax::InlineFragment;
use graphql_syntax::InterfaceTypeDefinition;
use graphql_syntax::LinkedField;
use graphql_syntax::List;
use graphql_syntax::ObjectTypeDefinition;
use graphql_syntax::ObjectTypeExtension;
use graphql_syntax::OperationDefinition;
use graphql_syntax::OperationType;
use graphql_syntax::OperationTypeDefinition;
use graphql_syntax::ScalarField;
use graphql_syntax::SchemaDefinition;
use graphql_syntax::Selection;
use graphql_syntax::TypeSystemDefinition;
use graphql_syntax::UnionTypeDefinition;
use graphql_syntax::VariableDefinition;

pub fn print_operation_ast(node: &OperationDefinition) -> String {
    let mut printer: Printer = Default::default();
    printer.print_operation(node).unwrap();

    printer.output
}

pub fn print_fragment_ast(node: &FragmentDefinition) -> String {
    let mut printer: Printer = Default::default();
    printer.print_fragment(node).unwrap();

    printer.output
}

pub fn print_executable_definition_ast(node: &ExecutableDefinition) -> String {
    match node {
        ExecutableDefinition::Operation(operation) => print_operation_ast(operation),
        ExecutableDefinition::Fragment(fragment) => print_fragment_ast(fragment),
    }
}

pub fn print_type_system_definition_ast(node: &TypeSystemDefinition) -> String {
    let mut printer: Printer = Default::default();
    printer.print_type_system_definition(node).unwrap();

    printer.output
}

#[derive(Default)]
struct Printer {
    output: String,
}

impl Printer {
    fn print_operation(&mut self, operation: &OperationDefinition) -> FmtResult {
        if let Some((_, operation_kind)) = operation.operation {
            write!(self.output, "{}", operation_kind)?;
        };
        if let Some(name) = &operation.name {
            write!(self.output, " {}", name.value)?;
        }
        if let Some(variable_definitions) = &operation.variable_definitions {
            self.print_variable_definitions(variable_definitions)?;
        }
        self.print_directives(&operation.directives)?;
        writeln!(self.output, " {{")?;
        self.print_selections(&operation.selections, "  ")?;
        write!(self.output, "}}")?;

        Ok(())
    }

    fn print_fragment(&mut self, fragment: &FragmentDefinition) -> FmtResult {
        write!(self.output, "fragment {}", fragment.name)?;
        if let Some(variable_definitions) = &fragment.variable_definitions {
            self.print_variable_definitions(variable_definitions)?;
        }
        write!(self.output, " {}", fragment.type_condition)?;
        self.print_directives(&fragment.directives)?;
        writeln!(self.output, " {{")?;
        self.print_selections(&fragment.selections, "  ")?;
        write!(self.output, "}}")?;

        Ok(())
    }

    fn print_variable_definitions(
        &mut self,
        variable_definitions: &List<VariableDefinition>,
    ) -> FmtResult {
        write!(self.output, "(")?;
        let last = variable_definitions.items.last();
        for variable_definition in &variable_definitions.items {
            self.print_variable_definition(variable_definition)?;
            if let Some(last) = last {
                if last != variable_definition {
                    write!(self.output, ", ")?;
                }
            }
        }
        write!(self.output, ")")?;

        Ok(())
    }

    fn print_variable_definition(&mut self, variable_definition: &VariableDefinition) -> FmtResult {
        write!(
            self.output,
            "{}: {}",
            variable_definition.name, variable_definition.type_
        )?;
        if let Some(default_value) = &variable_definition.default_value {
            write!(self.output, " = {}", default_value)?;
        }
        self.print_directives(&variable_definition.directives)?;

        Ok(())
    }

    fn print_directives(&mut self, directives: &[Directive]) -> FmtResult {
        for directive in directives {
            self.print_directive(directive)?;
        }

        Ok(())
    }

    fn print_directive(&mut self, directive: &Directive) -> FmtResult {
        write!(self.output, " @{}", directive.name)?;

        if let Some(arguments) = &directive.arguments {
            self.print_arguments(arguments)?;
        }

        Ok(())
    }

    fn print_arguments(&mut self, arguments: &List<Argument>) -> FmtResult {
        write!(self.output, "(")?;
        let last_arg = arguments.items.last();
        for argument in &arguments.items {
            write!(self.output, "{}", argument)?;
            if let Some(last_arg) = last_arg {
                if last_arg != argument {
                    write!(self.output, ", ")?;
                }
            }
        }
        write!(self.output, ")")?;
        Ok(())
    }

    fn print_selections(&mut self, selections: &List<Selection>, indent: &str) -> FmtResult {
        for selection in &selections.items {
            self.print_selection(selection, indent)?;
            writeln!(self.output)?;
        }

        Ok(())
    }

    fn print_selection(&mut self, selection: &Selection, indent: &str) -> FmtResult {
        write!(self.output, "{}", indent)?;
        match selection {
            Selection::FragmentSpread(node) => self.print_fragment_spread(node),
            Selection::InlineFragment(node) => self.print_inline_fragment(node, indent),
            Selection::LinkedField(node) => self.print_linked_field(node, indent),
            Selection::ScalarField(node) => self.print_scalar_field(node),
        }
    }

    fn print_fragment_spread(&mut self, node: &FragmentSpread) -> FmtResult {
        write!(self.output, "...{}", node.name)?;
        if let Some(arguments) = &node.arguments {
            self.print_arguments(arguments)?;
        }
        self.print_directives(&node.directives)?;

        Ok(())
    }

    fn print_inline_fragment(&mut self, node: &InlineFragment, indent: &str) -> FmtResult {
        write!(self.output, "...")?;
        if let Some(type_condition) = &node.type_condition {
            write!(self.output, " {}", type_condition)?;
        }
        self.print_directives(&node.directives)?;
        writeln!(self.output, " {{")?;
        self.print_selections(&node.selections, &format!("  {}", indent))?;
        write!(self.output, "{}}}", indent)?;
        Ok(())
    }

    fn print_linked_field(&mut self, node: &LinkedField, indent: &str) -> FmtResult {
        if let Some(alias) = &node.alias {
            write!(self.output, "{}: ", alias)?;
        }

        write!(self.output, "{}", node.name)?;
        if let Some(arguments) = &node.arguments {
            self.print_arguments(arguments)?;
        }
        self.print_directives(&node.directives)?;
        writeln!(self.output, " {{")?;
        self.print_selections(&node.selections, &format!("  {}", indent))?;
        write!(self.output, "{}}}", indent)?;
        Ok(())
    }

    fn print_scalar_field(&mut self, node: &ScalarField) -> FmtResult {
        if let Some(alias) = &node.alias {
            write!(self.output, "{}: ", alias)?;
        }

        write!(self.output, "{}", node.name)?;
        if let Some(arguments) = &node.arguments {
            self.print_arguments(arguments)?;
        }
        self.print_directives(&node.directives)?;

        Ok(())
    }

    // Schema stuff

    fn print_type_system_definition(&mut self, node: &TypeSystemDefinition) -> FmtResult {
        match node {
            TypeSystemDefinition::SchemaDefinition(node) => self.print_schema_definition(node),
            TypeSystemDefinition::SchemaExtension(_) => {
                writeln!(self.output, "TODO schema extension")
            }
            TypeSystemDefinition::EnumTypeDefinition(_) => {
                writeln!(self.output, "TODO enum type definition")
            }
            TypeSystemDefinition::EnumTypeExtension(_) => {
                writeln!(self.output, "TODO enum type extension")
            }
            TypeSystemDefinition::InterfaceTypeDefinition(node) => {
                self.print_interface_type_definition(node)
            }
            TypeSystemDefinition::InterfaceTypeExtension(_) => {
                writeln!(self.output, "TODO interface type extension")
            }
            TypeSystemDefinition::ObjectTypeDefinition(node) => {
                self.print_object_type_definition(node)
            }
            TypeSystemDefinition::ObjectTypeExtension(node) => {
                self.print_object_type_extension(node)
            }
            TypeSystemDefinition::UnionTypeDefinition(node) => {
                self.print_union_type_definition(node)
            }
            TypeSystemDefinition::UnionTypeExtension(_) => {
                writeln!(self.output, "TODO union type extension")
            }
            TypeSystemDefinition::InputObjectTypeDefinition(_) => {
                writeln!(self.output, "TODO input object type definition")
            }
            TypeSystemDefinition::InputObjectTypeExtension(_) => {
                writeln!(self.output, "TODO input object type extension")
            }
            TypeSystemDefinition::ScalarTypeDefinition(_) => {
                writeln!(self.output, "TODO scalar type definition")
            }
            TypeSystemDefinition::ScalarTypeExtension(_) => {
                writeln!(self.output, "TODO scalar type extension")
            }
            TypeSystemDefinition::DirectiveDefinition(_) => {
                writeln!(self.output, "TODO directive definition")
            }
        }
    }

    fn print_constant_directives(&mut self, directives: &[ConstantDirective]) -> FmtResult {
        for directive in directives {
            self.print_constant_directive(directive)?;
        }

        Ok(())
    }

    fn print_constant_directive(&mut self, directive: &ConstantDirective) -> FmtResult {
        write!(self.output, " @{}", directive.name)?;
        if let Some(arguments) = &directive.arguments {
            self.print_constant_arguments(arguments)?;
        }

        Ok(())
    }

    fn print_constant_arguments(&mut self, arguments: &List<ConstantArgument>) -> FmtResult {
        write!(self.output, "(")?;
        let last_arg = arguments.items.last();
        for argument in &arguments.items {
            write!(self.output, "{}", argument)?;
            if let Some(last_arg) = last_arg {
                if last_arg != argument {
                    write!(self.output, ", ")?;
                }
            }
        }
        write!(self.output, ")")?;
        Ok(())
    }

    fn print_schema_definition(&mut self, node: &SchemaDefinition) -> FmtResult {
        write!(self.output, "schema")?;
        self.print_constant_directives(&node.directives)?;
        writeln!(self.output, " {{")?;
        for operation in &node.operation_types.items {
            self.print_operation_type(operation)?;
        }
        writeln!(self.output, "}}")?;

        Ok(())
    }

    fn print_operation_type(&mut self, node: &OperationTypeDefinition) -> FmtResult {
        write!(self.output, "  ")?;
        match node.operation {
            OperationType::Query => write!(self.output, "query: ")?,
            OperationType::Mutation => write!(self.output, "mutation: ")?,
            OperationType::Subscription => write!(self.output, "subscription: ")?,
        }
        writeln!(self.output, "{}", node.type_)?;

        Ok(())
    }

    fn print_object_type_definition(&mut self, node: &ObjectTypeDefinition) -> FmtResult {
        write!(self.output, "type {}", node.name)?;
        self.print_implements_interfaces(&node.interfaces)?;
        self.print_constant_directives(&node.directives)?;
        if let Some(fields) = &node.fields {
            self.print_field_definitions(&fields)?;
        }

        Ok(())
    }

    fn print_object_type_extension(&mut self, node: &ObjectTypeExtension) -> FmtResult {
        write!(self.output, "extend type {}", node.name)?;
        self.print_implements_interfaces(&node.interfaces)?;
        self.print_constant_directives(&node.directives)?;
        if let Some(fields) = &node.fields {
            self.print_field_definitions(&fields)?;
        }

        Ok(())
    }

    fn print_interface_type_definition(&mut self, node: &InterfaceTypeDefinition) -> FmtResult {
        write!(self.output, "interface {}", node.name)?;
        self.print_implements_interfaces(&node.interfaces)?;
        self.print_constant_directives(&node.directives)?;
        if let Some(fields) = &node.fields {
            self.print_field_definitions(&fields)?;
        }

        Ok(())
    }

    fn print_union_type_definition(&mut self, node: &UnionTypeDefinition) -> FmtResult {
        write!(self.output, "union {}", node.name)?;
        self.print_constant_directives(&node.directives)?;
        if node.members.is_empty() {
            return Ok(());
        }
        write!(self.output, " = ")?;
        let last = node.members.last();
        for type_ in &node.members {
            write!(self.output, "{}", type_)?;
            if let Some(last) = last {
                if last != type_ {
                    write!(self.output, " | ")?;
                }
            }
        }

        Ok(())
    }

    fn print_implements_interfaces(&mut self, interfaces: &[Identifier]) -> FmtResult {
        if interfaces.is_empty() {
            return Ok(());
        }
        write!(self.output, " implements ")?;
        let last = interfaces.last();
        for interface in interfaces {
            write!(self.output, "{}", interface)?;
            if let Some(last) = last {
                if last != interface {
                    write!(self.output, ", ")?;
                }
            }
        }

        Ok(())
    }

    fn print_field_definitions(&mut self, fields: &List<FieldDefinition>) -> FmtResult {
        writeln!(self.output, " {{")?;
        for field in &fields.items {
            self.print_field_definition(field)?;
        }
        writeln!(self.output, "}}")?;

        Ok(())
    }

    fn print_field_definition(&mut self, node: &FieldDefinition) -> FmtResult {
        writeln!(self.output, "  {}", node)?;

        Ok(())
    }
}
