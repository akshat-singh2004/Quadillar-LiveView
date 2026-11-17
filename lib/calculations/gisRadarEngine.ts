/**
 * PROJECT VANGUARD: GIS RADAR & SPATIAL GEOFENCING ENGINE
 * Formulated strictly under:
 * - Central Electricity Authority (Safety Requirements for Electrical Plants and Lines) Regulations Cl. 64
 * - IS 13367 (Part 1): Safe Use of Cranes - Code of Practice
 * - Directorate General of Civil Aviation (DGCA) Drone Flight Rules (CAR Section 3)
 * - WGS84 Geodetic to UTM Zone 44N (Lucknow Datum: 26.8520 N, 80.9980 E)
 *
 * Mathematically calculates:
 * 1. Tower Crane Jib Tip Coordinates: (x_tip, y_tip) = (x_c + R * cos(theta), y_c + R * sin(theta))
 * 2. Orthogonal Distance to Prohibited 11kV Overhead Powerline Vector:
 *      d_perp = | (y2 - y1)*x - (x2 - x1)*y + x2*y1 - y2*x1 | / sqrt( (y2 - y1)^2 + (x2 - x1)^2 )
 * 3. Drone Photogrammetry Ground Sampling Distance (GSD):
 *      GSD = (FlightHeight * SensorWidth) / (FocalLength * ImageWidth)
 * 4. Automatic Slew-Brake Safety Interlock when d_perp <= Statutory Buffer (3.5m)
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface GeofencePolygon {
  zoneId: string;
  zoneName: string;
  type: "BUILDING_FOOTPRINT" | "POWERLINE_EXCLUSION" | "PUBLIC_ROAD" | "SITE_BOUNDARY";
  points: Point2D[];
  minBufferM: number;
}

export interface CraneKinematicState {
  mastCoord: Point2D;          // Base mast location (-6.5m, 3.5m from Vanguard centroid)
  jibRadiusM: number;          // Maximum boom length (e.g., 35.0 meters)
  trolleyRadiusM: number;      // Current trolley travel along boom (0 to 35m)
  slewAngleDeg: number;        // Slewing orientation (0 to 360 deg)
  hookElevationM: number;      // Hook clearance (+0m to +28m)
  suspendedLoadTonnage: number;// Current suspended load in MT
}

export interface PhotogrammetryFlightSpec {
  altitudeAGLM: number;        // Flight height above ground (e.g. 45.0m)
  sensorWidthMm: number;       // Camera sensor width (13.2mm 1-inch CMOS)
  focalLengthMm: number;       // Lens focal length (8.8mm)
  imageWidthPx: number;        // 5472 pixels
  imageHeightPx: number;       // 3648 pixels
  forwardOverlapPct: number;   // 80% overlap
  sideOverlapPct: number;      // 70% overlap
}

// 1. Calculate Jib Tip and Trolley Load Spatial Position
export function calculateCraneTipPosition(crane: CraneKinematicState): {
  tipCoord: Point2D;
  trolleyCoord: Point2D;
} {
  const thetaRad = (crane.slewAngleDeg * Math.PI) / 180;
  const tipCoord: Point2D = {
    x: +(crane.mastCoord.x + crane.jibRadiusM * Math.cos(thetaRad)).toFixed(2),
    y: +(crane.mastCoord.y + crane.jibRadiusM * Math.sin(thetaRad)).toFixed(2)
  };
  const trolleyCoord: Point2D = {
    x: +(crane.mastCoord.x + crane.trolleyRadiusM * Math.cos(thetaRad)).toFixed(2),
    y: +(crane.mastCoord.y + crane.trolleyRadiusM * Math.sin(thetaRad)).toFixed(2)
  };
  return { tipCoord, trolleyCoord };
}

// 2. Perpendicular Distance from Point to 2D Line Segment
export function calculateDistanceToLineSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return +Math.hypot(p.x - projX, p.y - projY).toFixed(2);
}

// 3. Central Electricity Authority 11kV Powerline Clearance & Slew Brake Evaluation
export function evaluatePowerlineClearance(
  trolleyPos: Point2D,
  tipPos: Point2D,
  powerlineStart: Point2D,
  powerlineEnd: Point2D,
  statutoryLimitM = 3.50 // CEA mandated buffer: 2.0m line + 1.5m safety margin
): {
  distanceTrolleyToLineM: number;
  distanceTipToLineM: number;
  minSeparationM: number;
  isInterlockTriggered: boolean;
  status: "SAFE_CLEARANCE" | "PROXIMITY_WARNING" | "EMERGENCY_BRAKE_LOCKED";
} {
  const distTrolley = calculateDistanceToLineSegment(trolleyPos, powerlineStart, powerlineEnd);
  const distTip = calculateDistanceToLineSegment(tipPos, powerlineStart, powerlineEnd);
  const minSep = Math.min(distTrolley, distTip);

  let status: "SAFE_CLEARANCE" | "PROXIMITY_WARNING" | "EMERGENCY_BRAKE_LOCKED" = "SAFE_CLEARANCE";
  let interlock = false;

  if (minSep <= statutoryLimitM) {
    status = "EMERGENCY_BRAKE_LOCKED";
    interlock = true;
  } else if (minSep <= statutoryLimitM + 3.0) {
    status = "PROXIMITY_WARNING";
  }

  return {
    distanceTrolleyToLineM: distTrolley,
    distanceTipToLineM: distTip,
    minSeparationM: minSep,
    isInterlockTriggered: interlock,
    status
  };
}

// 4. Drone Photogrammetry Ground Sampling Distance (GSD)
export function calculatePhotogrammetryGsd(spec: PhotogrammetryFlightSpec): {
  gsdHorizontalCmPx: number;
  gsdVerticalCmPx: number;
  footprintWidthM: number;
  footprintHeightM: number;
  effectiveResolutionRating: "SUB_CENTIMETER" | "HIGH_PRECISION_SURVEY" | "RECONNAISSANCE";
} {
  // GSD = (H * Sw) / (F * Iw) * 100 (in cm/pixel)
  const gsdH = +((spec.altitudeAGLM * spec.sensorWidthMm) / (spec.focalLengthMm * spec.imageWidthPx) * 100).toFixed(2);
  const sensorHeightMm = (spec.sensorWidthMm * spec.imageHeightPx) / spec.imageWidthPx;
  const gsdV = +((spec.altitudeAGLM * sensorHeightMm) / (spec.focalLengthMm * spec.imageHeightPx) * 100).toFixed(2);

  const footprintWidthM = +((gsdH * spec.imageWidthPx) / 100).toFixed(1);
  const footprintHeightM = +((gsdV * spec.imageHeightPx) / 100).toFixed(1);

  let rating: "SUB_CENTIMETER" | "HIGH_PRECISION_SURVEY" | "RECONNAISSANCE" = "HIGH_PRECISION_SURVEY";
  if (gsdH < 1.0) rating = "SUB_CENTIMETER";
  else if (gsdH > 3.0) rating = "RECONNAISSANCE";

  return {
    gsdHorizontalCmPx: gsdH,
    gsdVerticalCmPx: gsdV,
    footprintWidthM,
    footprintHeightM,
    effectiveResolutionRating: rating
  };
}
