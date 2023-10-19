mod rename_field;

use common::Location;
pub use rename_field::rename_field;

#[derive(Debug)]
pub struct Edit {
    pub location: Location,
    pub new_text: String,
}
