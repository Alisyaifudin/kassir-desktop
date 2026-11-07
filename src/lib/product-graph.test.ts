import { describe, expect, test } from "bun:test";
import { decodeProductGraph, neighbors, ProductGraphError } from "./product-graph";

function fixture(): ArrayBuffer {
  const header = 72;
  const nodeBytes = 40;
  const nodeCount = 2;
  const offsetsBase = header + nodeCount * nodeBytes;
  const edgeBase = offsetsBase + (nodeCount + 1) * 4;
  const blobBase = edgeBase + 2 * 16;
  const encoder = new TextEncoder();
  const blob = encoder.encode("p1Ap2B");
  const buffer = new ArrayBuffer(blobBase + blob.length);
  const view = new DataView(buffer);
  new Uint8Array(buffer, 0, 8).set(encoder.encode("KGRPH\0\0\0"));
  view.setUint16(8, 1, true);
  view.setBigInt64(12, 100n, true);
  view.setBigInt64(20, 200n, true);
  view.setBigInt64(28, 300n, true);
  view.setUint8(36, 0);
  view.setUint32(40, 300, true);
  view.setBigUint64(44, 2n, true);
  view.setUint32(52, nodeCount, true);
  view.setUint32(56, 1, true);
  view.setUint32(60, blob.length, true);
  view.setBigInt64(64, 250n, true);

  const node = (
    index: number,
    idOffset: number,
    nameOffset: number,
    revenue: number,
    x: number,
  ) => {
    const at = header + index * nodeBytes;
    view.setUint32(at, idOffset, true);
    view.setUint16(at + 4, 2, true);
    view.setUint16(at + 6, 1, true);
    view.setUint32(at + 8, nameOffset, true);
    view.setFloat64(at + 12, revenue, true);
    view.setFloat64(at + 20, 1, true);
    view.setFloat32(at + 28, x, true);
    view.setFloat32(at + 32, 0, true);
    view.setUint32(at + 36, 2, true);
  };
  node(0, 0, 2, 100, -10);
  node(1, 3, 5, 50, 10);

  view.setUint32(offsetsBase, 0, true);
  view.setUint32(offsetsBase + 4, 1, true);
  view.setUint32(offsetsBase + 8, 2, true);
  for (const [index, other] of [1, 0].entries()) {
    const at = edgeBase + index * 16;
    view.setUint32(at, other, true);
    view.setUint32(at + 4, 2, true);
    view.setFloat64(at + 8, 1, true);
  }
  new Uint8Array(buffer, blobBase).set(blob);
  return buffer;
}

describe("product graph snapshot decoder", () => {
  test("reads the header, node names, and CSR neighbor slices", () => {
    const graph = decodeProductGraph(fixture());

    expect(graph).toMatchObject({
      from: 100,
      to: 200,
      mode: "incoming",
      nodeLimit: 300,
      records: 2,
      builtAt: 300,
      directedEdges: 2,
    });
    expect(graph.nodes.map(({ id, name, revenue, x }) => ({ id, name, revenue, x }))).toEqual([
      { id: "p1", name: "A", revenue: 100, x: -10 },
      { id: "p2", name: "B", revenue: 50, x: 10 },
    ]);
    expect(neighbors(graph, 0)).toEqual([{ other: 1, count: 2, lift: 1 }]);
    expect(graph.nodes[0]?.community).toBe(graph.nodes[1]?.community);
  });

  test("rejects malformed or truncated snapshots before exposing array views", () => {
    expect(() => decodeProductGraph(new ArrayBuffer(20))).toThrow(ProductGraphError);
    const badMagic = fixture();
    new Uint8Array(badMagic, 0, 1)[0] = 0;
    expect(() => decodeProductGraph(badMagic)).toThrow("Format berkas jaringan tidak dikenal.");

    const brokenOffsets = fixture();
    new DataView(brokenOffsets).setUint32(72 + 2 * 40 + 4, 3, true);
    expect(() => decodeProductGraph(brokenOffsets)).toThrow();
  });
});
