use qrcode::{types::Color, EcLevel, QrCode};

use crate::{
    core::matrix::{role_for_position, Module, ModuleRole, QrMatrix},
    error::AppError,
};

pub fn encode_qr_matrix(data: &str) -> Result<QrMatrix, AppError> {
    let code = QrCode::with_error_correction_level(data.as_bytes(), EcLevel::H)?;
    let width = code.width();
    let version = ((width - 21) / 4) + 1;
    let modules = code
        .to_colors()
        .into_iter()
        .enumerate()
        .map(|(index, module)| {
            let x = index % width;
            let y = index / width;

            Module {
                value: module == Color::Dark,
                role: role_for_position(x, y, width, version),
            }
        })
        .collect();

    Ok(QrMatrix::new(width, version, modules))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parser_marks_finder_modules() {
        let matrix = encode_qr_matrix("https://github.com/HexAbyss/NoxQR").expect("matrix should encode");

        assert_eq!(matrix.module_role(0, 0), ModuleRole::Finder);
        assert!(matrix.is_dark(0, 0));
    }

    #[test]
    fn parser_marks_alignment_modules_for_higher_versions() {
        let matrix = encode_qr_matrix(&"NOX-STRUCTURED-ENGINE".repeat(12))
            .expect("matrix should encode");

        assert!(matrix.version() > 1);

        let has_alignment = (0..matrix.width()).any(|y| {
            (0..matrix.width()).any(|x| matrix.module_role(x, y) == ModuleRole::Alignment)
        });

        assert!(has_alignment);
    }
}