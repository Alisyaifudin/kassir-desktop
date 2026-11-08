//! On-demand product co-occurrence graph snapshots.
//!
//! The graph is derived, disposable data, not part of `data.db` or `store.json`.
//! A build reads the live SQL pool once, computes a stable layout, and atomically
//! publishes a compact, versioned `.kgr` file under `$APPDATA/product-graphs/`.
//! The browser asks Rust to build/status/load it; it never receives database rows
//! and it never gets filesystem access to the cache directory.
//!
//! `src/services/analytics/scope.sql` is the shared definition of report scope.
//! Keep `$1` / `$2` first in every statement that uses it (Bun's SQLite binding
//! order is positional, unlike SQLx's numbered SQLite placeholders).

use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use futures_util::TryStreamExt;
use serde::Serialize;
use sqlx::sqlite::SqliteRow;
use sqlx::{Row, SqlitePool};
use tauri::ipc::{Channel, Response};
use tauri::{command, AppHandle, Manager, Runtime};

const DB_URL: &str = "sqlite:data.db";
const MAGIC: &[u8; 8] = b"KGRPH\0\0\0";
const VERSION: u16 = 1;
const HEADER_BYTES: usize = 72;
const NODE_BYTES: usize = 40;
const EDGE_BYTES: usize = 16;
const MAX_NODES: u32 = 600;
const CHUNK_MS: i64 = 7 * 24 * 60 * 60 * 1000;
const MIN_NODES: u32 = 100;
const NOISE_FLOOR: u32 = 2;
const CACHE_DIR: &str = "product-graphs";
/// Every published snapshot starts with this, so the cache directory can be
/// listed without a manifest: the header inside each file carries the rest.
const FILE_PREFIX: &str = "product-network-";
const FAILED: &str = "Jaringan produk gagal dibuat. Coba lagi.";
const NOT_READY: &str = "Database belum siap. Jalankan ulang aplikasi.";

static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

/// Progress for one complete build, not one progress bar per phase.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphProgress {
    pub stage: &'static str,
    pub percent: u8,
    pub done: u64,
    pub total: u64,
}

/// One response shape for the build and status calls.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphStatus {
    pub exists: bool,
    pub stale: bool,
    pub from: i64,
    pub to: i64,
    pub mode: String,
    pub node_limit: u32,
    pub records: u64,
    pub nodes: u32,
    pub edges: u32,
    pub built_at: i64,
    pub source_updated_at: i64,
    pub bytes: u64,
}

#[derive(Clone, Debug)]
struct Product {
    id: String,
    name: String,
    revenue: f64,
    qty: f64,
    baskets: u32,
}

#[derive(Clone, Debug)]
struct Pair {
    a: u32,
    b: u32,
    co: u32,
    lift: f64,
}

#[derive(Clone, Debug)]
struct Snapshot {
    from: i64,
    to: i64,
    mode: u8,
    node_limit: u32,
    records: u64,
    built_at: i64,
    source_updated_at: i64,
    nodes: Vec<Product>,
    pairs: Vec<Pair>,
    positions: Vec<(f32, f32)>,
}

#[derive(Clone, Copy, Debug)]
struct SourceStats {
    records: u64,
    updated_at: i64,
}

#[derive(Clone, Debug)]
struct Header {
    from: i64,
    to: i64,
    mode: u8,
    node_limit: u32,
    records: u64,
    nodes: u32,
    edges: u32,
    built_at: i64,
    source_updated_at: i64,
    blob_bytes: u32,
}

fn public_error(context: &str, error: impl std::fmt::Display) -> String {
    log::error!("product graph {context}: {error}");
    FAILED.to_string()
}

async fn pool<R: Runtime>(app: &AppHandle<R>) -> Result<SqlitePool, String> {
    let Some(instances) = app.try_state::<tauri_plugin_sql::DbInstances>() else {
        return Err(NOT_READY.to_string());
    };
    let guard = instances.0.read().await;
    match guard.get(DB_URL) {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => Ok(pool.clone()),
        _ => Err(NOT_READY.to_string()),
    }
}

fn mode_code(mode: &str) -> Result<u8, String> {
    match mode {
        "incoming" => Ok(0),
        "outcoming" => Ok(1),
        _ => Err("Jenis transaksi tidak dikenal.".to_string()),
    }
}

fn validate_range(from: i64, to: i64, node_limit: u32) -> Result<(), String> {
    if from >= to {
        return Err("Rentang tanggal jaringan tidak valid.".to_string());
    }
    if !(MIN_NODES..=MAX_NODES).contains(&node_limit) {
        return Err(format!(
            "Batas produk harus antara {MIN_NODES} dan {MAX_NODES}."
        ));
    }
    Ok(())
}

/// Remove standalone SQL comments before the fragment is spliced after `WHERE`.
/// The comment lines are intentionally prose for both the Rust and TS readers.
fn shared_scope(alias: &str) -> String {
    include_str!("../../src/services/analytics/scope.sql")
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n")
        .replace("{r}", alias)
}

