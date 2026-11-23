import { buildMesh, project, windVertex } from "./wind-mesh";
import type { Camera, Mesh, Projected, Vertex } from "./wind-mesh";
import { sliceColor, lightTheme } from "./wind-colors";
import { number } from "./format";

import { wrapBearing } from "../shared/orientation";
import type { WindSurface } from "../shared/types";

const initialCamera = (): Camera => ({ yaw: -0.35, pitch: 0.75, zoom: 1 });

export const createWindScene = (canvas: HTMLCanvasElement, surface: WindSurface) => {
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("This browser cannot display the 3D preview. Use the direction slices below.");
  const ctx = context;
  const abort = new AbortController();
  const events = { signal: abort.signal };
  let mesh = buildMesh(surface);
  let camera = initialCamera();
  let speed = 20;
  let direction = 90;
  let frame = 0;
  let dragging: { x: number; y: number } | null = null;

  const draw = () => {
    frame = 0;
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const style = getComputedStyle(document.documentElement);
    const palette = {
      text: style.getPropertyValue("--mono-text").trim(),
      grid: style.getPropertyValue("--mono-border").trim(),
      selected: style.getPropertyValue("--mono-accent-text").trim(),
      good: style.getPropertyValue("--mono-success").trim(),
      bad: style.getPropertyValue("--mono-danger").trim(),
    };

    const projected = (vertex: Vertex) => project(vertex, camera, width, height);

    drawAxes(ctx, mesh, projected, palette, width, height);
    const faces = mesh.rows.slice(1).flatMap((row, j) =>
      row.slice(1).map((point, i) => {
        const vertices = [mesh.rows[j][i], mesh.rows[j][i + 1], point, row[i]];
        const corners = vertices.map(projected);
        return {
          corners,
          depth: corners.reduce((sum, p) => sum + p.depth, 0) / 4,
          points: vertices.reduce((sum, v) => sum + v.points, 0) / 4,
        };
      }),
    );
    faces.sort((a, b) => b.depth - a.depth);
    for (const face of faces) {
      polygon(ctx, face.corners);
      ctx.fillStyle = face.points >= 0 ? palette.good : palette.bad;
      const intensity =
        Math.abs(face.points) / Math.max(1, face.points >= 0 ? mesh.maximum : -mesh.minimum);
      ctx.globalAlpha = 0.18 + Math.min(1, intensity) * 0.65;
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const light = lightTheme();
    for (const section of mesh.slices) {
      stroke(ctx, section.vertices.map(projected), sliceColor(section.direction, light), 1.7);
    }
    const slice = Array.from({ length: 101 }, (_, index) =>
      projected(
        windVertex(mesh.evaluate(index, direction), index, direction, mesh.minimum, mesh.maximum),
      ),
    );
    stroke(ctx, slice, palette.selected, 2.8);
    const value = mesh.evaluate(speed, direction);
    const dot = projected(windVertex(value, speed, direction, mesh.minimum, mesh.maximum));
    const floor = projected(windVertex(mesh.minimum, speed, direction, mesh.minimum, mesh.maximum));
    ctx.setLineDash([3, 4]);
    stroke(ctx, [floor, dot], palette.text, 1);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = palette.selected;
    ctx.fill();
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawCompassLabels(ctx, mesh, projected, palette.text);
    canvas.setAttribute(
      "aria-label",
      `Radial 3D wind surface. Angle is FROM direction, radius is speed, height is points. All ${mesh.slices.length} stored direction slices are visible. Wind ${number(speed)} km/h from ${number(direction, 0)} degrees earns ${number(value)} points. Drag or use arrow keys to rotate; plus and minus zoom; zero resets the view.`,
    );
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };

  const adjust = (yaw: number, pitch: number, zoom = 0) => {
    camera.yaw += yaw;
    camera.pitch = Math.max(0.18, Math.min(1.2, camera.pitch + pitch));
    camera.zoom = Math.max(0.6, Math.min(1.5, camera.zoom + zoom));
    schedule();
  };

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      dragging = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
    },
    events,
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!dragging) return;
      adjust((event.clientX - dragging.x) * 0.008, (event.clientY - dragging.y) * 0.006);
      dragging = { x: event.clientX, y: event.clientY };
    },
    events,
  );
  for (const event of ["pointerup", "pointercancel"])
    canvas.addEventListener(
      event,
      () => {
        dragging = null;
      },
      events,
    );
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      adjust(0, 0, event.deltaY > 0 ? -0.08 : 0.08);
    },
    { ...events, passive: false },
  );
  canvas.addEventListener(
    "keydown",
    (event) => {
      const moves: Record<string, [number, number, number]> = {
        ArrowLeft: [-0.12, 0, 0],
        ArrowRight: [0.12, 0, 0],
        ArrowUp: [0, -0.1, 0],
        ArrowDown: [0, 0.1, 0],
        "+": [0, 0, 0.1],
        "=": [0, 0, 0.1],
        "-": [0, 0, -0.1],
      };
      if (event.key === "0") {
        event.preventDefault();
        camera = initialCamera();
        schedule();
      }
      if (!moves[event.key]) return;
      event.preventDefault();
      adjust(...moves[event.key]);
    },
    events,
  );
  const resize = new ResizeObserver(schedule);
  resize.observe(canvas);
  const theme = new MutationObserver(schedule);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mono-theme"],
  });
  schedule();
  return {
    update: (next: WindSurface, nextSpeed: number, nextDirection: number) => {
      mesh = buildMesh(next);
      speed = nextSpeed;
      direction = wrapBearing(nextDirection);
      schedule();
    },
    marker: (nextSpeed: number, nextDirection: number) => {
      speed = nextSpeed;
      direction = wrapBearing(nextDirection);
      schedule();
    },
    rotate: (yaw: number, pitch: number) => adjust(yaw, pitch),
    reset: () => {
      camera = initialCamera();
      schedule();
    },
    destroy: () => {
      abort.abort();
      resize.disconnect();
      theme.disconnect();
      cancelAnimationFrame(frame);
    },
  };
};

