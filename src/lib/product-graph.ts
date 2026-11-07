import { Channel, invoke } from "@tauri-apps/api/core";

const HEADER_BYTES = 72;
const NODE_BYTES = 40;
const EDGE_BYTES = 16;
const MAGIC = "KGRPH\0\0\0";
const VERSION = 1;

export type ProductGraphMode = "incoming" | "outcoming";
export type ProductGraphMetric = "count" | "lift";

export type ProductGraphStatus = {
  exists: boolean;
  stale: boolean;
  from: number;
  to: number;
  mode: ProductGraphMode;
  nodeLimit: number;
  records: number;
  nodes: number;
  edges: number;
  builtAt: number;
  sourceUpdatedAt: number;
  bytes: number;
};

export type ProductGraphProgress = {
  stage: "prepare" | "aggregate" | "select" | "read" | "layout" | "write" | "complete";
  percent: number;
  done: number;
  total: number;
};

export type ProductGraphNode = {
  id: string;
  name: string;
  revenue: number;
  qty: number;
  x: number;
  y: number;
  baskets: number;
  community: number;
};

export type ProductGraphNeighbor = {
  other: number;
  count: number;
  lift: number;
};

/**
 * Read-only view of the compact `.kgr` artifact. `view` references the returned
 * ArrayBuffer rather than allocating a JS object per edge; `neighbors()` decodes
 * only the adjacency slice a caller asks for.
 */
export type ProductGraph = {
  from: number;
  to: number;
  mode: ProductGraphMode;
  nodeLimit: number;
  records: number;
  builtAt: number;
  nodes: ProductGraphNode[];
  offsets: Uint32Array;
  edgeBase: number;
  directedEdges: number;
  view: DataView;
};

export class ProductGraphError extends Error {
  readonly name = "ProductGraphError";
}

export async function getProductGraphStatus(
  from: number,
  to: number,
  mode: ProductGraphMode,
  nodeLimit: number,
): Promise<ProductGraphStatus> {
  return invoke<ProductGraphStatus>("product_graph_status", { from, to, mode, nodeLimit });
}

export async function loadProductGraph(
  from: number,
  to: number,
  mode: ProductGraphMode,
  nodeLimit: number,
): Promise<ProductGraph> {
  const buffer = await invoke<ArrayBuffer>("product_graph_load", {
    from,
    to,
    mode,
    nodeLimit,
  });
  return decodeProductGraph(buffer);
}

export function buildProductGraph(
  from: number,
  to: number,
  mode: ProductGraphMode,
  nodeLimit: number,
  onProgress: (progress: ProductGraphProgress) => void,
): Promise<ProductGraphStatus> {
  const channel = new Channel<ProductGraphProgress>(onProgress);
  return invoke<ProductGraphStatus>("product_graph_build", {
    from,
    to,
    mode,
    nodeLimit,
    onProgress: channel,
  });
}

export async function loadProductGraphSnapshot(
  from: number,
  to: number,
  mode: ProductGraphMode,
  nodeLimit: number,
): Promise<{ status: ProductGraphStatus; graph: ProductGraph | null }> {
  const status = await getProductGraphStatus(from, to, mode, nodeLimit);
  const graph = status.exists ? await loadProductGraph(from, to, mode, nodeLimit) : null;
  return { status, graph };
}

