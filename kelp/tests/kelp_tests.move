#[test_only]
module kelp::kelp_tests;

use kelp::kelp::{Self, Kelp, KelpRegistry};
use std::unit_test;
use sui::bcs;
use sui::clock::{Self, Clock};
use sui::coin;
use sui::hash::blake2b256;
use sui::sui::SUI;
use sui::test_scenario::{Self, Scenario};
use sui::vec_set;

// === Test Constants ===

const COMMIT_FEE: u64 = 1_000_000_000;
const REVEAL_WINDOW: u64 = 120_000;
const CHALLENGE_WINDOW: u64 = 120_000;

// Test addresses
const OWNER: address = @0xA;
const CLAIMANT: address = @0xB;
const GUARDIAN1: address = @0xC;
const GUARDIAN2: address = @0xD;
const STRANGER: address = @0xE;

// === Helpers ===

fun setup(scenario: &mut Scenario): (Clock, KelpRegistry) {
    let clock = clock::create_for_testing(scenario.ctx());
    scenario.next_tx(OWNER);
    let kelp_registry = kelp::test_create_kelp_registry(scenario.ctx());
    (clock, kelp_registry)
}

fun teardown(scenario: Scenario, clock: Clock, kelp_registry: KelpRegistry) {
    clock.destroy_for_testing();
    unit_test::destroy(kelp_registry);
    scenario.end();
}

/// Creates a Kelp with no guardians for the OWNER.
fun create_default_kelp(kelp_registry: &mut KelpRegistry, scenario: &mut Scenario) {
    scenario.next_tx(OWNER);
    kelp::create_kelp(
        kelp_registry,
        COMMIT_FEE,
        CHALLENGE_WINDOW,
        true,
        vec_set::empty<address>(),
        scenario.ctx(),
    );
}

/// Creates a Kelp with specified guardians for the OWNER.
fun create_guarded_kelp(
    kelp_registry: &mut KelpRegistry,
    guardians: vector<address>,
    scenario: &mut Scenario,
) {
    scenario.next_tx(OWNER);
    let mut guardian_set = vec_set::empty<address>();
    let mut i = 0;
    while (i < guardians.length()) {
        guardian_set.insert(guardians[i]);
        i = i + 1;
    };
    kelp::create_kelp(
        kelp_registry,
        COMMIT_FEE,
        CHALLENGE_WINDOW,
        true,
        guardian_set,
        scenario.ctx(),
    );
}

/// Computes the commit hash: blake2b256(bcs(kelp_address) || bcs(claimant) || bcs(nonce)).
fun compute_commit_hash(kelp_address: address, claimant: address, nonce: vector<u8>): vector<u8> {
    let mut data = bcs::to_bytes(&kelp_address);
    data.append(bcs::to_bytes(&claimant));
    data.append(bcs::to_bytes(&nonce));
    blake2b256(&data)
}

/// Performs a commit as the given sender.
fun do_commit(
    kelp_registry: &mut KelpRegistry,
    commit_hash: vector<u8>,
    clock: &Clock,
    sender: address,
    scenario: &mut Scenario,
) {
    scenario.next_tx(sender);
    kelp::commit(
        kelp_registry,
        commit_hash,
        coin::mint_for_testing<SUI>(COMMIT_FEE, scenario.ctx()),
        clock,
    );
}

/// Performs a reveal as the given sender.
fun do_reveal(
    kelp_registry: &mut KelpRegistry,
    kelp: &mut Kelp,
    claimant: address,
    nonce: vector<u8>,
    reveal_fee: u64,
    clock: &Clock,
    sender: address,
    scenario: &mut Scenario,
) {
    scenario.next_tx(sender);
    kelp::reveal(
        kelp_registry,
        kelp,
        claimant,
        nonce,
        coin::mint_for_testing<SUI>(reveal_fee, scenario.ctx()),
        clock,
        scenario.ctx(),
    );
}

// ============================================================
// 1. Create Kelp Tests
// ============================================================