const polygon = (ctx: CanvasRenderingContext2D, points: Projected[]) => {
  ctx.beginPath();
  points.forEach((p, index) => {
    if (index) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  });
  ctx.closePath();
};

const stroke = (
  ctx: CanvasRenderingContext2D,
  points: Projected[],
  color: string,
  width: number,
) => {
  ctx.beginPath();
  points.forEach((p, index) => {
    if (index) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
};

const drawAxes = (
  ctx: CanvasRenderingContext2D,
  mesh: Mesh,
  projected: (v: Vertex) => Projected,
  palette: { text: string; grid: string },
  width: number,
  height: number,
) => {
  const vertex = (speed: number, direction: number, value = mesh.minimum) =>
    projected(windVertex(value, speed, direction, mesh.minimum, mesh.maximum));

  ctx.font = "10px system-ui";
  ctx.fillStyle = palette.text;
  ctx.textAlign = "center";
  for (const speed of [25, 50, 75, 100]) {
    const ring = Array.from({ length: 73 }, (_, index) => vertex(speed, index * 5));
    stroke(ctx, ring, palette.grid, 1);
    const p = vertex(speed, 160);
    ctx.fillText(String(speed), p.x + 6, p.y + 13);
  }
  for (const direction of [0, 45, 90, 135, 180, 225, 270, 315]) {
    stroke(ctx, [vertex(0, direction), vertex(100, direction)], palette.grid, 1);
  }
  stroke(ctx, [vertex(120, 315), vertex(120, 315, mesh.maximum)], palette.text, 1);
  for (const value of new Set([mesh.minimum, 0, mesh.maximum])) {
    if (
      value === 0 &&
      [mesh.minimum, mesh.maximum].some(
        (edge) => edge !== 0 && Math.abs(vertex(120, 315, edge).y - vertex(120, 315, 0).y) < 14,
      )
    )
      continue;
    const p = vertex(120, 315, value);
    ctx.textAlign = "right";
    ctx.fillText(number(value, 0), p.x - 9, p.y + 3);
  }
  ctx.textAlign = "center";
  const points = vertex(120, 315, mesh.maximum);
  ctx.fillText("Radius · wind speed (km/h)", 110, height - 13);
  ctx.fillText("Angle · direction FROM", width - 100, height - 13);
  ctx.fillText("Points", points.x, points.y - 16);
};

const drawCompassLabels = (
  ctx: CanvasRenderingContext2D,
  mesh: Mesh,
  projected: (v: Vertex) => Projected,
  color: string,
) => {
  ctx.font = "10px system-ui";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  const cardinal: Record<number, string> = {
    0: "N · 0°",
    90: "E · 90°",
    180: "S · 180°",
    270: "W · 270°",
  };
  for (const direction of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const p = projected(windVertex(mesh.minimum, 116, direction, mesh.minimum, mesh.maximum));
    ctx.fillText(cardinal[direction] ?? `${direction}°`, p.x, p.y + 3);
  }
};
