use crate::api::{
    session::{check_headers_token, gen_new_token, ErrorResponse, TokenResponse},
    sql::{self, Product},
};
use axum::{
    extract::{Extension, Query},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct Param {
    timestamp: Option<i64>,
}

#[derive(Serialize)]
struct GetResponseBody {
    token: String,
    products: Vec<Product>,
}

#[axum::debug_handler]
pub async fn get_products(
    Extension(pool): Extension<Arc<SqlitePool>>,
    headers: HeaderMap,
    param: Query<Param>,
) -> Response {
    let (claims, token) = match check_headers_token(&headers) {
        Err(e) => return e,
        Ok(Some(claims)) => claims,
        Ok(None) => return (StatusCode::BAD_REQUEST, "Invalid token").into_response(),
    };

    let timestamp = param.timestamp.unwrap_or(0);
    let products = match sql::get_products(pool, timestamp).await {
        Err(e) => {
            eprintln!("Failed to access db: {:?}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to access db").into_response();
        }
        Ok(r) => r,
    };

    let new_token = gen_new_token(&token, &claims);
    match new_token {
        Err(e) => {
            eprintln!("Failed to encode: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to encode").into_response()
        }
        Ok(token) => (StatusCode::OK, Json(GetResponseBody { token, products })).into_response(),
    }
}

#[derive(Deserialize)]
pub struct IncomingProduct {
    id: Option<i64>,
    name: String,
    price: f64,
    stock: i64,
    stock_back: i64,
    barcode: Option<String>,
    capital: f64,
    note: String,
}

#[axum::debug_handler]
pub async fn post_product(
    Extension(pool): Extension<Arc<SqlitePool>>,
    headers: HeaderMap,
    Json(product): Json<IncomingProduct>,
) -> impl IntoResponse {
    let (claims, token) = match check_headers_token(&headers) {
        Err(e) => return e,
        Ok(Some(claims)) => claims,
        Ok(None) => return (StatusCode::BAD_REQUEST, "Invalid token").into_response(),
    };
    if let Some(ref barcode) = product.barcode {
        let produc_id = match sql::get_product_by_barcode(pool.clone(), barcode).await {
            Err(e) => {
                eprintln!("Failed to access db: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to access db").into_response();
            }
            Ok(r) => r,
        };
        match (produc_id, product.id) {
            (Some(id_1), Some(id_2)) => {
                if id_1 != id_2 {
                    return (
                        StatusCode::OK,
                        Json(ErrorResponse {
                            error: "Barang sudah ada".into(),
                        }),
                    )
                        .into_response();
                }
            }
            _ => (),
        }
    }
    if let Some(product_id) = product.id {
        let p = sql::UpdatedProduct {
            id: product_id,
            barcode: product.barcode,
            capital: product.capital,
            name: product.name,
            note: product.note,
            price: product.price,
            stock: product.stock,
            stock_back: product.stock_back,
        };
        match sql::updated_product(pool, p).await {
            Err(e) => {
                eprintln!("Failed to access db: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to access db").into_response();
            }
            Ok(_) => (),
        };
    } else {
        let p = sql::InsertedProduct {
            barcode: product.barcode,
            capital: product.capital,
            name: product.name,
            note: product.note,
            price: product.price,
            stock: product.stock,
            stock_back: product.stock_back,
        };
        match sql::insert_product(pool, p).await {
            Err(e) => {
                eprintln!("Failed to access db: {:?}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to access db").into_response();
            }
            Ok(_) => (),
        };
    }
    let new_token = gen_new_token(&token, &claims);

    match new_token {
        Err(e) => {
            eprintln!("Failed to encode: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to encode").into_response()
        }
        Ok(token) => (StatusCode::OK, Json(TokenResponse { token })).into_response(),
    }
}
