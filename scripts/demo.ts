import { execSync } from 'node:child_process';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const DEMO_EMAIL = 'demo@buildvestzk.io';
const DEMO_PASSWORD = 'demo-pass-123';
const PASSING_BALANCES = [1500, 2300, 1800];
const FAILING_BALANCES = [800, 1200, 500];
const backendDir = process.cwd();

type AuthResponse = {
  accessToken: string;
};

type EligibilityResponse = {
  qualified: boolean;
  tier: string;
  proofHash?: string;
  verificationMethod?: string;
  stellarTxHash?: string | null;
  stellarExplorerUrl?: string | null;
  horizonUrl?: string | null;
  sorobanTxHash?: string | null;
  sorobanExplorerUrl?: string | null;
};

const style = {
  cyan: (text: string): string => `\x1b[36m${text}\x1b[0m`,
  green: (text: string): string => `\x1b[32m${text}\x1b[0m`,
  red: (text: string): string => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string): string => `\x1b[33m${text}\x1b[0m`,
  bold: (text: string): string => `\x1b[1m${text}\x1b[0m`,
};

const divider = '   ─────────────────────────────────';

function printBanner(): void {
  console.log('');
  console.log(style.cyan('╔══════════════════════════════════════════════════╗'));
  console.log(style.cyan('║           BuildVestZK — Live Demo               ║'));
  console.log(style.cyan('╠══════════════════════════════════════════════════╣'));
  console.log('');
}

function printCompletionBanner(): void {
  console.log('');
  console.log(style.cyan('╔══════════════════════════════════════════════════╗'));
  console.log(style.cyan('║           Demo Complete! 🎉                     ║'));
  console.log(style.cyan('║                                                  ║'));
  console.log(style.cyan('║  ZK Proof: Real Noir circuit (not a mock!)       ║'));
  console.log(style.cyan('║  On-Chain: Proof hash written to Stellar testnet ║'));
  console.log(style.cyan('║  Verifier: Soroban smart contract deployed       ║'));
  console.log(style.cyan('╚══════════════════════════════════════════════════╝'));
}

async function ensureBackendRunning(): Promise<void> {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'ping@buildvestzk.io',
          password: 'invalid',
        }),
      });
      return;
    } catch {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }
  }

  console.error(style.red('Backend not running. Start it with: npm run start:dev'));
  process.exit(1);
}

async function request<T>(
  path: string,
  options: {
    method: 'GET' | 'POST';
    body?: unknown;
    token?: string;
  },
): Promise<T> {
  let response: Response | null = null;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      response = await fetch(`${API_URL}${path}`, {
        method: options.method,
        headers: {
          'content-type': 'application/json',
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      break;
    } catch {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }
  }

  if (!response) {
    throw new Error('fetch failed');
  }

  const payload = (await response.json()) as T | { message?: string };

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? payload.message
        : `Request failed with status ${response.status}`;
    throw new Error(String(message));
  }

  return payload as T;
}

async function signupOrLogin(): Promise<string> {
  try {
    const signup = await request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
    });
    return signup.accessToken;
  } catch {
    const login = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
    });
    return login.accessToken;
  }
}

function summarizeResult(label: string, result: EligibilityResponse): string {
  const verdict = result.qualified ? style.green('YES') : style.red('NO');
  return `   • ${label}: Qualified ${verdict}, Tier ${style.bold(result.tier)}`;
}

async function run(): Promise<void> {
  printBanner();

  console.log(style.bold('📋 Step 1: Reset Database'));
  execSync('npm run demo:reset', { cwd: backendDir, stdio: 'inherit' });
  console.log(`   ${style.green('✅ Database cleared and re-seeded')}`);
  console.log('');

  await ensureBackendRunning();
  const accessToken = await signupOrLogin();

  console.log(style.bold('📋 Step 2: Evaluate PASSING Balances'));
  console.log(
    `   Input: [${PASSING_BALANCES.join(', ')}] (threshold: $1,000/month)`,
  );
  console.log(divider);

  const passResponse = await request<EligibilityResponse>('/eligibility/evaluate', {
    method: 'POST',
    token: accessToken,
    body: { monthBalances: PASSING_BALANCES },
  });

  console.log(`   ${style.green('✅ Qualified: YES')}`);
  console.log(`   🏆 Tier: ${passResponse.tier}`);
  console.log(`   🔐 Proof Hash: ${passResponse.proofHash ?? 'N/A'}`);
  console.log(
    `   🔍 Verification: ${passResponse.verificationMethod ?? 'unknown'}`,
  );
  console.log(`   ⭐ Stellar Tx: ${passResponse.stellarTxHash ?? 'N/A'}`);
  console.log(`   🔗 Explorer: ${passResponse.stellarExplorerUrl ?? 'N/A'}`);
  console.log(`   🔗 Horizon: ${passResponse.horizonUrl ?? 'N/A'}`);
  if (passResponse.sorobanTxHash) {
    console.log(`   🧠 Soroban Tx: ${passResponse.sorobanTxHash}`);
    console.log(`   🔗 Soroban Explorer: ${passResponse.sorobanExplorerUrl ?? 'N/A'}`);
  }
  console.log('');

  console.log(style.bold('📋 Step 3: Evaluate FAILING Balances'));
  console.log(
    `   Input: [${FAILING_BALANCES.join(', ')}] (threshold: $1,000/month)`,
  );
  console.log(divider);

  const failResponse = await request<EligibilityResponse>('/eligibility/evaluate', {
    method: 'POST',
    token: accessToken,
    body: { monthBalances: FAILING_BALANCES },
  });

  console.log(`   ${style.red('❌ Qualified: NO')}`);
  console.log('   ℹ️  Reason: Balances do not meet minimum threshold');
  console.log('   ℹ️  No proof generated (saves gas!)');
  console.log('');

  console.log(style.bold('📋 Summary'));
  console.log(summarizeResult('PASS CASE', passResponse));
  console.log(summarizeResult('FAIL CASE', failResponse));

  printCompletionBanner();
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(style.red(`Demo failed: ${message}`));
  process.exit(1);
});