fn cache_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| public_error("resolve app data directory", error))?
        .join(CACHE_DIR);
    fs::create_dir_all(&dir).map_err(|error| public_error("create cache directory", error))?;
    Ok(dir)
}

/// Stable prefix for one graph definition; each completed rebuild gets a unique
/// suffix, so publishing never has to delete the previous good snapshot first.
fn cache_prefix(from: i64, to: i64, mode: u8, node_limit: u32) -> String {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in from
        .to_le_bytes()
        .into_iter()
        .chain(to.to_le_bytes())
        .chain([mode])
        .chain(node_limit.to_le_bytes())
    {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{FILE_PREFIX}{hash:016x}-")
}

fn next_snapshot_path(dir: &Path, prefix: &str, built_at: i64) -> Result<PathBuf, String> {
    for _ in 0..32 {
        let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let path = dir.join(format!("{prefix}{built_at}-{sequence}.kgr"));
        let temp = path.with_extension("kgr.part");
        if !path.exists() && !temp.exists() {
            return Ok(path);
        }
    }
    Err(public_error(
        "choose unique snapshot path",
        "name collision",
    ))
}

fn candidates(dir: &Path, prefix: &str) -> Result<Vec<PathBuf>, String> {
    let entries = fs::read_dir(dir).map_err(|error| public_error("list cache", error))?;
    let mut found = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| public_error("read cache entry", error))?;
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if name.starts_with(prefix) && name.ends_with(".kgr") {
            found.push(path);
        }
    }
    found.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    Ok(found)
}

fn parse_header(bytes: &[u8; HEADER_BYTES]) -> Result<Header, String> {
    if &bytes[..8] != MAGIC {
        return Err("invalid graph magic".to_string());
    }
    let u16_at = |offset| u16::from_le_bytes([bytes[offset], bytes[offset + 1]]);
    let u32_at = |offset| {
        u32::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
        ])
    };
    let u64_at = |offset| {
        u64::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        ])
    };
    if u16_at(8) != VERSION {
        return Err("unsupported graph version".to_string());
    }
    let mode = bytes[36];
    if mode > 1 {
        return Err("invalid graph mode".to_string());
    }
    Ok(Header {
        from: u64_at(12) as i64,
        to: u64_at(20) as i64,
        built_at: u64_at(28) as i64,
        mode,
        node_limit: u32_at(40),
        records: u64_at(44),
        nodes: u32_at(52),
        edges: u32_at(56),
        blob_bytes: u32_at(60),
        source_updated_at: u64_at(64) as i64,
    })
}

/// The exact byte count a snapshot with this header occupies on disk.
///
/// One definition, because both callers must reject a truncated file: the one
/// that loads the latest snapshot, and the one that offers every saved snapshot
/// to the app. A half-written file is not a saved network.
fn expected_len(header: &Header) -> u64 {
    HEADER_BYTES as u64
        + u64::from(header.nodes) * NODE_BYTES as u64
        + (u64::from(header.nodes) + 1) * 4
        + u64::from(header.edges) * 2 * EDGE_BYTES as u64
        + u64::from(header.blob_bytes)
}

fn mode_name(code: u8) -> &'static str {
    if code == 0 {
        "incoming"
    } else {
        "outcoming"
    }
}

fn latest_snapshot(
    dir: &Path,
    from: i64,
    to: i64,
    mode: u8,
    node_limit: u32,
) -> Result<Option<(PathBuf, Header, u64)>, String> {
    let prefix = cache_prefix(from, to, mode, node_limit);
    for path in candidates(dir, &prefix)? {
        let mut file =
            fs::File::open(&path).map_err(|error| public_error("open snapshot", error))?;
        let mut bytes = [0_u8; HEADER_BYTES];
        if file.read_exact(&mut bytes).is_err() {
            continue;
        }
        let Ok(header) = parse_header(&bytes) else {
            continue;
        };
        if header.from == from
            && header.to == to
            && header.mode == mode
            && header.node_limit == node_limit
        {
            let len = file
                .metadata()
                .map_err(|error| public_error("stat snapshot", error))?
                .len();
            if len != expected_len(&header)
                || header.nodes > MAX_NODES
                || header.edges > MAX_NODES * MAX_NODES / 2
            {
                continue;
            }
            return Ok(Some((path, header, len)));
        }
    }
    Ok(None)
}

async fn source_stats(
    pool: &SqlitePool,
    from: i64,
    to: i64,
    mode: &str,
) -> Result<SourceStats, String> {
    let sql = format!(
        "SELECT COUNT(DISTINCT r.record_id) AS records, \
                COALESCE(MAX(r.record_updated_at), 0) AS updated_at \
         FROM records r WHERE {} AND r.record_mode = $3 \
           AND EXISTS (SELECT 1 FROM record_listings l \
                       WHERE l.record_id = r.record_id AND l.product_id IS NOT NULL)",
        shared_scope("r.")
    );
    let row = sqlx::query(&sql)
        .bind(from)
        .bind(to)
        .bind(mode)
        .fetch_one(pool)
        .await
        .map_err(|error| public_error("read graph source stats", error))?;
    Ok(SourceStats {
        records: row
            .try_get::<i64, _>("records")
            .map_err(|error| public_error("decode graph record count", error))?
            .max(0) as u64,
        updated_at: row
            .try_get("updated_at")
            .map_err(|error| public_error("decode latest record update", error))?,
    })
}

