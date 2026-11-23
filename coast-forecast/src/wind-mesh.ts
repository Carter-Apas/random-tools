import { compileWindSurface, windMaximum } from "../shared/wind-surface";
import type { WindSurface } from "../shared/types";

export interface Vertex {
  x: number;
  y: number;
  z: number;
  points: number;
}

export interface Mesh {
  rows: Vertex[][];
  slices: { direction: number; vertices: Vertex[] }[];
  minimum: number;
  maximum: number;
  evaluate: (speed: number, direction: number) => number;
}

export interface Camera {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface Projected {
  x: number;
  y: number;
  depth: number;
}

export const buildMesh = (surface: WindSurface): Mesh => {
  const evaluate = compileWindSurface(surface);
  const minimum = Math.min(
    0,
    ...surface.slices.flatMap((slice) => slice.curve.points.map((point) => point.y)),
  );
  const maximum = Math.max(1, windMaximum(surface));
  const directions = [
    ...new Set([
      0,
      360,
      ...Array.from({ length: 25 }, (_, index) => index * 15),
      ...surface.slices.map((slice) => slice.direction),
    ]),
  ].sort((a, b) => a - b);
  const best = surface.slices
    .flatMap((slice) => slice.curve.points)
    .find((point) => point.y === windMaximum(surface))!;
  const speeds = [
    ...new Set([...Array.from({ length: 26 }, (_, index) => index * 4), best.x]),
  ].sort((a, b) => a - b);
  const rows = directions.map((direction) =>
    speeds.map((speed) =>
      windVertex(evaluate(speed, direction), speed, direction, minimum, maximum),
    ),
  );
  const slices = surface.slices.map((slice) => ({
    direction: slice.direction,
    vertices: [
      ...new Set([
        ...Array.from({ length: 101 }, (_, index) => index),
        ...slice.curve.points.map((point) => point.x),
      ]),
    ]
      .sort((a, b) => a - b)
      .map((speed) =>
        windVertex(evaluate(speed, slice.direction), speed, slice.direction, minimum, maximum),
      ),
  }));
  return { rows, slices, minimum, maximum, evaluate };
};

export const windVertex = (
  points: number,
  speed: number,
  direction: number,
  minimum: number,
  maximum: number,
): Vertex => ({
  x: (speed / 100) * Math.sin((direction * Math.PI) / 180),
  y: -(speed / 100) * Math.cos((direction * Math.PI) / 180),
  z: ((points - minimum) / (maximum - minimum)) * 1.6 - 0.8,
  points,
});

export const project = (
  vertex: Vertex,
  camera: Camera,
  width: number,
  height: number,
): Projected => {
  const x = vertex.x * Math.cos(camera.yaw) - vertex.y * Math.sin(camera.yaw);
  const y = vertex.x * Math.sin(camera.yaw) + vertex.y * Math.cos(camera.yaw);
  const scale = Math.min(width / 2.9, height / 2.7) * camera.zoom;
  return {
    x: width / 2 + x * scale,
    y: height * 0.44 + (y * Math.sin(camera.pitch) - vertex.z * Math.cos(camera.pitch)) * scale,
    depth: y * Math.cos(camera.pitch) + vertex.z * Math.sin(camera.pitch),
  };
};
