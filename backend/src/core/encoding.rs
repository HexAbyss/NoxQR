use qrcode::{types::Color, EcLevel, QrCode};

use crate::{core::matrix::QrMatrix, error::AppError};

pub fn encode_qr_matrix(data: &str) -> Result<QrMatrix, AppError> {
    let code = QrCode::with_error_correction_level(data.as_bytes(), EcLevel::H)?;
    let width = code.width();
    let version = ((width - 21) / 4) + 1;
    let modules = code
        .to_colors()
        .into_iter()
        .map(|module| module == Color::Dark)
        .collect();

    Ok(QrMatrix::new(width, version, modules))
}