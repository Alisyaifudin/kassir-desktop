use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use serde::Serialize;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

// Custom error type to send to frontend
#[derive(Debug, Serialize)]
pub struct AuthError {
    pub message: String,
}

// Helper to convert BcryptError to AuthError
impl From<BcryptError> for AuthError {
    fn from(err: BcryptError) -> Self {
        AuthError {
            message: format!("Hashing error: {}", err),
        }
    }
}

// Command to hash a password
#[tauri::command]
pub async fn hash_password(password: String) -> Result<String, AuthError> {
    hash(&password, DEFAULT_COST).map_err(Into::into) // Converts BcryptError → AuthError
}

// Command to verify a password
#[tauri::command]
pub async fn verify_password(password: String, hash: String) -> Result<bool, AuthError> {
    verify(&password, &hash).map_err(Into::into) // Converts BcryptError → AuthError
}
