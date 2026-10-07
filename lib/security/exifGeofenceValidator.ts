export interface GeofenceBoundary {
    latitude: number;
    longitude: number;
    radiusMeters: number;
}

export interface ValidatedEvidencePayload {
    valid: boolean;
    sha256Hash: string;
    capturedAt: string;
    coordinates?: {
        latitude: number;
        longitude: number;
        altitude?: number;
    };
    distanceMeters?: number;
    rejectionReason?: string;
}

/**
 * Computes direct distance between two WGS84 geographic points using Haversine formula
 */
function calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth radius in meters
    const radLat1 = (lat1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;
    const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(radLat1) *
        Math.cos(radLat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Extract GPS and DateTime metadata directly from image ArrayBuffer without external dependencies
 */
function parseExifHeader(buffer: ArrayBuffer): {
    latitude?: number;
    longitude?: number;
    dateTaken?: string;
} {
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xffd8) {
        return {}; // Not a standard JPEG
    }

    let offset = 2;
    const length = buffer.byteLength;

    while (offset < length) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);

        if (marker === 0xe1) {
            // APP1 Marker containing EXIF
            const isLittle = view.getUint16(offset + 10, false) === 0x4949;
            return extractGpsFromApp1(view, offset + 10, isLittle);
        }
        offset += 2 + view.getUint16(offset + 2, false);
    }
    return {};
}

function extractGpsFromApp1(
    view: DataView,
    tiffOffset: number,
    littleEndian: boolean
): { latitude?: number; longitude?: number; dateTaken?: string } {
    try {
        const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
        const ifd0 = tiffOffset + firstIfdOffset;
        const entries = view.getUint16(ifd0, littleEndian);

        let gpsOffset = 0;
        for (let i = 0; i < entries; i++) {
            const entry = ifd0 + 2 + i * 12;
            const tag = view.getUint16(entry, littleEndian);
            if (tag === 0x8825) {
                // GPS IFD Pointer
                gpsOffset = tiffOffset + view.getUint32(entry + 8, littleEndian);
                break;
            }
        }

        if (gpsOffset === 0) return {};

        const gpsEntries = view.getUint16(gpsOffset, littleEndian);
        let latValues: number[] = [];
        let lonValues: number[] = [];
        let latRef = 'N';
        let lonRef = 'E';

        for (let i = 0; i < gpsEntries; i++) {
            const entry = gpsOffset + 2 + i * 12;
            const tag = view.getUint16(entry, littleEndian);
            const valOffset = tiffOffset + view.getUint32(entry + 8, littleEndian);

            if (tag === 1) latRef = String.fromCharCode(view.getUint8(entry + 8));
            if (tag === 3) lonRef = String.fromCharCode(view.getUint8(entry + 8));

            if (tag === 2 || tag === 4) {
                const d = view.getUint32(valOffset, littleEndian) / view.getUint32(valOffset + 4, littleEndian);
                const m = view.getUint32(valOffset + 8, littleEndian) / view.getUint32(valOffset + 12, littleEndian);
                const s = view.getUint32(valOffset + 16, littleEndian) / view.getUint32(valOffset + 20, littleEndian);
                const deg = d + m / 60 + s / 3600;
                if (tag === 2) latValues = [deg];
                if (tag === 4) lonValues = [deg];
            }
        }

        if (latValues.length > 0 && lonValues.length > 0) {
            const lat = latRef === 'S' ? -latValues[0] : latValues[0];
            const lon = lonRef === 'W' ? -lonValues[0] : lonValues[0];
            return { latitude: lat, longitude: lon };
        }
    } catch {
        // Malformed EXIF header fallback
    }
    return {};
}

/**
 * Validates photo against site perimeter, generates SHA-256 for Section 65B compliance
 */
export async function validateSiteEvidence(
    file: File,
    boundary: GeofenceBoundary
): Promise<ValidatedEvidencePayload> {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Generate SHA-256 Checksum
    const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(digest));
    const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // 2. Extract Embedded EXIF GPS Tags
    const { latitude, longitude } = parseExifHeader(arrayBuffer);

    if (!latitude || !longitude) {
        return {
            valid: false,
            sha256Hash,
            capturedAt: new Date().toISOString(),
            rejectionReason:
                'EXIF_BREACH: Hardware GPS tags missing. Image must be captured via active mobile camera.',
        };
    }

    // 3. Compute Distance to Project Centroid
    const distance = calculateHaversineDistance(
        latitude,
        longitude,
        boundary.latitude,
        boundary.longitude
    );

    const withinGeofence = distance <= boundary.radiusMeters;

    return {
        valid: withinGeofence,
        sha256Hash,
        capturedAt: new Date().toISOString(),
        coordinates: { latitude, longitude },
        distanceMeters: Math.round(distance),
        rejectionReason: withinGeofence
            ? undefined
            : `GEOFENCE_BREACH: Inspection taken ${Math.round(distance)}m from site center (Permitted radius: ${boundary.radiusMeters}m).`,
    };
}