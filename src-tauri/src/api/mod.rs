use axum::{
    extract::Extension,
    routing::{get, post},
    Router,
};
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::net::TcpListener;

use crate::api::{
    product::{get_products, post_product},
    session::{get_session, post_session},
};
mod product;
mod session;
mod sql;

pub async fn create_server(pool: SqlitePool) {
    let shared_pool = Arc::new(pool);
    let app = Router::new()
        .route("/", get(|| async { "Backend is alive!" }))
        .route("/check_health", get(check_health))
        .route("/api/session", post(post_session))
        .route("/api/session", get(get_session))
        .route("/api/product", get(get_products))
        .route("/api/product", post(post_product))
        .layer(Extension(shared_pool));

    println!(
        "Available endpoint
            GET /
            GET /check_health
            GET /api/session
            POST /api/session
            GET /api/product
            GET /api/product?timestamp=<number>
            POST /api/product 
    "
    );
    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn check_health(Extension(pool): Extension<Arc<SqlitePool>>) -> &'static str {
    // Optionally, run a basic SQL query to check DB health
    if sqlx::query("SELECT 1").execute(&*pool).await.is_ok() {
        "OK"
    } else {
        "Database error"
    }
}