async fn inspect<R: Runtime>(
    app: &AppHandle<R>,
    from: i64,
    to: i64,
    mode: &str,
    node_limit: u32,
) -> Result<GraphStatus, String> {
    validate_range(from, to, node_limit)?;
    let mode_value = mode_code(mode)?;
    let dir = cache_dir(app)?;
    let current = source_stats(&pool(app).await?, from, to, mode).await?;
    let Some((_path, header, bytes)) = latest_snapshot(&dir, from, to, mode_value, node_limit)?
    else {
        return Ok(GraphStatus {
            exists: false,
            stale: false,
            from,
            to,
            mode: mode.to_string(),
            node_limit,
            records: current.records,
            nodes: 0,
            edges: 0,
            built_at: 0,
            source_updated_at: current.updated_at,
            bytes: 0,
        });
    };
    Ok(GraphStatus {
        exists: true,
        stale: current.records != header.records || current.updated_at > header.source_updated_at,
        from,
        to,
        mode: mode.to_string(),
        node_limit,
        records: header.records,
        nodes: header.nodes,
        edges: header.edges,
        built_at: header.built_at,
        source_updated_at: header.source_updated_at,
        bytes,
    })
}

#[command]
pub async fn product_graph_status<R: Runtime>(
    app: AppHandle<R>,
    from: i64,
    to: i64,
    mode: String,
    node_limit: u32,
) -> Result<GraphStatus, String> {
    inspect(&app, from, to, &mode, node_limit).await
}

#[command]
pub async fn product_graph_load<R: Runtime>(
    app: AppHandle<R>,
    from: i64,
    to: i64,
    mode: String,
    node_limit: u32,
) -> Result<Response, String> {
    validate_range(from, to, node_limit)?;
    let mode_value = mode_code(&mode)?;
    let dir = cache_dir(&app)?;
    let Some((path, _header, _bytes)) = latest_snapshot(&dir, from, to, mode_value, node_limit)?
    else {
        return Err("Jaringan belum dibuat.".to_string());
    };
    let bytes = fs::read(path).map_err(|error| public_error("read snapshot", error))?;
    Ok(Response::new(bytes))
}

/// One row of the "Jaringan tersimpan" list: the header of a published `.kgr`
/// plus the file it lives in.
///
/// The file name is the id. Publish chose it, it is unique in the cache
/// directory, and it is the only handle that survives the next rebuild of the
/// same range.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphSaved {
    pub file: String,
    pub from: i64,
    pub to: i64,
    pub mode: String,
    pub node_limit: u32,
    pub records: u64,
    pub nodes: u32,
    pub edges: u32,
    pub built_at: i64,
    pub bytes: u64,
}

/// A saved snapshot is addressed by its bare file name, never by a path.
///
/// Anything with a separator, a parent hop or the wrong prefix is refused: the
/// only files this module may remove are the ones publish itself wrote into the
/// cache directory.
fn saved_name(file: &str) -> Result<&str, String> {
    let bare = Path::new(file)
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name == file);
    if !bare || !file.starts_with(FILE_PREFIX) || !file.ends_with(".kgr") {
        return Err("Nama berkas jaringan tidak dikenal.".to_string());
    }
    Ok(file)
}

/// Every snapshot on disk, newest first.
///
/// Read from the files themselves rather than a manifest: a manifest would be a
/// second thing to keep true, and a stale row in it would offer a network the
/// app can no longer open. A file whose header or length does not check out is
/// skipped silently — it is a remnant of an interrupted write, not a network.
#[command]
pub async fn product_graph_saved<R: Runtime>(app: AppHandle<R>) -> Result<Vec<GraphSaved>, String> {
    let dir = cache_dir(&app)?;
    let entries = fs::read_dir(&dir).map_err(|error| public_error("list cache", error))?;
    let mut found = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| public_error("read cache entry", error))?;
        let path = entry.path();
        let Some(file) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if !file.starts_with(FILE_PREFIX) || !file.ends_with(".kgr") {
            continue;
        }
        let Ok(mut handle) = fs::File::open(&path) else {
            continue;
        };
        let mut bytes = [0_u8; HEADER_BYTES];
        if handle.read_exact(&mut bytes).is_err() {
            continue;
        }
        let Ok(header) = parse_header(&bytes) else {
            continue;
        };
        let Ok(metadata) = handle.metadata() else {
            continue;
        };
        if metadata.len() != expected_len(&header)
            || header.nodes > MAX_NODES
            || header.edges > MAX_NODES * MAX_NODES / 2
        {
            continue;
        }
        found.push(GraphSaved {
            file: file.to_string(),
            from: header.from,
            to: header.to,
            mode: mode_name(header.mode).to_string(),
            node_limit: header.node_limit,
            records: header.records,
            nodes: header.nodes,
            edges: header.edges,
            built_at: header.built_at,
            bytes: metadata.len(),
        });
    }
    found.sort_by(|a, b| {
        b.built_at
            .cmp(&a.built_at)
            .then_with(|| b.file.cmp(&a.file))
    });
    Ok(found)
}

