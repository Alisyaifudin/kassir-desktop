use core::panic;

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Admin,
    User,
}

impl From<String> for Role {
    fn from(value: String) -> Self {
        match value.as_str() {
            "user" => Role::User,
            "admin" => Role::Admin,
            _ => panic!("invalid value"),
        }
    }
}

impl Into<String> for Role {
    fn into(self) -> String {
        match self {
            Role::Admin => "admin".into(),
            Role::User => "user".into(),
        }
    }
}

#[derive(Serialize, Debug)]
pub enum JwtError {
    InvalidRole,
    InvalidToken,
}
impl Role {
    fn new(role: &str) -> Result<Role, JwtError> {
        match role {
            "user" => Ok(Role::User),
            "admin" => Ok(Role::Admin),
            _ => Err(JwtError::InvalidRole),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserClaims {
    pub name: String,
    pub role: Role,
    pub exp: i64,
}

static ENV: &'static str = "super_secret_coy";

#[tauri::command]
pub fn encode_jwt(name: String, role: String) -> Result<String, JwtError> {
    let user_role = Role::new(&role)?;
    let exp = Utc::now()
        .checked_add_signed(Duration::days(5))
        .expect("Invalid timestamp")
        .timestamp();
    let claims = UserClaims {
        name,
        role: user_role,
        exp,
    };
    return encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(ENV.as_ref()),
    )
    .map_err(|_| JwtError::InvalidToken);
}

#[tauri::command]
pub fn decode_jwt(token: String) -> Result<UserClaims, JwtError> {
    return decode::<UserClaims>(
        &token,
        &DecodingKey::from_secret(ENV.as_ref()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| JwtError::InvalidToken)
    .map(|v| v.claims);
}
