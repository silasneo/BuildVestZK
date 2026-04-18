declare module '@noir-lang/noir_js' {
  export class Noir {
    constructor(circuit: unknown);
    generateFinalProof?(inputs: unknown): Promise<unknown>;
    verifyFinalProof?(proof: unknown): Promise<boolean>;
    execute?(inputs: unknown): Promise<unknown>;
  }
}

declare module '@noir-lang/backend_barretenberg' {
  export class UltraHonkBackend {
    constructor(circuit: unknown);
    generateProof?(witness: unknown): Promise<unknown>;
    verifyProof(proof: unknown): Promise<boolean>;
    destroy?(): Promise<void>;
  }

  export class BarretenbergBackend {
    constructor(circuit: unknown);
    generateProof?(witness: unknown): Promise<unknown>;
    verifyProof(proof: unknown): Promise<boolean>;
    destroy?(): Promise<void>;
  }
}