/// Drop one saved snapshot for good. Missing is the state the caller asked for.
#[command]
pub async fn product_graph_delete<R: Runtime>(
    app: AppHandle<R>,
    file: String,
) -> Result<(), String> {
    let name = saved_name(&file)?;
    let path = cache_dir(&app)?.join(name);
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(public_error("remove snapshot", error)),
    }
}

/// Open one saved snapshot by the row the list showed, not by its range.
///
/// The bytes go back untouched: `decodeProductGraph` in the browser is the one
/// validator, and it rejects a file whose index does not match its contents.
#[command]
pub async fn product_graph_open<R: Runtime>(
    app: AppHandle<R>,
    file: String,
) -> Result<Response, String> {
    let name = saved_name(&file)?;
    let path = cache_dir(&app)?.join(name);
    let bytes = fs::read(path).map_err(|error| public_error("read snapshot", error))?;
    Ok(Response::new(bytes))
}

#[command]
pub async fn product_graph_build<R: Runtime>(
    app: AppHandle<R>,
    from: i64,
    to: i64,
    mode: String,
    node_limit: u32,
    on_progress: Channel<GraphProgress>,
) -> Result<GraphStatus, String> {
    validate_range(from, to, node_limit)?;
    let mode_value = mode_code(&mode)?;
    let pool = pool(&app).await?;
    let dir = cache_dir(&app)?;
    report(&on_progress, "prepare", 1, 0, 1);
    let source = source_stats(&pool, from, to, &mode).await?;
    let scope = shared_scope("r.");

    // Aggregate by disjoint seven-day windows. This keeps progress moving while
    // SQLite reads a long range, and adding basket counts across half-open
    // windows is exact because a record has one effective timestamp. Only one
    // aggregate row per product per window is held while ranking all products.
    let product_sql = format!(
        "SELECT l.product_id, MAX(l.record_listing_name) AS name, \
                SUM(l.record_listing_total) AS revenue, \
                SUM(l.record_listing_qty) AS qty, \
                COUNT(DISTINCT l.record_id) AS baskets \
         FROM record_listings l JOIN records r ON r.record_id = l.record_id \
         WHERE {scope} AND r.record_mode = $3 AND l.product_id IS NOT NULL \
         GROUP BY l.product_id \
         ORDER BY revenue DESC, l.product_id ASC"
    );
    let span = to.saturating_sub(from).max(1);
    let chunks = ((span.saturating_add(CHUNK_MS - 1) / CHUNK_MS).max(1)) as u64;
    let mut aggregates = HashMap::<String, Product>::new();
    let mut chunk_start = from;
    let mut chunk_index = 0_u64;
    while chunk_start < to {
        let chunk_end = chunk_start.saturating_add(CHUNK_MS).min(to);
        let mut stream = sqlx::query(&product_sql)
            .bind(chunk_start)
            .bind(chunk_end)
            .bind(mode.as_str())
            .fetch(&pool);
        while let Some(row) = stream
            .try_next()
            .await
            .map_err(|error| public_error("aggregate graph products", error))?
        {
            let id: String = get(&row, "product_id", "decode product id")?;
            let name: String = get(&row, "name", "decode product name")?;
            let revenue: f64 = get(&row, "revenue", "decode product revenue")?;
            let qty: f64 = get(&row, "qty", "decode product quantity")?;
            let baskets: i64 = get(&row, "baskets", "decode product basket count")?;
            let product = aggregates.entry(id.clone()).or_insert_with(|| Product {
                id,
                name: name.clone(),
                revenue: 0.0,
                qty: 0.0,
                baskets: 0,
            });
            product.revenue += finite_or_zero(revenue);
            product.qty += finite_or_zero(qty);
            product.baskets = product
                .baskets
                .saturating_add(baskets.clamp(0, i64::from(u32::MAX)) as u32);
            if !name.is_empty() {
                product.name = name;
            }
        }
        drop(stream);
        chunk_index += 1;
        report(
            &on_progress,
            "aggregate",
            2 + (chunk_index * 33 / chunks) as u8,
            chunk_index,
            chunks,
        );
        chunk_start = chunk_end;
    }

    let mut ranked: Vec<Product> = aggregates.into_values().collect();
    ranked.sort_by(|a, b| {
        b.revenue
            .total_cmp(&a.revenue)
            .then_with(|| a.id.cmp(&b.id))
    });
    ranked.truncate(node_limit as usize);
    report(
        &on_progress,
        "select",
        38,
        ranked.len() as u64,
        u64::from(node_limit),
    );
    ranked.sort_by(|a, b| a.id.cmp(&b.id));
    let index: HashMap<String, u32> = ranked
        .iter()
        .enumerate()
        .map(|(i, product)| (product.id.clone(), i as u32))
        .collect();
    let selected_rows = ranked
        .iter()
        .map(|product| u64::from(product.baskets))
        .sum::<u64>();

    let mut pair_counts = HashMap::<(u32, u32), u32>::new();
    if !ranked.is_empty() {
        // SQLx binds by ordinal here; the shared `$1`/`$2` date range and `$3`
        // direction stay first, with selected product ids following from `$4`.
        let placeholders = (0..ranked.len())
            .map(|index| format!("${}", index + 4))
            .collect::<Vec<_>>()
            .join(", ");
        let data_sql = format!(
            "SELECT l.record_id, l.product_id \
             FROM record_listings l JOIN records r ON r.record_id = l.record_id \
             WHERE {scope} AND r.record_mode = $3 AND l.product_id IN ({placeholders}) \
             GROUP BY l.record_id, l.product_id \
             ORDER BY l.record_id, l.product_id"
        );
        let mut query = sqlx::query(&data_sql)
            .bind(from)
            .bind(to)
            .bind(mode.as_str());
        for product in &ranked {
            query = query.bind(product.id.as_str());
        }
        let mut stream = query.fetch(&pool);
        let mut current_record: Option<String> = None;
        let mut current_basket = Vec::<String>::new();
        let mut done = 0_u64;
        while let Some(row) = stream
            .try_next()
            .await
            .map_err(|error| public_error("read selected product baskets", error))?
        {
            let record_id: String = get(&row, "record_id", "decode record id")?;
            let product_id: String = get(&row, "product_id", "decode product id")?;
            if current_record
                .as_deref()
                .is_some_and(|current| current != record_id.as_str())
            {
                count_basket(&mut current_basket, &index, &mut pair_counts);
            }
            current_record = Some(record_id);
            current_basket.push(product_id);
            done += 1;
            if done % 256 == 0 || done == selected_rows {
                let fraction = if selected_rows == 0 {
                    1.0
                } else {
                    done as f64 / selected_rows as f64
                };
                report(
                    &on_progress,
                    "read",
                    40 + (fraction * 35.0).round() as u8,
                    done,
                    selected_rows,
                );
            }
        }
        drop(stream);
        count_basket(&mut current_basket, &index, &mut pair_counts);
        report(&on_progress, "read", 75, done, selected_rows);
    } else {
        report(&on_progress, "read", 75, 0, 0);
    }

    let denominator = source.records as f64;
    let mut pairs: Vec<Pair> = pair_counts
        .into_iter()
        .filter_map(|((a, b), co)| {
            if co < NOISE_FLOOR {
                return None;
            }
            let baskets_a = ranked[a as usize].baskets;
            let baskets_b = ranked[b as usize].baskets;
            let lift = if baskets_a == 0 || baskets_b == 0 || denominator == 0.0 {
                0.0
            } else {
                f64::from(co) * denominator / (f64::from(baskets_a) * f64::from(baskets_b))
            };
            Some(Pair { a, b, co, lift })
        })
        .collect();
    pairs.sort_by(|a, b| a.a.cmp(&b.a).then_with(|| a.b.cmp(&b.b)));

    let mut snapshot = Snapshot {
        from,
        to,
        mode: mode_value,
        node_limit,
        records: source.records,
        built_at: now_ms(),
        source_updated_at: source.updated_at,
        positions: vec![(0.0, 0.0); ranked.len()],
        nodes: ranked,
        pairs,
    };
    report(&on_progress, "layout", 75, 0, 100);
    let layout_snapshot = snapshot.clone();
    let channel = on_progress.clone();
    snapshot.positions = tauri::async_runtime::spawn_blocking(move || {
        layout(&layout_snapshot, |done, total| {
            report(
                &channel,
                "layout",
                75 + (done * 20 / total.max(1)) as u8,
                done,
                total,
            );
        })
    })
    .await
    .map_err(|error| public_error("join layout worker", error))?;
    report(&on_progress, "write", 95, 0, 1);

    let prefix = cache_prefix(from, to, mode_value, node_limit);
    let target = next_snapshot_path(&dir, &prefix, snapshot.built_at)?;
    let temp = target.with_extension("kgr.part");
    let bytes = encode(&snapshot).map_err(|error| public_error("encode snapshot", error))?;
    let write_result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
        fs::rename(&temp, &target)?;
        Ok(())
    })();
    if let Err(error) = write_result {
        let _ = fs::remove_file(&temp);
        return Err(public_error("publish snapshot", error));
    }
    // The new snapshot is durable before old builds of this same range are
    // removed: an interrupted rebuild can never destroy the last good one.
    for old in candidates(&dir, &prefix)? {
        if old != target {
            let _ = fs::remove_file(old);
        }
    }
    report(&on_progress, "complete", 100, 1, 1);

    let header = parse_header(
        bytes
            .get(..HEADER_BYTES)
            .and_then(|slice| slice.try_into().ok())
            .ok_or_else(|| public_error("verify header", "short encoded header"))?,
    )
    .map_err(|error| public_error("verify header", error))?;
    let current = source_stats(&pool, from, to, &mode).await?;
    Ok(GraphStatus {
        exists: true,
        stale: current.records != header.records || current.updated_at > header.source_updated_at,
        from,
        to,
        mode,
        node_limit,
        records: header.records,
        nodes: header.nodes,
        edges: header.edges,
        built_at: header.built_at,
        source_updated_at: header.source_updated_at,
        bytes: bytes.len() as u64,
    })
}