/** Parse and validate the versioned on-disk format before exposing typed views. */
export function decodeProductGraph(buffer: ArrayBuffer): ProductGraph {
  if (buffer.byteLength < HEADER_BYTES)
    throw new ProductGraphError("Berkas jaringan terlalu pendek.");
  const view = new DataView(buffer);
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 8));
  if (magic !== MAGIC) throw new ProductGraphError("Format berkas jaringan tidak dikenal.");
  if (view.getUint16(8, true) !== VERSION) {
    throw new ProductGraphError("Versi berkas jaringan tidak didukung.");
  }

  const from = Number(view.getBigInt64(12, true));
  const to = Number(view.getBigInt64(20, true));
  const builtAt = Number(view.getBigInt64(28, true));
  const modeCode = view.getUint8(36);
  const nodeLimit = view.getUint32(40, true);
  const records = Number(view.getBigUint64(44, true));
  const nodeCount = view.getUint32(52, true);
  const edgeCount = view.getUint32(56, true);
  const blobBytes = view.getUint32(60, true);
  if (modeCode > 1 || nodeCount > 600 || nodeCount > nodeLimit) {
    throw new ProductGraphError("Metadata berkas jaringan tidak valid.");
  }

  const offsetsBase = HEADER_BYTES + nodeCount * NODE_BYTES;
  const edgeBase = offsetsBase + (nodeCount + 1) * 4;
  if (offsetsBase + (nodeCount + 1) * 4 > buffer.byteLength) {
    throw new ProductGraphError("Indeks jaringan terpotong.");
  }
  const offsets = new Uint32Array(buffer, offsetsBase, nodeCount + 1);
  const directedEdges = offsets[nodeCount] ?? 0;
  const blobBase = edgeBase + directedEdges * EDGE_BYTES;
  const expectedBytes = blobBase + blobBytes;
  if (expectedBytes !== buffer.byteLength || directedEdges !== edgeCount * 2 || offsets[0] !== 0) {
    throw new ProductGraphError("Isi berkas jaringan tidak cocok dengan indeksnya.");
  }
  for (let i = 0; i < nodeCount; i += 1) {
    if ((offsets[i] ?? 0) > (offsets[i + 1] ?? 0)) {
      throw new ProductGraphError("Urutan indeks jaringan tidak valid.");
    }
  }

  const decoder = new TextDecoder();
  const nodes: ProductGraphNode[] = [];
  const nodeBase = HEADER_BYTES;
  for (let index = 0; index < nodeCount; index += 1) {
    const offset = nodeBase + index * NODE_BYTES;
    const idOffset = view.getUint32(offset, true);
    const idLength = view.getUint16(offset + 4, true);
    const nameLength = view.getUint16(offset + 6, true);
    const nameOffset = view.getUint32(offset + 8, true);
    if (idOffset + idLength > blobBytes || nameOffset + nameLength > blobBytes) {
      throw new ProductGraphError("Nama produk di berkas jaringan tidak valid.");
    }
    nodes.push({
      id: decoder.decode(new Uint8Array(buffer, blobBase + idOffset, idLength)),
      name: decoder.decode(new Uint8Array(buffer, blobBase + nameOffset, nameLength)),
      revenue: view.getFloat64(offset + 12, true),
      qty: view.getFloat64(offset + 20, true),
      x: view.getFloat32(offset + 28, true),
      y: view.getFloat32(offset + 32, true),
      baskets: view.getUint32(offset + 36, true),
      community: 0,
    });
  }

  for (let index = 0; index < directedEdges; index += 1) {
    const offset = edgeBase + index * EDGE_BYTES;
    const other = view.getUint32(offset, true);
    const count = view.getUint32(offset + 4, true);
    const lift = view.getFloat64(offset + 8, true);
    if (other >= nodeCount || count < 2 || !Number.isFinite(lift)) {
      throw new ProductGraphError("Hubungan produk di berkas jaringan tidak valid.");
    }
  }

  const graph: ProductGraph = {
    from,
    to,
    mode: modeCode === 0 ? "incoming" : "outcoming",
    nodeLimit,
    records,
    builtAt,
    nodes,
    offsets,
    edgeBase,
    directedEdges,
    view,
  };
  assignCommunities(graph);
  return graph;
}

export function neighbors(graph: ProductGraph, nodeIndex: number): ProductGraphNeighbor[] {
  const start = graph.offsets[nodeIndex] ?? 0;
  const end = graph.offsets[nodeIndex + 1] ?? start;
  const result: ProductGraphNeighbor[] = [];
  for (let edge = start; edge < end; edge += 1) {
    const offset = graph.edgeBase + edge * EDGE_BYTES;
    result.push({
      other: graph.view.getUint32(offset, true),
      count: graph.view.getUint32(offset + 4, true),
      lift: graph.view.getFloat64(offset + 8, true),
    });
  }
  return result;
}

/** Stable, weighted label propagation; the result only colours the graph. */
function assignCommunities(graph: ProductGraph): void {
  const labels = graph.nodes.map((_, index) => index);
  for (let iteration = 0; iteration < 8; iteration += 1) {
    let changed = false;
    for (let node = 0; node < graph.nodes.length; node += 1) {
      const votes = new Map<number, number>();
      for (const neighbor of neighbors(graph, node)) {
        const label = labels[neighbor.other] ?? neighbor.other;
        votes.set(label, (votes.get(label) ?? 0) + neighbor.count);
      }
      let winner = labels[node] ?? node;
      let best = 0;
      for (const [label, weight] of votes) {
        if (weight > best || (weight === best && label < winner)) {
          winner = label;
          best = weight;
        }
      }
      if (winner !== labels[node]) {
        labels[node] = winner;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const communityIds = [...new Set(labels)].sort((a, b) => a - b);
  const paletteIndex = new Map(communityIds.map((id, index) => [id, index]));
  graph.nodes.forEach((node, index) => {
    node.community = paletteIndex.get(labels[index] ?? index) ?? 0;
  });
}
