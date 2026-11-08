import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Link } from "~/services/route/react";
import { rupiah } from "~/components/cart/util-rupiah";
import { cn } from "~/lib/utils";
import { SavedDrawer } from "./z-Saved";
import {
  neighbors,
  type ProductGraph,
  type ProductGraphMetric,
  type ProductGraphNeighbor,
} from "~/lib/product-graph";
type Point = { index: number; x: number; y: number; radius: number };
type Transform = { x: number; y: number; scale: number };
type Edge = { a: number; b: number; count: number; lift: number };

const GRID = 240;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 6;

const COLORS = {
  light: ["#2563eb", "#0f766e", "#a16207", "#c2410c", "#7e22ce", "#be123c"],
  dark: ["#60a5fa", "#2dd4bf", "#fbbf24", "#fb923c", "#c084fc", "#fb7185"],
} as const;

/**
 * Canvas rendering is spatially culled: a world-space grid finds candidate
 * nodes for the current viewport, and only those candidates become circles or
 * labels. The snapshot can hold 600 nodes; off-screen ones are never painted.
 */
export function NetworkCanvas({
  graph,
  metric,
  neighborLimit,
  selected,
  onSelect,
  onControls,
  onOpenSaved,
}: {
  graph: ProductGraph;
  metric: ProductGraphMetric;
  neighborLimit: number;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onControls: () => void;
  /** A row of the saved list was opened; the page owns what the canvas shows. */
  onOpenSaved: (saved: { file: string; graph: ProductGraph }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transform = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const graphRef = useRef<ProductGraph | null>(null);
  const points = useRef<Point[]>([]);
  const drawRef = useRef<() => void>(() => {});
  const fitRef = useRef<() => void>(() => {});
  const drag = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [visibleCount, setVisibleCount] = useState(0);
  const [zoomPercent, setZoomPercent] = useState(100);
  // The canvas owns the whole pane, so the things that used to be chrome around
  // it are states of the canvas itself: a panel that slides over the right edge,
  // the saved snapshots sliding over the left, and a mode where the canvas
  // covers the app window.
  const [panelOpen, setPanelOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // One drawer at a time: half a canvas with two panels sliding over it is a
  // canvas nobody can see.
  const toggleSaved = () => {
    const next = !savedOpen;
    setSavedOpen(next);
    if (next) setPanelOpen(false);
  };
  const togglePanel = () => {
    const next = !panelOpen;
    setPanelOpen(next);
    if (next) setSavedOpen(false);
  };

  // Picking a node opens the panel: with the panel docked out of the way, a
  // click that only painted a highlight would read as nothing happening.
  const select = useCallback(
    (index: number | null) => {
      onSelect(index);
      if (index !== null) setPanelOpen(true);
    },
    [onSelect],
  );

  const maxRevenue = useMemo(
    () => Math.max(1, ...graph.nodes.map((node) => node.revenue)),
    [graph],
  );
  const topProducts = useMemo(
    () =>
      graph.nodes
        .map((node, index) => ({ node, index }))
        .sort((a, b) => b.node.revenue - a.node.revenue)
        .slice(0, 8),
    [graph],
  );
  const topByNode = useMemo(
    () =>
      graph.nodes.map((_, index) => {
        const rows = neighbors(graph, index);
        rows.sort((a, b) => {
          const difference = metric === "count" ? b.count - a.count : b.lift - a.lift;
          return difference || b.count - a.count || a.other - b.other;
        });
        return rows.slice(0, neighborLimit);
      }),
    [graph, metric, neighborLimit],
  );
  const edges = useMemo(() => mergeEdges(topByNode), [topByNode]);
  const maxEdgeWeight = useMemo(
    () => Math.max(0, ...edges.map((edge) => (metric === "count" ? edge.count : edge.lift))),
    [edges, metric],
  );
  const focus = useMemo(() => {
    if (selected === null) return null;
    return new Set([selected, ...neighbors(graph, selected).map((edge) => edge.other)]);
  }, [graph, selected]);
  const grid = useMemo(() => spatialGrid(graph), [graph]);
  const labels = useMemo(() => {
    const byRevenue = graph.nodes
      .map((node, index) => ({ index, revenue: node.revenue }))
      .sort((a, b) => b.revenue - a.revenue || a.index - b.index)
      .slice(0, 24)
      .map((row) => row.index);
    return new Set(byRevenue);
  }, [graph]);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    const hostNode = hostRef.current;
    if (!canvasNode || !hostNode) return;
    const canvas: HTMLCanvasElement = canvasNode;
    const host: HTMLDivElement = hostNode;
    const contextResult = canvas.getContext("2d");
    if (!contextResult) return;
    const context: CanvasRenderingContext2D = contextResult;

    let animation = 0;
    let width = 0;
    let height = 0;
    let dark = document.documentElement.classList.contains("dark");
    let lastVisibleCount = -1;
    const requestDraw = () => {
      if (animation === 0) animation = requestAnimationFrame(draw);
    };

    const fit = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      width = rect.width;
      height = rect.height;
      if (graph.nodes.length === 0) {
        transform.current = { x: width / 2, y: height / 2, scale: 1 };
      } else {
        const xs = graph.nodes.map((node) => node.x);
        const ys = graph.nodes.map((node) => node.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const spanX = Math.max(240, maxX - minX + 160);
        const spanY = Math.max(240, maxY - minY + 160);
        const scale = Math.max(
          MIN_ZOOM,
          Math.min(1.5, (width - 36) / spanX, (height - 36) / spanY),
        );
        transform.current = {
          x: width / 2 - ((minX + maxX) / 2) * scale,
          y: height / 2 - ((minY + maxY) / 2) * scale,
          scale,
        };
      }
      setZoomPercent(Math.round(transform.current.scale * 100));
      fitRef.current = fit;
      requestDraw();
    };

    function draw() {
      animation = 0;
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      if (width <= 0 || height <= 0) return;
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = dark ? "#1b1b20" : "#fafafa";
      context.fillRect(0, 0, width, height);

      const { x: tx, y: ty, scale } = transform.current;
      const margin = 20 / scale;
      const left = -tx / scale - margin;
      const right = (width - tx) / scale + margin;
      const top = -ty / scale - margin;
      const bottom = (height - ty) / scale + margin;
      const candidates = new Set<number>();
      for (let gx = Math.floor(left / GRID); gx <= Math.floor(right / GRID); gx += 1) {
        for (let gy = Math.floor(top / GRID); gy <= Math.floor(bottom / GRID); gy += 1) {
          for (const index of grid.get(`${gx}:${gy}`) ?? []) candidates.add(index);
        }
      }
      const visible = new Set<number>();
      for (const index of candidates) {
        const node = graph.nodes[index];
        if (node && node.x >= left && node.x <= right && node.y >= top && node.y <= bottom) {
          visible.add(index);
        }
      }
      if (visible.size !== lastVisibleCount) {
        lastVisibleCount = visible.size;
        setVisibleCount(visible.size);
      }

      const palette = dark ? COLORS.dark : COLORS.light;
      const visibleEdges = edges.filter((edge) => visible.has(edge.a) || visible.has(edge.b));
      for (const edge of visibleEdges) {
        if (focus && !focus.has(edge.a) && !focus.has(edge.b)) continue;
        const a = graph.nodes[edge.a];
        const b = graph.nodes[edge.b];
        if (!a || !b) continue;
        const rawWeight = metric === "count" ? edge.count : edge.lift;
        const ratio = maxEdgeWeight <= 0 ? 0 : rawWeight / maxEdgeWeight;
        context.beginPath();
        context.moveTo(a.x * scale + tx, a.y * scale + ty);
        context.lineTo(b.x * scale + tx, b.y * scale + ty);
        context.lineWidth = 0.65 + Math.sqrt(Math.min(1, ratio)) * 3.2;
        context.strokeStyle = dark ? "#9ca3af" : "#64748b";
        context.globalAlpha = focus && focus.has(edge.a) && focus.has(edge.b) ? 0.78 : 0.34;
        context.stroke();
      }
      context.globalAlpha = 1;

      const labelsToDraw = new Set(labels);
      if (selected !== null) {
        labelsToDraw.add(selected);
        for (const neighbor of topByNode[selected] ?? []) labelsToDraw.add(neighbor.other);
      }
      if (hovered !== null) labelsToDraw.add(hovered);
      points.current = [];
      for (const index of visible) {
        const node = graph.nodes[index];
        if (!node) continue;
        if (focus && !focus.has(index)) context.globalAlpha = 0.18;
        else context.globalAlpha = 1;
        const x = node.x * scale + tx;
        const y = node.y * scale + ty;
        const ratio = graph.nodes.length === 0 ? 0 : Math.max(0, node.revenue / maxRevenue);
        const radius = 4.5 + Math.sqrt(ratio) * 7;
        const color = palette[node.community % palette.length] ?? palette[0];
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
        context.lineWidth = index === selected || index === hovered ? 2.5 : 1.2;
        context.strokeStyle =
          index === selected ? (dark ? "#bfdbfe" : "#1d4ed8") : dark ? "#17171c" : "#fff";
        context.stroke();
        points.current.push({ index, x, y, radius });
        if (labelsToDraw.has(index)) {
          context.globalAlpha = focus && !focus.has(index) ? 0.18 : 1;
          context.font = `${index === selected || index === hovered ? "600 " : "400 "}12px "Noto Sans", sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "top";
          context.fillStyle = dark ? "#f4f4f5" : "#27272a";
          context.fillText(node.name, x, y + radius + 4, 150);
        }
      }
      context.globalAlpha = 1;
    }

    if (graphRef.current !== graph) {
      graphRef.current = graph;
      fit();
    } else {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      requestDraw();
    }

    const resize = new ResizeObserver(() => {
      const rect = host.getBoundingClientRect();
      const wasEmpty = width <= 0 || height <= 0;
      width = rect.width;
      height = rect.height;
      if (wasEmpty && graphRef.current === graph) fit();
      else requestDraw();
    });
    resize.observe(host);
    const theme = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark");
      requestDraw();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onVisibility = () => {
      if (!document.hidden) requestDraw();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const localPoint = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const nearest = (x: number, y: number): number | null => {
      let hit: Point | null = null;
      let distance = Infinity;
      for (const point of points.current) {
        const current = Math.hypot(point.x - x, point.y - y);
        if (current <= point.radius + 7 && current < distance) {
          hit = point;
          distance = current;
        }
      }
      return hit?.index ?? null;
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const point = localPoint(event);
      drag.current = { pointerId: event.pointerId, x: point.x, y: point.y, moved: false };
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const point = localPoint(event);
      const active = drag.current;
      if (active && active.pointerId === event.pointerId) {
        const dx = point.x - active.x;
        const dy = point.y - active.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) active.moved = true;
        active.x = point.x;
        active.y = point.y;
        transform.current.x += dx;
        transform.current.y += dy;
        requestDraw();
      } else {
        const next = nearest(point.x, point.y);
        setHovered((current) => (current === next ? current : next));
        if (next !== null) setHoverPosition(point);
        requestDraw();
      }
    };
    const pointerUp = (event: PointerEvent) => {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      drag.current = null;
      if (!active.moved) {
        const point = localPoint(event);
        select(nearest(point.x, point.y));
      }
      requestDraw();
    };
    const pointerLeave = () => {
      if (!drag.current) setHovered(null);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = localPoint(event as unknown as PointerEvent);
      const previous = transform.current;
      const worldX = (point.x - previous.x) / previous.scale;
      const worldY = (point.y - previous.y) / previous.scale;
      const scale = clamp(previous.scale * Math.exp(-event.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM);
      transform.current = { scale, x: point.x - worldX * scale, y: point.y - worldY * scale };
      setZoomPercent(Math.round(scale * 100));
      requestDraw();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Esc peels one layer at a time: the drawers, then the fullscreen canvas.
        // The window listener in the component body closes those; deselecting
        // under them would clear a selection the user is still looking at.
        if (!panelOpen && !savedOpen && !expanded) onSelect(null);
        return;
      }
      const pan: Record<string, [number, number]> = {
        ArrowLeft: [36, 0],
        ArrowRight: [-36, 0],
        ArrowUp: [0, 36],
        ArrowDown: [0, -36],
      };
      if (pan[event.key]) {
        event.preventDefault();
        const [dx, dy] = pan[event.key]!;
        transform.current.x += dx;
        transform.current.y += dy;
        requestDraw();
      }
      if (event.key === "+" || event.key === "=") zoomAt(width / 2, height / 2, 1.2);
      if (event.key === "-") zoomAt(width / 2, height / 2, 1 / 1.2);
    };
    const zoomAt = (x: number, y: number, factor: number) => {
      const previous = transform.current;
      const worldX = (x - previous.x) / previous.scale;
      const worldY = (y - previous.y) / previous.scale;
      const scale = clamp(previous.scale * factor, MIN_ZOOM, MAX_ZOOM);
      transform.current = { scale, x: x - worldX * scale, y: y - worldY * scale };
      setZoomPercent(Math.round(scale * 100));
      requestDraw();
    };
    const onWheel = (event: WheelEvent) => wheel(event);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("pointerleave", pointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("keydown", keydown);
    fitRef.current = fit;
    drawRef.current = requestDraw;

    return () => {
      if (animation !== 0) cancelAnimationFrame(animation);
      resize.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("pointerleave", pointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", keydown);
    };
  }, [
    edges,
    expanded,
    focus,
    graph,
    grid,
    hovered,
    labels,
    maxEdgeWeight,
    maxRevenue,
    metric,
    onSelect,
    panelOpen,
    savedOpen,
    select,
    selected,
    topByNode,
  ]);

  const selectedNode = selected === null ? null : (graph.nodes[selected] ?? null);
  const hoveredNode = hovered === null ? null : (graph.nodes[hovered] ?? null);
  const topPartners = selected === null ? [] : (topByNode[selected] ?? []);

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tx = transform.current;
    const x = rect.width / 2;
    const y = rect.height / 2;
    const worldX = (x - tx.x) / tx.scale;
    const worldY = (y - tx.y) / tx.scale;
    const scale = clamp(tx.scale * factor, MIN_ZOOM, MAX_ZOOM);
    transform.current = { scale, x: x - worldX * scale, y: y - worldY * scale };
    setZoomPercent(Math.round(scale * 100));
    drawRef.current();
  };

  const fit = () => fitRef.current();

  // Esc peels one layer at a time: the drawer on top, then the fullscreen canvas.
  useEffect(() => {
    if (!panelOpen && !savedOpen && !expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (savedOpen) setSavedOpen(false);
      else if (panelOpen) setPanelOpen(false);
      else setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, panelOpen, savedOpen]);

  // Arrows and +/- belong to the canvas, so entering fullscreen hands it the
  // keyboard instead of leaving focus on the button that opened it — and either
  // way the graph is re-fitted, because a view framed for a small pane is not a
  // view of a full window. The first render is the layout effect's own fit.
  const wasExpanded = useRef(expanded);
  useEffect(() => {
    if (wasExpanded.current === expanded) return;
    wasExpanded.current = expanded;
    if (expanded) canvasRef.current?.focus();
    fitRef.current();
  }, [expanded]);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 min-w-0 flex-1 bg-background",
        expanded && "fixed inset-0 z-[60]",
      )}
    >
      <div ref={hostRef} className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-label={`${graph.nodes.length} produk dan ${graph.nodes.length ? graph.directedEdges / 2 : 0} hubungan. Seret untuk menggeser, gulir untuk memperbesar.`}
          aria-roledescription="grafik jaringan interaktif"
          className="absolute inset-0 size-full touch-none cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          role="img"
          tabIndex={0}
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md border bg-background/95 p-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Perbesar grafik"
            onClick={() => zoomBy(1.25)}
          >
            <Plus aria-hidden="true" className="size-5" />
          </Button>
          <span
            className="min-w-12 text-center text-sm tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {zoomPercent}%
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Perkecil grafik"
            onClick={() => zoomBy(1 / 1.25)}
          >
            <Minus aria-hidden="true" className="size-5" />
          </Button>
          <span className="mx-1 h-5 border-l" aria-hidden="true" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Tampilkan seluruh grafik"
            onClick={fit}
          >
            <LocateFixed aria-hidden="true" className="size-5" />
          </Button>
          <span className="mx-1 h-5 border-l" aria-hidden="true" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Jaringan tersimpan"
            aria-pressed={savedOpen}
            onClick={toggleSaved}
          >
            <Layers aria-hidden="true" className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Kendali jaringan"
            onClick={onControls}
          >
            <SlidersHorizontal aria-hidden="true" className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={expanded ? "Keluar dari layar penuh" : "Tampilkan grafik layar penuh"}
            aria-pressed={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? (
              <Minimize2 aria-hidden="true" className="size-5" />
            ) : (
              <Maximize2 aria-hidden="true" className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={panelOpen ? "Sembunyikan panel produk" : "Tampilkan panel produk"}
            aria-pressed={panelOpen}
            onClick={togglePanel}
          >
            {panelOpen ? (
              <PanelRightClose aria-hidden="true" className="size-5" />
            ) : (
              <PanelRightOpen aria-hidden="true" className="size-5" />
            )}
          </Button>
        </div>
        <p className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground">
          {visibleCount} dari {graph.nodes.length} produk terlihat
        </p>
        {hoveredNode && hovered !== null ? (
          <div
            className="pointer-events-none absolute z-10 max-w-56 rounded-md border bg-background px-2 py-1 text-sm shadow-sm"
            style={{
              left: Math.min(
                hoverPosition.x + 14,
                Math.max(8, (hostRef.current?.clientWidth ?? 228) - 220),
              ),
              top: Math.max(8, hoverPosition.y - 36),
            }}
            role="status"
          >
            <span className="font-medium">{hoveredNode.name}</span>
            <span className="block text-xs text-muted-foreground">
              {graph.mode === "incoming" ? "Omzet" : "Pembelian"} {rupiah(hoveredNode.revenue)} ·{" "}
              {hoveredNode.baskets.toLocaleString("id-ID")} transaksi
            </span>
          </div>
        ) : null}
      </div>
      {savedOpen ? (
        <SavedDrawer
          currentBuiltAt={graph.builtAt}
          onOpen={onOpenSaved}
          onClose={() => setSavedOpen(false)}
        />
      ) : null}
      {panelOpen ? (
        <aside
          aria-label="Panel produk"
          className="absolute inset-y-0 right-0 z-20 flex w-[280px] max-w-[85%] flex-col gap-3 overflow-y-auto border-l bg-background p-3 shadow-lg duration-200 animate-in slide-in-from-right motion-reduce:animate-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                {selectedNode ? selectedNode.name : "Produk utama"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedNode
                  ? `${graph.mode === "incoming" ? "Omzet" : "Pembelian"} ${rupiah(selectedNode.revenue)} · ${selectedNode.baskets.toLocaleString("id-ID")} transaksi · kelompok ${selectedNode.community + 1}`
                  : "Pilih titik untuk melihat pasangannya. Warna menandai kelompok produk."}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Sembunyikan panel produk"
              onClick={() => setPanelOpen(false)}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
          {selectedNode ? (
            <>
              <LinkProduct id={selectedNode.id} name={selectedNode.name} />
              <div className="border-t pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Pasangan terkuat</h3>
                  <Button type="button" size="sm" variant="ghost" onClick={() => select(null)}>
                    Lepas
                  </Button>
                </div>
                {topPartners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada pasangan yang berulang.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {topPartners.slice(0, 7).map((neighbor) => {
                      const node = graph.nodes[neighbor.other];
                      if (!node) return null;
                      return (
                        <li key={node.id}>
                          <button
                            type="button"
                            onClick={() => select(neighbor.other)}
                            className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="min-w-0 truncate text-sm">{node.name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {metric === "count"
                                ? `${neighbor.count.toLocaleString("id-ID")}×`
                                : `${neighbor.lift.toLocaleString("id-ID", { maximumFractionDigits: 2 })}×`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {topProducts.map(({ node, index }) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => select(index)}
                      className="flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="min-w-0 truncate text-sm">{node.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {node.baskets.toLocaleString("id-ID")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-auto border-t pt-3 text-xs text-muted-foreground">
                Ketebalan garis menunjukkan{" "}
                {metric === "count"
                  ? "jumlah transaksi bersama"
                  : "kekuatan hubungan dibanding peluang"}
                .
              </p>
            </>
          )}
        </aside>
      ) : null}
    </div>
  );
}

function LinkProduct({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to={`/products/${id}`}
      behavior="push"
      className="inline-flex w-fit items-center rounded-sm text-sm text-active underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      Buka produk {name}
    </Link>
  );
}

function mergeEdges(topByNode: ProductGraphNeighbor[][]): Edge[] {
  const found = new Map<string, Edge>();
  topByNode.forEach((neighborsForNode, a) => {
    for (const neighbor of neighborsForNode) {
      const lo = Math.min(a, neighbor.other);
      const hi = Math.max(a, neighbor.other);
      const key = `${lo}:${hi}`;
      if (!found.has(key)) {
        found.set(key, { a: lo, b: hi, count: neighbor.count, lift: neighbor.lift });
      }
    }
  });
  return [...found.values()];
}

function spatialGrid(graph: ProductGraph): Map<string, number[]> {
  const grid = new Map<string, number[]>();
  graph.nodes.forEach((node, index) => {
    const x = Math.floor(node.x / GRID);
    const y = Math.floor(node.y / GRID);
    const key = `${x}:${y}`;
    const cell = grid.get(key);
    if (cell) cell.push(index);
    else grid.set(key, [index]);
  });
  return grid;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
