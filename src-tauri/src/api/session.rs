use crate::{
    api::sql::get_user,
    jwt::{decode_jwt, encode_jwt, JwtError, Role, UserClaims},
};
use axum::{
    extract::Extension,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use bcrypt::{hash, DEFAULT_COST};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct Credential {
    pub name: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct TokenResponse {
    pub token: String,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[axum::debug_handler]
pub async fn post_session(
    Extension(pool): Extension<Arc<SqlitePool>>,
    Json(cred): Json<Credential>,
) -> impl IntoResponse {
    let record = match get_user(pool, &cred.name).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::OK,
                Json(ErrorResponse {
                    error: "Nama dan/atau kata sandi salah".into(),
                }),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("DB error: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
        }
    };

    if record.password.is_empty() && cred.password.is_empty() {
        return jwt_response(cred.name, record.role.into());
    }

    let Ok(h) = hash(&cred.password, DEFAULT_COST) else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Hash error").into_response();
    };

    if h != record.password {
        return (
            StatusCode::OK,
            Json(ErrorResponse {
                error: "Nama dan/atau kata sandi salah".into(),
            }),
        )
            .into_response();
    }

    jwt_response(cred.name, record.role.into())
}

fn jwt_response(name: String, role: String) -> Response {
    match encode_jwt(name, role) {
        Err(e) => {
            eprintln!("JWT error: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "JWT error").into_response()
        }
        Ok(token) => (StatusCode::OK, Json(TokenResponse { token })).into_response(),
    }
}

#[derive(Serialize)]
pub struct Session {
    pub name: String,
    pub role: Role,
}

#[derive(Serialize)]
pub struct GetResponse {
    pub token: String,
    pub session: Session,
}

pub async fn get_session(headers: HeaderMap) -> Response {
    let (claims, token) = match check_headers_token(&headers) {
        Err(e) => return e,
        Ok(claims) => claims,
    };

    let new_token = gen_new_token(&token, &claims);

    match new_token {
        Err(e) => {
            eprintln!("Failed to encode: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to encode").into_response()
        }
        Ok(token) => (
            StatusCode::OK,
            Json(GetResponse {
                token,
                session: Session {
                    name: claims.name,
                    role: claims.role,
                },
            }),
        )
            .into_response(),
    }
}

pub fn gen_new_token(token: &str, claims: &UserClaims) -> Result<String, JwtError> {
    let now = Utc::now().timestamp();
    if now + 2 * 24 * 3600 > claims.exp {
        encode_jwt(claims.name.clone(), claims.role.clone().into())
    } else {
        Ok(token.into())
    }
}

pub fn check_headers_token(headers: &HeaderMap) -> Result<(UserClaims, String), Response> {
    let Some(auth_header) = headers.get("X-Header-Token") else {
        return Err((StatusCode::UNAUTHORIZED, "Missing token").into_response());
    };

    let Ok(token) = auth_header.to_str() else {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Failed to get string").into_response());
    };

    let Ok(claims) = decode_jwt(token.into()) else {
        return Err((StatusCode::BAD_REQUEST, "Invalid token").into_response());
    };

    return Ok((claims, token.into()));
}
