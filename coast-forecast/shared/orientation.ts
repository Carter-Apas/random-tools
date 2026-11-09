export interface Coordinate {
  latitude: number;
  longitude: number;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

const degrees = (angle: number) => (angle * 180) / Math.PI;

export const wrapBearing = (value: number): number => ((value % 360) + 360) % 360;

export const destination = (origin: Coordinate, bearing: number, metres: number): Coordinate => {
  const angular = metres / 6371000;
  const lat = radians(origin.latitude);
  const lng = radians(origin.longitude);
  const heading = radians(bearing);
  const latitude = Math.asin(
    Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(heading),
  );
  const longitude =
    lng +
    Math.atan2(
      Math.sin(heading) * Math.sin(angular) * Math.cos(lat),
      Math.cos(angular) - Math.sin(lat) * Math.sin(latitude),
    );
  return { latitude: degrees(latitude), longitude: wrapBearing(degrees(longitude) + 180) - 180 };
};

export const bearingBetween = (from: Coordinate, to: Coordinate): number => {
  const first = radians(from.latitude);
  const second = radians(to.latitude);
  const delta = radians(to.longitude - from.longitude);
  return wrapBearing(
    degrees(
      Math.atan2(
        Math.sin(delta) * Math.cos(second),
        Math.cos(first) * Math.sin(second) - Math.sin(first) * Math.cos(second) * Math.cos(delta),
      ),
    ),
  );
};

export const shoreNormal = (axis: number, currentOffshore: number): number => {
  const candidates = [wrapBearing(axis + 90), wrapBearing(axis - 90)];

  const distance = (value: number) => Math.abs(wrapBearing(value - currentOffshore + 180) - 180);

  return candidates.sort((a, b) => distance(a) - distance(b))[0];
};

export const directionReferences = (offshore: number) => [
  { bearing: wrapBearing(offshore), label: "Land · offshore wind from", kind: "land" },
  { bearing: wrapBearing(offshore + 180), label: "Sea · onshore wind / swell from", kind: "sea" },
  { bearing: wrapBearing(offshore + 90), label: "Along shore", kind: "shore" },
  { bearing: wrapBearing(offshore - 90), label: "Along shore", kind: "shore" },
];
