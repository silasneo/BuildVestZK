import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import { join, resolve } from 'path';
import { ProofService } from '../proof/proof.service';

interface NoirProofResult {
  proof: Uint8Array;
  publicInputs: { threshold: number };
  proofHash: string;
  verified: boolean;
  verificationMethod: 'noir';
}

interface ProofResult {
  proof: Uint8Array | null;
  publicInputs: { threshold: number };
  proofHash: string;
  verified: boolean;
  verificationMethod: 'noir' | 'mock';
  warning?: string;
}

@Injectable()
export class ZkService {
  private readonly logger = new Logger(ZkService.name);
  private cachedArtifact?: Record<string, unknown>;

  constructor(private readonly proofService: ProofService) {}

  async generateAndVerify(
    monthBalances: number[],
    threshold: number,
  ): Promise<ProofResult> {
    try {
      return await this.generateNoirProof(monthBalances, threshold);
    } catch (error) {
      const warning = `Noir proof generation failed; falling back to mock proof. ${this.getErrorMessage(error)}`;
      this.logger.warn(warning);
      const fallback = await this.proofService.generateMockProof(
        monthBalances,
        threshold,
      );

      return {
        proof: null,
        publicInputs: { threshold },
        proofHash: fallback.proofHash,
        verified: fallback.verified,
        verificationMethod: 'mock',
        warning,
      };
    }
  }

  private async generateNoirProof(
    monthBalances: number[],
    threshold: number,
  ): Promise<NoirProofResult> {
    const circuit = await this.loadArtifact();
    const noirJsModule = await import('@noir-lang/noir_js');
    const backendModule = await import('@noir-lang/backend_barretenberg');
    const NoirConstructor = (
      noirJsModule as { Noir?: new (...args: unknown[]) => unknown }
    ).Noir;
    const BackendConstructor = (
      backendModule as {
        UltraHonkBackend?: new (...args: unknown[]) => unknown;
        BarretenbergBackend?: new (...args: unknown[]) => unknown;
      }
    ).UltraHonkBackend
      ? (
          backendModule as {
            UltraHonkBackend: new (...args: unknown[]) => unknown;
          }
        ).UltraHonkBackend
      : (
          backendModule as {
            BarretenbergBackend: new (...args: unknown[]) => unknown;
          }
        ).BarretenbergBackend;

    if (!NoirConstructor || !BackendConstructor) {
      throw new Error('Noir runtime exports are unavailable.');
    }

    const noir = new NoirConstructor(circuit) as Record<string, unknown>;
    const backend = new BackendConstructor(circuit) as Record<string, unknown>;
    const input = {
      balances: monthBalances.map((monthBalance) => monthBalance.toString()),
      threshold: threshold.toString(),
    };

    const proofBytes = await this.runProofFlow(noir, backend, input);
    const proofHash = createHash('sha256')
      .update(Buffer.from(proofBytes))
      .digest('hex');

    return {
      proof: proofBytes,
      publicInputs: { threshold },
      proofHash,
      verified: true,
      verificationMethod: 'noir',
    };
  }

  private async runProofFlow(
    noir: Record<string, unknown>,
    backend: Record<string, unknown>,
    input: { balances: string[]; threshold: string },
  ): Promise<Uint8Array> {
    const generateFinalProof = noir.generateFinalProof as
      | ((inputs: unknown) => Promise<unknown>)
      | undefined;

    if (generateFinalProof) {
      const finalProof = await generateFinalProof.call(noir, input);
      const proofBytes = this.extractProofBytes(finalProof);
      const verifyFinalProof = noir.verifyFinalProof as
        | ((proof: unknown) => Promise<boolean>)
        | undefined;

      if (verifyFinalProof) {
        const verified = await verifyFinalProof.call(noir, finalProof);
        if (!verified) {
          throw new Error('Generated Noir proof did not verify.');
        }
      } else {
        const verifyProof = backend.verifyProof as
          | ((proof: unknown) => Promise<boolean>)
          | undefined;

        if (verifyProof) {
          const verified = await verifyProof.call(backend, finalProof);
          if (!verified) {
            throw new Error('Generated Noir proof did not verify.');
          }
        }
      }

      return proofBytes;
    }

    const execute = noir.execute as
      | ((inputs: unknown) => Promise<unknown>)
      | undefined;
    const generateProof = backend.generateProof as
      | ((witness: unknown) => Promise<unknown>)
      | undefined;
    const verifyProof = backend.verifyProof as
      | ((proof: unknown) => Promise<boolean>)
      | undefined;

    if (!execute || !generateProof || !verifyProof) {
      throw new Error('Unsupported Noir runtime API.');
    }

    const executionResult = await execute.call(noir, input);
    const witness =
      (executionResult as { witness?: unknown }).witness ?? executionResult;
    const proof = await generateProof.call(backend, witness);
    const verified = await verifyProof.call(backend, proof);

    if (!verified) {
      throw new Error('Generated Noir proof did not verify.');
    }

    return this.extractProofBytes(proof);
  }

  private extractProofBytes(proof: unknown): Uint8Array {
    if (proof instanceof Uint8Array) {
      return proof;
    }

    if (proof instanceof ArrayBuffer) {
      return new Uint8Array(proof);
    }

    if (proof && typeof proof === 'object') {
      const candidate =
        (proof as { proof?: unknown; proofData?: unknown; bytes?: unknown })
          .proof ??
        (proof as { proofData?: unknown }).proofData ??
        (proof as { bytes?: unknown }).bytes;

      if (candidate instanceof Uint8Array) {
        return candidate;
      }

      if (candidate instanceof ArrayBuffer) {
        return new Uint8Array(candidate);
      }
    }

    throw new Error('Unable to serialize Noir proof output.');
  }

  private async loadArtifact(): Promise<Record<string, unknown>> {
    if (this.cachedArtifact) {
      return this.cachedArtifact;
    }

    const artifactPath =
      process.env.NOIR_CIRCUIT_ARTIFACT_PATH ??
      this.resolveDefaultArtifactPath();

    const artifactRaw = await fs.readFile(artifactPath, 'utf8');
    this.cachedArtifact = JSON.parse(artifactRaw) as Record<string, unknown>;
    return this.cachedArtifact;
  }

  private resolveDefaultArtifactPath(): string {
    const cwd = process.cwd();
    const candidatePaths = [
      resolve(cwd, 'circuits/balance_check/target/balance_check.json'),
      resolve(cwd, '../circuits/balance_check/target/balance_check.json'),
      resolve(
        __dirname,
        '../../../circuits/balance_check/target/balance_check.json',
      ),
      join(cwd, 'target/balance_check.json'),
    ];

    const existingPath = candidatePaths.find((candidate) =>
      existsSync(candidate),
    );

    if (!existingPath) {
      throw new Error(
        'Noir circuit artifact not found. Compile with nargo compile in circuits/balance_check.',
      );
    }

    return existingPath;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
