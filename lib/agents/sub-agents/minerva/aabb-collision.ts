export interface BoundingBox3D {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

export class AabbCollisionDetector {
  static checkCollision(boxA: BoundingBox3D, boxB: BoundingBox3D, clearanceM = 0.05): boolean {
    return (
      boxA.minX - clearanceM <= boxB.maxX &&
      boxA.maxX + clearanceM >= boxB.minX &&
      boxA.minY - clearanceM <= boxB.maxY &&
      boxA.maxX + clearanceM >= boxB.minY &&
      boxA.minZ - clearanceM <= boxB.maxZ &&
      boxA.maxZ + clearanceM >= boxB.minZ
    );
  }
}