fn get<T>(row: &SqliteRow, column: &str, operation: &str) -> Result<T, String>
where
    for<'r> T: sqlx::Decode<'r, sqlx::Sqlite> + sqlx::Type<sqlx::Sqlite>,
{
    row.try_get(column)
        .map_err(|error| public_error(operation, error))
}

fn finite_or_zero(value: f64) -> f64 {
    if value.is_finite() {
        value
    } else {
        0.0
    }
}

/// Finish one distinct record basket and count each selected product pair once.
fn count_basket(
    basket: &mut Vec<String>,
    index: &HashMap<String, u32>,
    pair_counts: &mut HashMap<(u32, u32), u32>,
) {
    if basket.is_empty() {
        return;
    }
    let mut selected: Vec<u32> = basket
        .drain(..)
        .filter_map(|id| index.get(&id).copied())
        .collect();
    selected.sort_unstable();
    selected.dedup();
    for left in 0..selected.len() {
        for right in (left + 1)..selected.len() {
            let count = pair_counts
                .entry((selected[left], selected[right]))
                .or_default();
            *count = count.saturating_add(1);
        }
    }
}

fn report(
    channel: &Channel<GraphProgress>,
    stage: &'static str,
    percent: u8,
    done: u64,
    total: u64,
) {
    let _ = channel.send(GraphProgress {
        stage,
        percent: percent.min(100),
        done,
        total,
    });
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().min(i64::MAX as u128) as i64)
        .unwrap_or_default()
}