#[test]
fun test_create_kelp() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);

    assert!(kelp_registry.test_registry_length() == 1);
    assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, OWNER, &k));
    assert!(k.test_kelp_owner() == OWNER);
    assert!(k.test_kelp_enabled());
    assert!(!k.test_kelp_has_dominant_reveal());
    assert!(k.test_kelp_fees_value() == 0);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_create_kelp_with_guardians() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_guarded_kelp(&mut kelp_registry, vector[GUARDIAN1, GUARDIAN2], &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);

    assert!(k.test_kelp_guardian_count() == 2);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_create_multiple_kelp_objects() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    // Create first kelp
    create_default_kelp(&mut kelp_registry, &mut scenario);
    // Create second kelp
    create_default_kelp(&mut kelp_registry, &mut scenario);

    assert!(kelp_registry.test_registry_length() == 1); // Still 1 owner entry

    scenario.next_tx(OWNER);
    // Both Kelp objects are shared, so the registry tracks them under one owner entry

    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 2. Commit Tests
// ============================================================

#[test]
fun test_commit_success() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);

    let kelp_address = k.test_kelp_address();
    let nonce = b"test_nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    assert!(kelp_registry.test_commits_count() == 1);
    assert!(kelp_registry.test_commit_fees_value() == COMMIT_FEE);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ECommitAlreadyExists)]
fun test_commit_duplicate_hash() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);

    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);
    // Second commit with same hash should fail
    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ECommitFeeNotEnough)]
fun test_commit_insufficient_fee() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);

    let kelp_address = k.test_kelp_address();
    let hash = compute_commit_hash(kelp_address, CLAIMANT, b"nonce");

    scenario.next_tx(CLAIMANT);
    kelp::commit(
        &mut kelp_registry,
        hash,
        coin::mint_for_testing<SUI>(COMMIT_FEE - 1, scenario.ctx()), // Too little
        &clock,
    );

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EInvalidCommitHashLength)]
fun test_commit_invalid_hash_length() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    scenario.next_tx(CLAIMANT);
    kelp::commit(
        &mut kelp_registry,
        b"too_short", // Not 32 bytes
        coin::mint_for_testing<SUI>(COMMIT_FEE, scenario.ctx()),
        &clock,
    );

    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 3. Reveal Tests
// ============================================================

#[test]
fun test_reveal_success_no_guardians() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Anyone can reveal when no guardians
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        STRANGER,
        &mut scenario,
    );

    assert!(k.test_kelp_has_dominant_reveal());
    // commit_fee (1 SUI) + reveal_fee (1 SUI) = 2 SUI
    assert!(k.test_kelp_fees_value() == 2 * COMMIT_FEE);
    assert!(kelp_registry.test_commits_count() == 0);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_reveal_success_with_guardian() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_guarded_kelp(&mut kelp_registry, vector[GUARDIAN1], &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Guardian reveals
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        GUARDIAN1,
        &mut scenario,
    );

    assert!(k.test_kelp_has_dominant_reveal());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ENotGuardian)]
fun test_reveal_rejected_non_guardian() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_guarded_kelp(&mut kelp_registry, vector[GUARDIAN1], &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Stranger tries to reveal — should fail
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        STRANGER,
        &mut scenario,
    );

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ERevealTooLate)]
fun test_reveal_too_late() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Advance past the reveal window
    clock::increment_for_testing(&mut clock, REVEAL_WINDOW + 1);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EKelpNotEnabled)]
