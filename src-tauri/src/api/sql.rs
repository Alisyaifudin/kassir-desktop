use std::sync::Arc;

use chrono::Utc;
use serde::Serialize;
use sqlx::{Error, Pool, Row, Sqlite};

use crate::jwt::Role;

pub struct User {
    pub hash: String,
    pub role: Role,
}

pub async fn get_user(pool: Arc<Pool<Sqlite>>, name: &str) -> Result<Option<User>, Error> {
    let res = sqlx::query("SELECT hash, role FROM cashiers WHERE name = $1 LIMIT 1")
        .bind(name)
        .fetch_optional(&*pool)
        .await?;
    let user = res.map(|r| User {
        hash: r.get("hash"),
        role: r.get::<String, &str>("role").into(),
    });
    Ok(user)
}

#[derive(Serialize)]
pub struct Product {
    id: i64,
    name: String,
    price: f64,
    stock: i64,
    stock_back: i64,
    barcode: Option<String>,
    capital: f64,
    note: String,
    updated_at: i64,
}

pub async fn get_products(pool: Arc<Pool<Sqlite>>, timestamp: i64) -> Result<Vec<Product>, Error> {
    let rows = sqlx::query("SELECT * FROM products WHERE updated_at > $1")
        .bind(timestamp)
        .fetch_all(&*pool)
        .await?;
    let products = rows
        .into_iter()
        .map(|r| Product {
            id: r.get("id"),
            barcode: r.get("barcode"),
            capital: r.get("capital"),
            name: r.get("name"),
            note: r.get("note"),
            price: r.get("price"),
            stock: r.get("stock"),
            stock_back: r.get("stock_back"),
            updated_at: r.get("updated_at"),
        })
        .collect::<Vec<_>>();
    Ok(products)
}

pub async fn get_product_by_barcode(
    pool: Arc<Pool<Sqlite>>,
    barcode: &str,
) -> Result<Option<i64>, Error> {
    let res = sqlx::query("SELECT id FROM products WHERE barcode = $1")
        .bind(barcode)
        .fetch_optional(&*pool)
        .await?;
    let product = res.map(|r| r.get("id"));
    Ok(product)
}

pub struct UpdatedProduct {
    pub id: i64,
    pub name: String,
    pub price: f64,
    pub stock: i64,
    pub stock_back: i64,
    pub barcode: Option<String>,
    pub capital: f64,
    pub note: String,
}

pub struct InsertedProduct {
    pub name: String,
    pub price: f64,
    pub stock: i64,
    pub stock_back: i64,
    pub barcode: Option<String>,
    pub capital: f64,
    pub note: String,
}

pub async fn updated_product(
    pool: Arc<Pool<Sqlite>>,
    product: UpdatedProduct,
) -> Result<(), Error> {
    let updated_at = Utc::now().timestamp_millis();
    sqlx::query(
        "UPDATE products SET name = $1, price = $2, stock = $3, stock_back = $4, barcode = $5, capital = $6, note = $7, updated_at = $8 WHERE id = $9"
    )
    .bind(product.name)
    .bind(product.price)
    .bind(product.stock)
    .bind(product.stock_back)
    .bind(product.barcode)
    .bind(product.capital)
    .bind(product.note)
    .bind(updated_at)
    .bind(product.id)
    .execute(&*pool).await.map(|_| ())
}

pub async fn insert_product(
    pool: Arc<Pool<Sqlite>>,
    product: InsertedProduct,
) -> Result<(), Error> {
    sqlx::query(
        "INSERT INTO products (name, price, stock, stock_back, barcode, capital, note) VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(product.name)
    .bind(product.price)
    .bind(product.stock)
    .bind(product.stock_back)
    .bind(product.barcode)
    .bind(product.capital)
    .bind(product.note)
    .execute(&*pool).await.map(|_| ())
}
