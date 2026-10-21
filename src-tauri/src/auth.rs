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

// Command to hash a password.
//
// bcrypt at `DEFAULT_COST` is ~250 ms of pure CPU work: running it inline on a
// tokio worker would stall every other command sharing that runtime, so it is
// pushed onto the blocking pool.
#[tauri::command]
pub async fn hash_password(password: String) -> Result<String, AuthError> {
    tauri::async_runtime::spawn_blocking(move || hash(&password, DEFAULT_COST))
        .await
        .map_err(|e| AuthError {
            message: format!("Hashing error: {}", e),
        })?
        .map_err(Into::into) // Converts BcryptError → AuthError
}

// Command to verify a password
#[tauri::command]
pub async fn verify_password(password: String, hash: String) -> Result<bool, AuthError> {
    tauri::async_runtime::spawn_blocking(move || verify(&password, &hash))
        .await
        .map_err(|e| AuthError {
            message: format!("Hashing error: {}", e),
        })?
        .map_err(Into::into) // Converts BcryptError → AuthError
}