fun test_reveal_kelp_disabled() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    // Create with enabled=false
    scenario.next_tx(OWNER);
    kelp::create_kelp(
        &mut kelp_registry,
        COMMIT_FEE,
        CHALLENGE_WINDOW,
        false, // disabled
        vec_set::empty<address>(),
        scenario.ctx(),
    );

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ERevealFeeNotEnough)]
fun test_reveal_insufficient_fee() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Reveal with fee below minimum (kelp requires COMMIT_FEE as reveal_fee_amount)
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE - 1, // Too little
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ECommitNotFound)]
fun test_reveal_wrong_nonce() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let hash = compute_commit_hash(kelp_address, CLAIMANT, b"correct_nonce");

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Reveal with wrong nonce — hash won't match
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        b"wrong_nonce",
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_reveal_dominant_replacement() {
    // Earlier commit should become the dominant reveal, even if revealed second
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();

    // Commit B at t=0 (earlier commit — should win)
    let nonce_b = b"nonce_b";
    let hash_b = compute_commit_hash(kelp_address, CLAIMANT, nonce_b);
    do_commit(&mut kelp_registry, hash_b, &clock, CLAIMANT, &mut scenario);

    // Commit A at t=10 (later commit)
    clock::increment_for_testing(&mut clock, 10);
    let nonce_a = b"nonce_a";
    let hash_a = compute_commit_hash(kelp_address, STRANGER, nonce_a);
    do_commit(&mut kelp_registry, hash_a, &clock, STRANGER, &mut scenario);

    // Reveal A first at t=15 (later commit revealed first)
    clock::increment_for_testing(&mut clock, 5);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        STRANGER,
        nonce_a,
        COMMIT_FEE,
        &clock,
        STRANGER,
        &mut scenario,
    );
    assert!(k.test_kelp_has_dominant_reveal());

    // Reveal B at t=20 (earlier commit revealed second — should replace A)
    clock::increment_for_testing(&mut clock, 5);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce_b,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );
    assert!(k.test_kelp_has_dominant_reveal());

    // Claim should work for CLAIMANT (earlier commit), not STRANGER
    clock::increment_for_testing(&mut clock, CHALLENGE_WINDOW);
    scenario.next_tx(CLAIMANT);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    assert!(k.test_kelp_owner() == CLAIMANT);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 4. Claim Tests
// ============================================================

#[test]
fun test_claim_success() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    // Advance past challenge window
    clock::increment_for_testing(&mut clock, CHALLENGE_WINDOW);

    scenario.next_tx(CLAIMANT);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    // Verify ownership transfer
    assert!(k.test_kelp_owner() == CLAIMANT);
    // Registry: original owner removed, new owner added
    assert!(kelp_registry.test_registry_length() == 1);
    assert!(!kelp::test_registry_contains_kelp_address_owner(&kelp_registry, OWNER, &k));
    assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, CLAIMANT, &k));
    // Dominant reveal is consumed
    assert!(!k.test_kelp_has_dominant_reveal());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EClaimTooSoon)]
fun test_claim_too_soon() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    // Claim immediately (no time advancement) — should fail
    scenario.next_tx(CLAIMANT);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EWrongClaimant)]
fun test_claim_wrong_claimant() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    clock::increment_for_testing(&mut clock, CHALLENGE_WINDOW);

    // STRANGER tries to claim — should fail
    scenario.next_tx(STRANGER);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 5. Challenge Tests
// ============================================================

#[test]
fun test_challenge_success() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    assert!(k.test_kelp_has_dominant_reveal());

    // Owner challenges
    scenario.next_tx(OWNER);
    kelp::challenge(&mut k, scenario.ctx());

    // Dominant reveal is cleared
    assert!(!k.test_kelp_has_dominant_reveal());
    // Owner still owns the kelp
    assert!(k.test_kelp_owner() == OWNER);
    // Fees remain in the kelp (owner can collect them)
    assert!(k.test_kelp_fees_value() == 2 * COMMIT_FEE);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EBadChallenge)]
fun test_challenge_by_non_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    // Stranger tries to challenge — should fail
    scenario.next_tx(STRANGER);
    kelp::challenge(&mut k, scenario.ctx());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_challenge_then_new_claim() {
    // After a challenge clears the dominant reveal, a new commit-reveal-claim cycle can proceed
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();

    // First cycle: commit → reveal → challenge
    let nonce1 = b"nonce1";
    let hash1 = compute_commit_hash(kelp_address, CLAIMANT, nonce1);
    do_commit(&mut kelp_registry, hash1, &clock, CLAIMANT, &mut scenario);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce1,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );
    scenario.next_tx(OWNER);
    kelp::challenge(&mut k, scenario.ctx());
    assert!(!k.test_kelp_has_dominant_reveal());

    // Second cycle: commit → reveal → claim (succeeds because owner lost key)
    clock::increment_for_testing(&mut clock, 1000);
    let nonce2 = b"nonce2";
    let hash2 = compute_commit_hash(kelp_address, CLAIMANT, nonce2);
    do_commit(&mut kelp_registry, hash2, &clock, CLAIMANT, &mut scenario);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce2,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );
    clock::increment_for_testing(&mut clock, CHALLENGE_WINDOW);
    scenario.next_tx(CLAIMANT);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    assert!(k.test_kelp_owner() == CLAIMANT);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 6. Fee Collection Tests
