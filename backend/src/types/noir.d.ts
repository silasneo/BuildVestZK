declare module '@noir-lang/noir_js' {
  export interface NoirCircuitArtifact {
    bytecode?: string;
    [key: string]: unknown;
  }

  export interface NoirProofInput {
    balances: string[];
    threshold: string;
    [key: string]: unknown;
  }

  export type NoirWitness =
    | Uint8Array
    | ArrayBuffer
    | string
    | number[]
    | Record<string, unknown>;

  export interface NoirProofObject {
    proof?: Uint8Array | ArrayBuffer;
    proofData?: Uint8Array | ArrayBuffer;
    bytes?: Uint8Array | ArrayBuffer;
    [key: string]: unknown;
  }

  export type NoirProof = Uint8Array | ArrayBuffer | NoirProofObject;

  export interface NoirExecutionResult {
    witness?: NoirWitness;
    [key: string]: unknown;
  }

  export class Noir {
    constructor(circuit: NoirCircuitArtifact);
    /** Available in newer Noir JS runtimes that support one-step proof generation. */
    generateFinalProof?(inputs: NoirProofInput): Promise<NoirProof>;
    /** Available in newer Noir JS runtimes for verifying final proof objects. */
    verifyFinalProof?(proof: NoirProof): Promise<boolean>;
    /** Available in older Noir JS runtimes that produce a witness for backend proving. */
    execute?(
      inputs: NoirProofInput,
    ): Promise<NoirExecutionResult | NoirWitness>;
  }
}

declare module '@noir-lang/backend_barretenberg' {
  import type { NoirProof, NoirWitness } from '@noir-lang/noir_js';

  export class UltraHonkBackend {
    constructor(circuit: string | Record<string, unknown>);
    generateProof?(witness: NoirWitness): Promise<NoirProof>;
    verifyProof?(proof: NoirProof): Promise<boolean>;
    destroy?(): Promise<void>;
  }

  export class BarretenbergBackend {
    constructor(circuit: string | Record<string, unknown>);
    generateProof?(witness: NoirWitness): Promise<NoirProof>;
    verifyProof?(proof: NoirProof): Promise<boolean>;
    destroy?(): Promise<void>;
  }
}