/// Deterministic, bounded all-pairs layout. Node count is capped at 600 before
/// this runs; the quadratic repulsion is therefore both predictable and small
/// enough to avoid a Barnes-Hut implementation's unstable approximation on
/// sparse shop graphs. It runs off the async runtime and reports real iterations.
fn layout(snapshot: &Snapshot, mut progress: impl FnMut(u64, u64)) -> Vec<(f32, f32)> {
    let n = snapshot.nodes.len();
    if n == 0 {
        progress(100, 100);
        return Vec::new();
    }
    let radius = 72.0 * (n as f64).sqrt().max(1.0);
    let mut positions: Vec<(f64, f64)> = snapshot
        .nodes
        .iter()
        .enumerate()
        .map(|(i, product)| {
            let hash = stable_hash(product.id.as_bytes());
            let angle = (i as f64 / n as f64) * std::f64::consts::TAU
                + ((hash & 0xffff) as f64 / 65535.0 - 0.5) * 0.12;
            let radial = radius * (0.88 + ((hash >> 16) & 0xff) as f64 / 255.0 * 0.24);
            (angle.cos() * radial, angle.sin() * radial)
        })
        .collect();
    let mut forces = vec![(0.0_f64, 0.0_f64); n];
    const ITERATIONS: u64 = 100;

    for iteration in 0..ITERATIONS {
        forces.fill((0.0, 0.0));
        // Repel every pair to keep disconnected components and isolates apart.
        for a in 0..n {
            for b in (a + 1)..n {
                let dx = positions[b].0 - positions[a].0;
                let dy = positions[b].1 - positions[a].1;
                let distance_sq = (dx * dx + dy * dy).max(4.0);
                let scale = 2400.0 / distance_sq;
                let fx = dx * scale;
                let fy = dy * scale;
                forces[a].0 -= fx;
                forces[a].1 -= fy;
                forces[b].0 += fx;
                forces[b].1 += fy;
            }
        }
        // Pull connected pairs toward a modest distance; logarithmic co-count
        // gives repeated pairs more weight without turning them into a clique.
        for pair in &snapshot.pairs {
            let a = pair.a as usize;
            let b = pair.b as usize;
            let dx = positions[b].0 - positions[a].0;
            let dy = positions[b].1 - positions[a].1;
            let distance = (dx * dx + dy * dy).sqrt().max(0.01);
            let strength = 0.0035 * (1.0 + f64::from(pair.co).ln());
            let pull = (distance - 88.0) * strength / distance;
            let fx = dx * pull;
            let fy = dy * pull;
            forces[a].0 += fx;
            forces[a].1 += fy;
            forces[b].0 -= fx;
            forces[b].1 -= fy;
        }
        let cooling = 1.0 - (iteration as f64 / ITERATIONS as f64) * 0.85;
        for (position, force) in positions.iter_mut().zip(&forces) {
            let fx = force.0 - position.0 * 0.00012;
            let fy = force.1 - position.1 * 0.00012;
            let length = (fx * fx + fy * fy).sqrt().max(0.01);
            let step = (length * cooling).min(10.0);
            position.0 += fx / length * step;
            position.1 += fy / length * step;
        }
        if iteration % 5 == 4 || iteration + 1 == ITERATIONS {
            progress(iteration + 1, ITERATIONS);
        }
    }
    positions
        .into_iter()
        .map(|(x, y)| (x as f32, y as f32))
        .collect()
}