// ============================================================

#[test]
fun test_collect_fees() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    // Owner challenges and collects fees
    scenario.next_tx(OWNER);
    kelp::challenge(&mut k, scenario.ctx());

    scenario.next_tx(OWNER);
    let fees = kelp::collect_fees(&mut k, scenario.ctx());
    assert!(coin::value(&fees) == 2 * COMMIT_FEE);
    assert!(k.test_kelp_fees_value() == 0);

    coin::burn_for_testing(fees);
    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ENotTheKelpOwner)]
fun test_collect_fees_non_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);

    // Stranger tries to collect fees
    scenario.next_tx(STRANGER);
    let fees = kelp::collect_fees(&mut k, scenario.ctx());

    coin::burn_for_testing(fees);
    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 7. Guardian Management Tests
// ============================================================

#[test]
fun test_add_guardian() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);

    assert!(k.test_kelp_guardian_count() == 0);

    scenario.next_tx(OWNER);
    kelp::add_guardian(&mut k, GUARDIAN1, scenario.ctx());
    assert!(k.test_kelp_guardian_count() == 1);

    scenario.next_tx(OWNER);
    kelp::add_guardian(&mut k, GUARDIAN2, scenario.ctx());
    assert!(k.test_kelp_guardian_count() == 2);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EAlreadyAGuardian)]
fun test_add_duplicate_guardian() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);

    scenario.next_tx(OWNER);
    kelp::add_guardian(&mut k, GUARDIAN1, scenario.ctx());
    scenario.next_tx(OWNER);
    kelp::add_guardian(&mut k, GUARDIAN1, scenario.ctx()); // Duplicate

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_remove_guardian() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_guarded_kelp(&mut kelp_registry, vector[GUARDIAN1, GUARDIAN2], &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    assert!(k.test_kelp_guardian_count() == 2);

    scenario.next_tx(OWNER);
    kelp::remove_guardian(&mut k, GUARDIAN1, scenario.ctx());
    assert!(k.test_kelp_guardian_count() == 1);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::EGuardianNotFound)]
fun test_remove_nonexistent_guardian() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);

    scenario.next_tx(OWNER);
    kelp::remove_guardian(&mut k, GUARDIAN1, scenario.ctx()); // Not a guardian

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ENotTheKelpOwner)]
fun test_add_guardian_non_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);

    // Stranger tries to add a guardian
    scenario.next_tx(STRANGER);
    kelp::add_guardian(&mut k, GUARDIAN1, scenario.ctx());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 8. Toggle Enable Tests
// ============================================================

#[test]
fun test_toggle_enable() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    assert!(k.test_kelp_enabled());

    scenario.next_tx(OWNER);
    kelp::toggle_enable(&mut k, scenario.ctx());
    assert!(!k.test_kelp_enabled());

    scenario.next_tx(OWNER);
    kelp::toggle_enable(&mut k, scenario.ctx());
    assert!(k.test_kelp_enabled());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ENotTheKelpOwner)]
fun test_toggle_enable_non_owner() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);

    scenario.next_tx(STRANGER);
    kelp::toggle_enable(&mut k, scenario.ctx());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 9. Stale Commit Cleanup Tests
// ============================================================

#[test]
fun test_remove_stale_commit() {
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let hash = compute_commit_hash(kelp_address, CLAIMANT, b"nonce");

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);
    assert!(kelp_registry.test_commits_count() == 1);
    assert!(kelp_registry.test_commit_fees_value() == COMMIT_FEE);

    // Advance past the reveal window
    clock::increment_for_testing(&mut clock, REVEAL_WINDOW + 1);

    // Anyone can clean up stale commits and get the fee as reward
    scenario.next_tx(STRANGER);
    let reward = kelp::remove_stale_commit(
        &mut kelp_registry,
        hash,
        &clock,
        scenario.ctx(),
    );
    assert!(coin::value(&reward) == COMMIT_FEE);
    assert!(kelp_registry.test_commits_count() == 0);
    assert!(kelp_registry.test_commit_fees_value() == 0);

    coin::burn_for_testing(reward);
    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test, expected_failure(abort_code = ::kelp::kelp::ERevealTooLate)]
