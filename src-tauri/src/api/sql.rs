use std::sync::Arc;

use chrono::Utc;
use serde::Serialize;
use sqlx::{Error, Pool, Sqlite};

use crate::jwt::Role;

pub struct User {
    pub password: String,
    pub role: Role,
}

pub async fn get_user(pool: Arc<Pool<Sqlite>>, name: &str) -> Result<Option<User>, Error> {
    let res = sqlx::query!(
        "SELECT password, role FROM cashiers WHERE name = ? LIMIT 1",
        name
    )
    .fetch_optional(&*pool)
    .await;
    let user = res.map(|r| {
        r.map(|r| User {
            password: r.password,
            role: r.role.into(),
        })
    });
    return user;
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
    let res = sqlx::query!("SELECT * FROM products WHERE updated_at > ?", timestamp)
        .fetch_all(&*pool)
        .await;
    let products = res.map(|res| {
        res.into_iter()
            .map(|r| Product {
                id: r.id,
                name: r.name,
                price: r.price,
                stock: r.stock,
                stock_back: r.stock_back,
                barcode: r.barcode,
                capital: r.capital,
                note: r.note,
                updated_at: r.updated_at,
            })
            .collect::<Vec<Product>>()
    });
    products
}

pub async fn get_product_by_barcode(
    pool: Arc<Pool<Sqlite>>,
    barcode: &str,
) -> Result<Option<i64>, Error> {
    let res = sqlx::query!("SELECT id FROM products WHERE barcode = $1", barcode)
        .fetch_optional(&*pool)
        .await;

    let product = res.map(|res| res.map(|r| r.id.expect("should be there, right?")));
    product
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
    let res= sqlx::query!(
        "UPDATE products SET name = $1, price = $2, stock = $3, stock_back = $4, barcode = $5, capital = $6, note = $7, updated_at = $8 WHERE id = $9", 
        product.name, product.price, product.stock, product.stock_back, product.barcode, product.capital, product.note, updated_at, product.id
    ).execute(&*pool).await;
    res.map(|_| ())
}

pub async fn insert_product(
    pool: Arc<Pool<Sqlite>>,
    product: InsertedProduct,
) -> Result<(), Error> {
    let res = sqlx::query!(
        "INSERT INTO products (name, price, stock, stock_back, barcode, capital, note) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        product.name, product.price, product.stock, product.stock_back, product.barcode, product.capital, product.note
    ).execute(&*pool).await;

    res.map(|_| ())
}
