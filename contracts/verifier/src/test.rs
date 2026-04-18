#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Events, vec, Env, IntoVal};

#[test]
fn test_verify_stores_and_returns_true() {
    let env = Env::default();
    let contract_id = env.register(VerifierContract, ());
    let client = VerifierContractClient::new(&env, &contract_id);

    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let balances_hash = BytesN::from_array(&env, &[2u8; 32]);

    let result = client.verify(&proof_hash, &balances_hash, &1000u64);
    assert!(result);
}

#[test]
fn test_is_verified_returns_false_for_unknown() {
    let env = Env::default();
    let contract_id = env.register(VerifierContract, ());
    let client = VerifierContractClient::new(&env, &contract_id);

    let proof_hash = BytesN::from_array(&env, &[99u8; 32]);

    assert!(!client.is_verified(&proof_hash));
}

#[test]
fn test_is_verified_returns_true_after_verify() {
    let env = Env::default();
    let contract_id = env.register(VerifierContract, ());
    let client = VerifierContractClient::new(&env, &contract_id);

    let proof_hash = BytesN::from_array(&env, &[3u8; 32]);
    let balances_hash = BytesN::from_array(&env, &[4u8; 32]);

    client.verify(&proof_hash, &balances_hash, &500u64);
    assert!(client.is_verified(&proof_hash));
}

#[test]
fn test_verify_emits_event() {
    let env = Env::default();
    let contract_id = env.register(VerifierContract, ());
    let client = VerifierContractClient::new(&env, &contract_id);

    let proof_hash = BytesN::from_array(&env, &[5u8; 32]);
    let balances_hash = BytesN::from_array(&env, &[6u8; 32]);

    client.verify(&proof_hash, &balances_hash, &1000u64);

    let events = env.events().all();
    assert!(!events.is_empty());

    let last_event = events.last().unwrap();
    let expected_topics = (symbol_short!("verify"),).into_val(&env);
    assert_eq!(last_event.1, expected_topics);
}

#[test]
fn test_multiple_verifications() {
    let env = Env::default();
    let contract_id = env.register(VerifierContract, ());
    let client = VerifierContractClient::new(&env, &contract_id);

    let proof_hash_1 = BytesN::from_array(&env, &[10u8; 32]);
    let proof_hash_2 = BytesN::from_array(&env, &[20u8; 32]);
    let balances_hash = BytesN::from_array(&env, &[30u8; 32]);

    client.verify(&proof_hash_1, &balances_hash, &1000u64);
    client.verify(&proof_hash_2, &balances_hash, &2000u64);

    assert!(client.is_verified(&proof_hash_1));
    assert!(client.is_verified(&proof_hash_2));
}