fn stable_hash(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf29ce484222325_u64, |hash, byte| {
        (hash ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
    })
}

/// Encode fixed-width node / CSR adjacency arrays plus a UTF-8 string table.
///
/// Layout (little endian): 72-byte header, 40-byte nodes, u32 offsets (N+1),
/// 16-byte directed adjacency entries, then the id/name blob. An edge is stored
/// twice, once for each endpoint; each canvas pass can visit one node's neighbors
/// without scanning the whole graph. The browser validates the header and version
/// before making typed-array views.
fn encode(snapshot: &Snapshot) -> Result<Vec<u8>, String> {
    let node_count =
        u32::try_from(snapshot.nodes.len()).map_err(|_| "too many nodes".to_string())?;
    let mut blob = Vec::<u8>::new();
    let mut node_rows = Vec::<[u8; NODE_BYTES]>::with_capacity(snapshot.nodes.len());
    for (index, node) in snapshot.nodes.iter().enumerate() {
        let id_offset =
            u32::try_from(blob.len()).map_err(|_| "string table too large".to_string())?;
        let id_len = u16::try_from(node.id.len()).map_err(|_| "product id too long".to_string())?;
        blob.extend_from_slice(node.id.as_bytes());
        let name_offset =
            u32::try_from(blob.len()).map_err(|_| "string table too large".to_string())?;
        let name_len =
            u16::try_from(node.name.len()).map_err(|_| "product name too long".to_string())?;
        blob.extend_from_slice(node.name.as_bytes());

        let mut row = [0_u8; NODE_BYTES];
        put_u32(&mut row, 0, id_offset);
        put_u16(&mut row, 4, id_len);
        put_u16(&mut row, 6, name_len);
        put_u32(&mut row, 8, name_offset);
        put_f64(&mut row, 12, finite_or_zero(node.revenue));
        put_f64(&mut row, 20, finite_or_zero(node.qty));
        let (x, y) = snapshot.positions.get(index).copied().unwrap_or_default();
        put_f32(&mut row, 28, x);
        put_f32(&mut row, 32, y);
        put_u32(&mut row, 36, node.baskets);
        node_rows.push(row);
    }

    let mut adjacency = vec![Vec::<(u32, u32, f64)>::new(); snapshot.nodes.len()];
    for pair in &snapshot.pairs {
        if pair.a as usize >= snapshot.nodes.len() || pair.b as usize >= snapshot.nodes.len() {
            return Err("edge references missing node".to_string());
        }
        adjacency[pair.a as usize].push((pair.b, pair.co, pair.lift));
        adjacency[pair.b as usize].push((pair.a, pair.co, pair.lift));
    }
    let mut offsets = Vec::<u32>::with_capacity(snapshot.nodes.len() + 1);
    let mut edges = Vec::<(u32, u32, f64)>::new();
    offsets.push(0);
    for neighbors in &mut adjacency {
        neighbors.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        edges.extend_from_slice(neighbors);
        offsets.push(u32::try_from(edges.len()).map_err(|_| "too many edges".to_string())?);
    }

    let blob_bytes = u32::try_from(blob.len()).map_err(|_| "string table too large".to_string())?;
    let edge_count =
        u32::try_from(snapshot.pairs.len()).map_err(|_| "too many pairs".to_string())?;
    let mut output = Vec::with_capacity(
        HEADER_BYTES
            + node_rows.len() * NODE_BYTES
            + offsets.len() * 4
            + edges.len() * EDGE_BYTES
            + blob.len(),
    );
    let mut header = [0_u8; HEADER_BYTES];
    header[..8].copy_from_slice(MAGIC);
    put_u16(&mut header, 8, VERSION);
    put_u16(&mut header, 10, 0);
    put_i64(&mut header, 12, snapshot.from);
    put_i64(&mut header, 20, snapshot.to);
    put_i64(&mut header, 28, snapshot.built_at);
    header[36] = snapshot.mode;
    put_u32(&mut header, 40, snapshot.node_limit);
    put_u64(&mut header, 44, snapshot.records);
    put_u32(&mut header, 52, node_count);
    put_u32(&mut header, 56, edge_count);
    put_u32(&mut header, 60, blob_bytes);
    put_i64(&mut header, 64, snapshot.source_updated_at);
    output.extend_from_slice(&header);
    for row in node_rows {
        output.extend_from_slice(&row);
    }
    for offset in offsets {
        output.extend_from_slice(&offset.to_le_bytes());
    }
    for (other, co, lift) in edges {
        output.extend_from_slice(&other.to_le_bytes());
        output.extend_from_slice(&co.to_le_bytes());
        output.extend_from_slice(&lift.to_le_bytes());
    }
    output.extend_from_slice(&blob);
    Ok(output)
}

