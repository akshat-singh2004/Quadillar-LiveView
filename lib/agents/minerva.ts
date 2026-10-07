import { AabbCollisionDetector, BoundingBox3D } from "./sub-agents/minerva/aabb-collision";
import { HermesAgent } from "./hermes";

export class MinervaAgent {
  static testClash(boxA: BoundingBox3D, boxB: BoundingBox3D, clearanceM = 0.05) {
    return AabbCollisionDetector.checkCollision(boxA, boxB, clearanceM);
  }
}