fun test_remove_commit_not_yet_stale() {
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let hash = compute_commit_hash(kelp_address, CLAIMANT, b"nonce");

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Try to remove immediately — should fail (commit is still valid)
    scenario.next_tx(STRANGER);
    let reward = kelp::remove_stale_commit(
        &mut kelp_registry,
        hash,
        &clock,
        scenario.ctx(),
    );

    coin::burn_for_testing(reward);
    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

// ============================================================
// 10. Full End-to-End Flow Tests
// ============================================================

#[test]
fun test_full_recovery_flow_with_guardian() {
    // Complete flow: create → commit → guardian reveals → wait → claim
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_guarded_kelp(&mut kelp_registry, vector[GUARDIAN1], &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"recovery_nonce_123";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    // Step 1: Claimant commits
    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Step 2: Guardian reveals
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        GUARDIAN1,
        &mut scenario,
    );

    // Step 3: Wait for challenge window
    clock::increment_for_testing(&mut clock, CHALLENGE_WINDOW);

    // Step 4: Claimant claims
    scenario.next_tx(CLAIMANT);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    assert!(k.test_kelp_owner() == CLAIMANT);

    // Step 5: New owner collects fees
    scenario.next_tx(CLAIMANT);
    let fees = kelp::collect_fees(&mut k, scenario.ctx());
    assert!(coin::value(&fees) == 2 * COMMIT_FEE);

    coin::burn_for_testing(fees);
    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_owner_defends_with_challenge() {
    // Attacker commits → reveals → Owner challenges → Owner collects fees
    let mut scenario = test_scenario::begin(OWNER);
    let (clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"attacker_nonce";
    let hash = compute_commit_hash(kelp_address, STRANGER, nonce);

    // Attacker commits and reveals
    do_commit(&mut kelp_registry, hash, &clock, STRANGER, &mut scenario);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        STRANGER,
        nonce,
        COMMIT_FEE,
        &clock,
        STRANGER,
        &mut scenario,
    );

    // Owner detects and challenges
    scenario.next_tx(OWNER);
    kelp::challenge(&mut k, scenario.ctx());

    assert!(k.test_kelp_owner() == OWNER);
    assert!(!k.test_kelp_has_dominant_reveal());

    // Owner profits from the attacker's fees
    scenario.next_tx(OWNER);
    let fees = kelp::collect_fees(&mut k, scenario.ctx());
    assert!(coin::value(&fees) == 2 * COMMIT_FEE); // commit_fee + reveal_fee

    coin::burn_for_testing(fees);
    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_reveal_at_exact_window_boundary() {
    // Reveal at exactly commit_time + REVEAL_WINDOW should succeed (<=)
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);

    // Advance to exact boundary
    clock::increment_for_testing(&mut clock, REVEAL_WINDOW);

    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    assert!(k.test_kelp_has_dominant_reveal());

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}

#[test]
fun test_claim_at_exact_challenge_boundary() {
    // Claim at exactly reveal_time + challenge_window should succeed (>=)
    let mut scenario = test_scenario::begin(OWNER);
    let (mut clock, mut kelp_registry) = setup(&mut scenario);

    create_default_kelp(&mut kelp_registry, &mut scenario);

    scenario.next_tx(OWNER);
    let mut k = test_scenario::take_shared<Kelp>(&scenario);
    let kelp_address = k.test_kelp_address();
    let nonce = b"nonce";
    let hash = compute_commit_hash(kelp_address, CLAIMANT, nonce);

    do_commit(&mut kelp_registry, hash, &clock, CLAIMANT, &mut scenario);
    do_reveal(
        &mut kelp_registry,
        &mut k,
        CLAIMANT,
        nonce,
        COMMIT_FEE,
        &clock,
        CLAIMANT,
        &mut scenario,
    );

    // Advance to exact challenge window boundary
    clock::increment_for_testing(&mut clock, CHALLENGE_WINDOW);

    scenario.next_tx(CLAIMANT);
    kelp::claim(&mut kelp_registry, &mut k, &clock, scenario.ctx());

    assert!(k.test_kelp_owner() == CLAIMANT);

    k.test_destroy_kelp();
    teardown(scenario, clock, kelp_registry);
}