fn put_u16(output: &mut [u8], offset: usize, value: u16) {
    output[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
}
fn put_u32(output: &mut [u8], offset: usize, value: u32) {
    output[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
}
fn put_u64(output: &mut [u8], offset: usize, value: u64) {
    output[offset..offset + 8].copy_from_slice(&value.to_le_bytes());
}
fn put_i64(output: &mut [u8], offset: usize, value: i64) {
    output[offset..offset + 8].copy_from_slice(&value.to_le_bytes());
}
fn put_f64(output: &mut [u8], offset: usize, value: f64) {
    output[offset..offset + 8].copy_from_slice(&value.to_le_bytes());
}
fn put_f32(output: &mut [u8], offset: usize, value: f32) {
    output[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_scope_keeps_both_aliases_and_effective_date() {
        let plain = shared_scope("");
        let aliased = shared_scope("r.");
        assert!(plain.contains("record_deleted_at IS NULL"));
        assert!(plain.contains("(record_flag & 1) = 0"));
        assert!(
            plain.contains("COALESCE(record_paid_at, record_credit_at, record_created_at) >= $1")
        );
        assert!(aliased.contains("r.record_deleted_at IS NULL"));
        assert!(!plain.contains("{r}"));
    }

    #[test]
    fn binary_header_round_trips_metadata() {
        let snapshot = Snapshot {
            from: 100,
            to: 200,
            mode: 0,
            node_limit: 300,
            records: 17,
            built_at: 1234,
            source_updated_at: 4321,
            nodes: vec![Product {
                id: "coffee".to_string(),
                name: "Kopi".to_string(),
                revenue: 12.5,
                qty: 2.0,
                baskets: 3,
            }],
            pairs: vec![],
            positions: vec![(1.0, -2.0)],
        };
        let bytes = encode(&snapshot).expect("encode snapshot");
        let header: &[u8; HEADER_BYTES] = bytes[..HEADER_BYTES].try_into().unwrap();
        let parsed = parse_header(header).expect("parse header");
        assert_eq!(parsed.from, snapshot.from);
        assert_eq!(parsed.to, snapshot.to);
        assert_eq!(parsed.mode, snapshot.mode);
        assert_eq!(parsed.node_limit, snapshot.node_limit);
        assert_eq!(parsed.records, snapshot.records);
        assert_eq!(parsed.nodes, 1);
        assert_eq!(parsed.edges, 0);
        assert_eq!(parsed.built_at, snapshot.built_at);
        assert_eq!(parsed.source_updated_at, snapshot.source_updated_at);
        assert_eq!(parsed.blob_bytes, 10);
    }

    #[test]
    fn a_record_counts_a_product_pair_once_even_if_the_product_repeats() {
        let index = HashMap::from([("a".to_string(), 0), ("b".to_string(), 1)]);
        let mut counts = HashMap::new();
        count_basket(
            &mut vec!["a".to_string(), "a".to_string(), "b".to_string()],
            &index,
            &mut counts,
        );
        count_basket(
            &mut vec!["a".to_string(), "b".to_string()],
            &index,
            &mut counts,
        );
        assert_eq!(counts.get(&(0, 1)), Some(&2));
    }

    #[test]
    fn layout_is_stable_and_handles_empty_network() {
        let snapshot = Snapshot {
            from: 0,
            to: 1,
            mode: 0,
            node_limit: 100,
            records: 2,
            built_at: 0,
            source_updated_at: 0,
            nodes: vec![
                Product {
                    id: "a".to_string(),
                    name: "A".to_string(),
                    revenue: 2.0,
                    qty: 1.0,
                    baskets: 2,
                },
                Product {
                    id: "b".to_string(),
                    name: "B".to_string(),
                    revenue: 2.0,
                    qty: 1.0,
                    baskets: 2,
                },
            ],
            pairs: vec![Pair {
                a: 0,
                b: 1,
                co: 2,
                lift: 1.0,
            }],
            positions: vec![],
        };
        let first = layout(&snapshot, |_, _| {});
        let second = layout(&snapshot, |_, _| {});
        assert_eq!(first, second);
        assert_ne!(first[0], first[1]);
        assert!(layout(
            &Snapshot {
                nodes: vec![],
                pairs: vec![],
                ..snapshot
            },
            |_, _| {}
        )
        .is_empty());
    }

    #[test]
    fn a_saved_snapshot_is_addressed_by_its_bare_file_name() {
        assert!(saved_name("product-network-0123456789abcdef-1700000000000-0.kgr").is_ok());
        for refused in [
            // A partially written file is not a published snapshot.
            "product-network-0123456789abcdef-1700000000000-0.kgr.part",
            // Nothing that can walk out of the cache directory, by hop or by prefix.
            "../product-network-0123456789abcdef-1700000000000-0.kgr",
            "/tmp/product-network-0123456789abcdef-1700000000000-0.kgr",
            "sub/product-network-0123456789abcdef-1700000000000-0.kgr",
            // Not one of ours.
            "data.db",
            "product-network-0123456789abcdef-1700000000000-0",
            "",
        ] {
            assert!(saved_name(refused).is_err(), "accepted {refused}");
        }
    }
}
