use std::sync::Arc;

use graphql_ir::Field;
use graphql_ir::Program;
use graphql_ir::ScalarField;
use graphql_ir::Visitor;
use intern::string_key::Intern;
use schema::SDLSchema;
use schema::Schema;

use crate::Edit;

pub fn rename_field(program: &Program) -> Vec<Edit> {
    let mut visitor = RenameFieldVisitor {
        schema: &program.schema,
        edits: Default::default(),
    };

    visitor.visit_program(program);

    visitor.edits
}

struct RenameFieldVisitor<'a> {
    schema: &'a Arc<SDLSchema>,
    edits: Vec<Edit>,
}

impl Visitor for RenameFieldVisitor<'_> {
    const NAME: &'static str = "RenameField";

    const VISIT_ARGUMENTS: bool = false;

    const VISIT_DIRECTIVES: bool = false;

    fn visit_scalar_field(&mut self, field: &ScalarField) {
        let field_def = self.schema.field(field.definition.item);

        if field_def.name.item == "text".intern() {
            self.edits.push(Edit {
                location: field.alias_or_name_location(),
                new_text: "not_text".to_string(),
            })
        }
    }
}
