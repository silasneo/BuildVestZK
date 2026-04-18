#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, BytesN, Env};

#[cfg(test)]
mod test;

const VERIFIED_KEY: &str = "verified";

#[contract]
pub struct VerifierContract;

#[contractimpl]
impl VerifierContract {
    /// Verifies a ZK proof hash against a balances hash and threshold.
    ///
    /// For the hackathon MVP this accepts any well-formed 32-byte proof hash
    /// (real UltraHonk verification is complex). On success the proof hash is
    /// stored in persistent contract storage and an event is emitted.
    pub fn verify(
        env: Env,
        proof_hash: BytesN<32>,
        _balances_hash: BytesN<32>,
        _threshold: u64,
    ) -> bool {
        // Store the proof hash as verified
        env.storage()
            .persistent()
            .set(&(symbol_short!(VERIFIED_KEY), proof_hash.clone()), &true);

        // Emit verification event
        env.events()
            .publish((symbol_short!("verify"),), proof_hash);

        true
    }

    /// Returns whether a proof hash has been previously verified.
    pub fn is_verified(env: Env, proof_hash: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&(symbol_short!(VERIFIED_KEY), proof_hash))
            .unwrap_or(false)
    }
}
