// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Module: kelp
/// The KEy-Loss Protection (KELP) module provides a mechanism for Sui account owners
/// to recover their accounts in case of private key loss.  Recovery is facilitated
/// by a set of designated guardians and a challenge-response protocol.
module kelp::kelp;

use sui::balance::{Self, Balance};
use sui::bcs;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::dynamic_field as df;
use sui::event;
use sui::hash::blake2b256 as hash;
use sui::package;
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::transfer::Receiving;
use sui::vec_set::{Self, VecSet};

// === Errors ===
/// Mismatch between the expected and actual version of the Kelp object.
const EVersionMismatch: u64 = 0;
/// The specified address is already a registered guardian.
const EAlreadyAGuardian: u64 = 1;
/// Invalid challenge attempt. The challenger is not the original owner.
const EBadChallenge: u64 = 2;
/// KELP recovery is not enabled for the account.
const EKelpNotEnabled: u64 = 3;
/// Reveal attempt made too late. The reveal window has elapsed.
const ERevealTooLate: u64 = 4;
/// Claim attempt made too soon. The challenge window has not elapsed.
const EClaimTooSoon: u64 = 5;
/// A commit with the same hash already exists.
const ECommitAlreadyExists: u64 = 6;
/// No commit found for the given hash.
const ECommitNotFound: u64 = 7;
/// Invalid commit hash length. The hash should be 32 bytes.
const EInvalidCommitHashLength: u64 = 8;
/// Claim attempt made by an address other than the dominant claimant.
const EWrongClaimant: u64 = 9;
/// Insufficient commit fee provided.
const ECommitFeeNotEnough: u64 = 10;
/// Sender is not a registered guardian.
const ENotGuardian: u64 = 11;
/// Sender is not the owner of the KELP resource.
const ENotTheKelpOwner: u64 = 12;
/// Account balance for the specified type does not exist.
const EAccountBalanceDoesNotExist: u64 = 13;
/// Sender is not a registered guardian (used in remove_guardian).
const EGuardianNotFound: u64 = 14;
/// Insufficient balance for withdrawal.
const EInsufficientBalance: u64 = 15;
/// Reveal fee is below the required minimum.
const ERevealFeeNotEnough: u64 = 16;

// === Constants ===
/// Current version of the Kelp module.
const VERSION: u8 = 0;
/// Minimum commit fee required (1 SUI).
const COMMIT_FEE: u64 = 1_000_000_000;
/// Duration of the reveal window in milliseconds (2 minutes).
const REVEAL_WINDOW: u64 = 120_000;
/// Expected length of the commit hash (32 bytes).
const COMMIT_HASH_LENGTH: u64 = 32;

// === Structs ===

/// Type key for dynamic fields representing account balances of specific coin types.
public struct AccountBalance<phantom T> has copy, drop, store {}

/// Key for the Kelp module itself.  Not currently used but good practice.
public struct KELP has drop {}

/// Registry of Kelp objects, mapping owner addresses to their Kelp object IDs.
public struct KelpRegistry has key {
    id: UID,
    version: u8,
    registry: Table<address, VecSet<ID>>,
    commits: Table<vector<u8>, Commit>,
    commit_fees: Balance<SUI>,
}

/// Represents a KELP recovery setup for an account. Stored as a shared object.
public struct Kelp has key {
    id: UID,
    version: u8,
    owner: address,
    reveal_fee_amount: u64,
    fees: Balance<SUI>,
    challenge_window: u64,
    enabled: bool,
    dominant_reveal: Option<DominantReveal>,
    guardians: VecSet<address>,
}

/// Represents a commit to initiate recovery.
public struct Commit has store {
    commit_hash: vector<u8>,
    commit_fee: u64,
    commit_time: u64,
}

/// Represents the currently dominant reveal, if any.
public struct DominantReveal has store {
    commit_time: u64,
    reveal_time: u64,
    claimant: address,
}

/// A Hot Potato struct that is used to ensure the borrowed value is returned.
public struct Promise {
    /// The ID of the borrowed object. Ensures that there wasn't a value swap.
    id: ID,
    /// The ID of the kelp. Ensures that the borrowed value is returned to
    /// the correct kelp.
    kelp_id: ID,
}

// === Events ===

/// Emitted when a new Kelp object is created.
public struct KelpCreated has copy, drop {
    kelp_id: ID,
    owner: address,
    challenge_window: u64,
    guardian_count: u64,
}

/// Emitted when a commit is submitted.
public struct CommitSubmitted has copy, drop {
    commit_hash: vector<u8>,
    commit_time: u64,
}

/// Emitted when a reveal is successfully processed.
public struct RevealProcessed has copy, drop {
    kelp_id: ID,
    claimant: address,
    commit_time: u64,
    reveal_time: u64,
    is_new_dominant: bool,
}

/// Emitted when a claim succeeds.
public struct ClaimCompleted has copy, drop {
    kelp_id: ID,
    original_owner: address,
    new_owner: address,
}

/// Emitted when the owner challenges a claim.
public struct ChallengeMade has copy, drop {
    kelp_id: ID,
    owner: address,
    challenged_claimant: address,
}

/// Emitted when a stale commit is cleaned up.
public struct StaleCommitRemoved has copy, drop {
    commit_hash: vector<u8>,
    commit_time: u64,
}

// === Functions ===

/// Initializes the Kelp module and publishes the `KelpRegistry` object.
fun init(otw: KELP, ctx: &mut TxContext) {
    package::claim_and_keep(otw, ctx);

    transfer::share_object(KelpRegistry {
        id: object::new(ctx),
        version: VERSION,
        registry: table::new(ctx),
        commits: table::new<vector<u8>, Commit>(ctx),
        commit_fees: balance::zero(),
    });
}

/// Creates and publishes a new `Kelp` object for the calling account.
public fun create_kelp(
    kelp_registry: &mut KelpRegistry,
    reveal_fee_amount: u64,
    challenge_window: u64,
    enabled: bool,
    guardians: VecSet<address>,
    ctx: &mut TxContext,
) {
    let id = object::new(ctx);
    let kelp_id = id.uid_to_inner();

    if (kelp_registry.registry.contains(ctx.sender())) {
        kelp_registry.registry.borrow_mut(ctx.sender()).insert(kelp_id);
    } else {
        kelp_registry.registry.add(ctx.sender(), vec_set::singleton(kelp_id));
    };

    let guardian_count = guardians.length();

    transfer::share_object(Kelp {
        id,
        version: VERSION,
        owner: ctx.sender(),
        reveal_fee_amount,
        fees: balance::zero(),
        challenge_window,
        enabled,
        guardians,
        dominant_reveal: option::none(),
    });

    event::emit(KelpCreated {
        kelp_id,
        owner: ctx.sender(),
        challenge_window,
        guardian_count,
    });
}

/// Commits to a future claim on a KELP account.
public fun commit(
    kelp_registry: &mut KelpRegistry,
    commit_hash: vector<u8>,
    commit_fee: Coin<SUI>,
    clock: &Clock,
) {
    assert!(is_kelp_registry_version_valid(kelp_registry), EVersionMismatch);
    assert!(commit_hash.length() == COMMIT_HASH_LENGTH, EInvalidCommitHashLength);
    assert!(commit_fee.value() == COMMIT_FEE, ECommitFeeNotEnough);
    assert!(!kelp_registry.commits.contains(commit_hash), ECommitAlreadyExists);

    let commit_time = clock.timestamp_ms();

    kelp_registry
        .commits
        .add(
            commit_hash,
            Commit {
                commit_hash,
                commit_fee: COMMIT_FEE,
                commit_time,
            },
        );

    kelp_registry.commit_fees.join(commit_fee.into_balance());

    event::emit(CommitSubmitted { commit_hash, commit_time });
}

/// Reveals the recovery data, the second step in the recovery process.
public fun reveal(
    kelp_registry: &mut KelpRegistry,
    kelp: &mut Kelp,
    claimant: address,
    nonce: vector<u8>,
    reveal_fee: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(is_kelp_registry_version_valid(kelp_registry), EVersionMismatch);
    assert!(kelp.enabled, EKelpNotEnabled);
    assert!(reveal_fee.value() >= kelp.reveal_fee_amount, ERevealFeeNotEnough);
    if (!kelp.guardians.is_empty()) assert!(kelp.guardians.contains(&ctx.sender()), ENotGuardian);

    let kelp_address: address = object::id_address(kelp);

    let mut data = bcs::to_bytes(&kelp_address);
    data.append(bcs::to_bytes(&claimant));
    data.append(bcs::to_bytes(&nonce));

    let expected_hash = hash(&data);
    assert!(kelp_registry.commits.contains(expected_hash), ECommitNotFound);

    let commit = kelp_registry.commits.remove(expected_hash);
    let reveal_time = clock.timestamp_ms();

    let Commit { commit_hash: _, commit_fee, commit_time } = commit;
    let c_fee = coin::take(&mut kelp_registry.commit_fees, commit_fee, ctx);

    coin::put(&mut kelp.fees, c_fee);
    coin::put(&mut kelp.fees, reveal_fee);

    assert!(reveal_time - commit_time <= REVEAL_WINDOW, ERevealTooLate);

    let mut is_new_dominant = false;
    if (kelp.dominant_reveal.is_some()) {
        let dominant_reveal = option::borrow(&kelp.dominant_reveal);
        if (commit_time < dominant_reveal.commit_time) {
            let old_value = option::swap(
                &mut kelp.dominant_reveal,
                DominantReveal { commit_time, reveal_time, claimant },
            );
            let DominantReveal {
                commit_time: _,
                reveal_time: _,
                claimant: _,
            } = old_value;
            is_new_dominant = true;
        }
    } else {
        option::fill(
            &mut kelp.dominant_reveal,
            DominantReveal { commit_time, reveal_time, claimant },
        );
        is_new_dominant = true;
    };

    event::emit(RevealProcessed {
        kelp_id: object::id(kelp),
        claimant,
        commit_time,
        reveal_time,
        is_new_dominant,
    });
}

/// Claims a KELP account after the challenge window has elapsed.
public fun claim(
    kelp_registry: &mut KelpRegistry,
    kelp: &mut Kelp,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    let current_timestamp = clock.timestamp_ms();

    let dominant_reveal = option::extract(&mut kelp.dominant_reveal); // Extract the dominant reveal
    assert!(dominant_reveal.claimant == ctx.sender(), EWrongClaimant);
    assert!(
        current_timestamp - dominant_reveal.reveal_time >= kelp.challenge_window,
        EClaimTooSoon,
    );

    let original_owner = kelp.owner;
    kelp.owner = dominant_reveal.claimant;

    // Update registry (remove old owner, add new owner)
    if (kelp_registry.registry.contains(original_owner)) {
        kelp_registry.registry.borrow_mut(original_owner).remove(&kelp.id.uid_to_inner());
        // Clean up the registry if the owner has no more KELP objects
        if (kelp_registry.registry.borrow(original_owner).is_empty()) {
            kelp_registry.registry.remove(original_owner);
        };
    };
    if (kelp_registry.registry.contains(kelp.owner)) {
        kelp_registry.registry.borrow_mut(kelp.owner).insert(kelp.id.uid_to_inner());
    } else {
        kelp_registry.registry.add(kelp.owner, vec_set::singleton(kelp.id.uid_to_inner()));
    };

    let kelp_id = object::id(kelp);

    // Drop the extracted DominantReveal value
    let DominantReveal { commit_time: _, reveal_time: _, claimant: _ } = dominant_reveal;

    event::emit(ClaimCompleted {
        kelp_id,
        original_owner,
        new_owner: kelp.owner,
    });
}

/// Challenges a claim within the challenge window.
public fun challenge(kelp: &mut Kelp, ctx: &mut TxContext) {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), EBadChallenge);
    // Clear the dominant reveal
    let extracted_dominant_reveal = option::extract(&mut kelp.dominant_reveal);
    let DominantReveal {
        commit_time: _,
        reveal_time: _,
        claimant,
    } = extracted_dominant_reveal;

    event::emit(ChallengeMade {
        kelp_id: object::id(kelp),
        owner: kelp.owner,
        challenged_claimant: claimant,
    });
}

/// Collects accumulated fees from the `Kelp` object.
public fun collect_fees(kelp: &mut Kelp, ctx: &mut TxContext): Coin<SUI> {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    let amount = kelp.fees.value();
    coin::take(&mut kelp.fees, amount, ctx)
}

/// Removes a stale commit whose reveal window has expired.
/// The commit fee is returned to the caller as a reward for cleaning up.
public fun remove_stale_commit(
    kelp_registry: &mut KelpRegistry,
    commit_hash: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<SUI> {
    assert!(is_kelp_registry_version_valid(kelp_registry), EVersionMismatch);
    assert!(kelp_registry.commits.contains(commit_hash), ECommitNotFound);

    let commit = kelp_registry.commits.borrow(commit_hash);
    let current_time = clock.timestamp_ms();
    // Commit is stale if the reveal window has passed
    assert!(current_time - commit.commit_time > REVEAL_WINDOW, ERevealTooLate);

    let removed = kelp_registry.commits.remove(commit_hash);
    let Commit { commit_hash, commit_fee, commit_time } = removed;

    event::emit(StaleCommitRemoved { commit_hash, commit_time });

    coin::take(&mut kelp_registry.commit_fees, commit_fee, ctx)
}

// // === Helper Functions ===

/// Bumps the `Kelp` object version if necessary.
public fun bump_kelp_version(kelp: &mut Kelp) {
    if (VERSION > kelp.version) {
        kelp.version = VERSION;
    }
}

/// Bumps the `KelpRegistry` version if necessary.
public fun bump_kelp_registry_version(kelp_registry: &mut KelpRegistry) {
    if (VERSION > kelp_registry.version) {
        kelp_registry.version = VERSION;
    }
}

/// Checks if the `Kelp` object version is valid.
public fun is_kelp_version_valid(kelp: &Kelp): bool {
    kelp.version == VERSION
}

/// Checks if the `KelpRegistry` version is valid.
public fun is_kelp_registry_version_valid(kelp_registry: &KelpRegistry): bool {
    kelp_registry.version == VERSION
}

/// Adds a guardian to the `Kelp` object.
public fun add_guardian(kelp: &mut Kelp, guardian: address, ctx: &mut TxContext) {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    assert!(!kelp.guardians.contains(&guardian), EAlreadyAGuardian);
    kelp.guardians.insert(guardian);
}

/// Removes a guardian from the `Kelp` object.
public fun remove_guardian(kelp: &mut Kelp, guardian: address, ctx: &mut TxContext) {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    assert!(kelp.guardians.contains(&guardian), EGuardianNotFound);
    kelp.guardians.remove(&guardian);
}

/// Toggles the KELP recovery feature on or off.
public fun toggle_enable(kelp: &mut Kelp, ctx: &mut TxContext) {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    kelp.enabled = !kelp.enabled;
}

/// Accepts a payment and adds it to the `Kelp` object's balance.
public fun accept_payment<T>(kelp: &mut Kelp, sent: Receiving<Coin<T>>) {
    let coin = transfer::public_receive(&mut kelp.id, sent);
    deposit(kelp, coin);
}

/// Deposits a coin directly into the `Kelp` object's balance.
/// Unlike `accept_payment`, this takes a `Coin<T>` directly, enabling
/// single-PTB flows such as unstake → deposit.
public fun deposit<T>(kelp: &mut Kelp, coin: Coin<T>) {
    let account_balance_type = AccountBalance<T> {};

    if (df::exists_(&kelp.id, account_balance_type)) {
        let balance: &mut Balance<T> = df::borrow_mut(&mut kelp.id, account_balance_type);
        balance.join(coin.into_balance());
    } else {
        df::add(&mut kelp.id, account_balance_type, coin.into_balance());
    }
}

/// Withdraws a specified amount of coins from the `Kelp` object.
public fun withdraw<T>(kelp: &mut Kelp, amount: u64, ctx: &mut TxContext): Coin<T> {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    let account_balance_type = AccountBalance<T> {};
    assert!(df::exists_(&kelp.id, account_balance_type), EAccountBalanceDoesNotExist);
    let balance: &mut Balance<T> = df::borrow_mut(&mut kelp.id, account_balance_type);
    assert!(balance.value() >= amount, EInsufficientBalance);
    coin::take(balance, amount, ctx)
}

// /// Withdraws coins after accepting incoming payments.
// public fun withdraw_and_accept<T>(kelp: &mut Kelp, amount: u64, mut sents: vector<Receiving<Coin<T>>>, ctx: &mut TxContext): Coin<T> {
//     while (!sents.is_empty()) {
//         accept_payment<T>(kelp, sents.pop_back());
//     };

//     withdraw<T>(kelp, amount, ctx)
// }

/// Withdraws all coins of a specific type from the `Kelp` object.
/// Returns a zero-value coin if no balance exists for the given type.
public fun withdraw_all<T>(kelp: &mut Kelp, ctx: &mut TxContext): Coin<T> {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    let account_balance_type = AccountBalance<T> {};
    if (df::exists_(&kelp.id, account_balance_type)) {
        let balance: Balance<T> = df::remove(&mut kelp.id, account_balance_type);
        coin::from_balance(balance, ctx)
    } else {
        coin::zero<T>(ctx)
    }
}

/// Accepts and stores an arbitrary object in the `Kelp` object.
public fun accept_object<T: key + store>(kelp: &mut Kelp, receiving_object: Receiving<T>) {
    let obj = transfer::public_receive(&mut kelp.id, receiving_object);
    let object_id = object::id(&obj);
    df::add(&mut kelp.id, object_id, obj);
}

/// Retrieves and removes a stored object from the `Kelp` object.
public fun get_object<T: key + store>(kelp: &mut Kelp, id: ID, ctx: &mut TxContext): T {
    assert!(is_kelp_version_valid(kelp), EVersionMismatch);
    assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
    df::remove(&mut kelp.id, id)
}

/// A module that allows borrowing the value from the kelp.
public fun borrow_val<T: key + store>(kelp: &mut Kelp, id: ID, ctx: &mut TxContext): (T, Promise) {
    let value = get_object<T>(kelp, id, ctx);
    let id = object::id(&value);
    (value, Promise { id, kelp_id: object::id(kelp) })
}

/// Put the taken item back into the container.
public fun return_val<T: key + store>(kelp: &mut Kelp, value: T, promise: Promise) {
    let value_id = object::id(&value);
    let Promise { id, kelp_id } = promise;
    assert!(object::id(kelp) == kelp_id);
    assert!(value_id == id);

    df::add(&mut kelp.id, value_id, value);
}

// === Test Functions ===

#[test_only]
public fun test_create_kelp_registry(ctx: &mut TxContext): KelpRegistry {
    KelpRegistry {
        id: object::new(ctx),
        version: VERSION,
        registry: table::new(ctx),
        commits: table::new(ctx),
        commit_fees: balance::zero(),
    }
}

#[test_only]
public fun test_registry_length(registry: &KelpRegistry): u64 {
    registry.registry.length()
}

#[test_only]
public fun test_registry_contains_kelp_address_owner(
    kelp_registry: &KelpRegistry,
    owner: address,
    kelp: &Kelp,
): bool {
    if (kelp_registry.registry.contains(owner)) {
        kelp_registry.registry.borrow(owner).contains(&kelp.id.uid_to_inner())
    } else {
        false
    }
}

#[test_only]
public fun test_destroy_kelp(kelp: Kelp) {
    let Kelp {
        id,
        version: _,
        owner: _,
        reveal_fee_amount: _,
        fees,
        challenge_window: _,
        enabled: _,
        mut dominant_reveal,
        guardians: _,
    } = kelp;
    fees.destroy_for_testing();

    if (dominant_reveal.is_some()) {
        // TODO: option set to none
        let extracted_dominant_reveal = option::extract(&mut dominant_reveal);
        let DominantReveal {
            commit_time: _,
            reveal_time: _,
            claimant: _,
        } = extracted_dominant_reveal;
    };
    dominant_reveal.destroy_none<DominantReveal>();

    id.delete();
}

#[test_only]
public fun test_kelp_address(kelp: &Kelp): address {
    kelp.id.uid_to_address()
}

#[test_only]
public fun test_kelp_owner(kelp: &Kelp): address {
    kelp.owner
}

#[test_only]
public fun test_kelp_enabled(kelp: &Kelp): bool {
    kelp.enabled
}

#[test_only]
public fun test_kelp_has_dominant_reveal(kelp: &Kelp): bool {
    kelp.dominant_reveal.is_some()
}

#[test_only]
public fun test_kelp_fees_value(kelp: &Kelp): u64 {
    kelp.fees.value()
}

#[test_only]
public fun test_kelp_guardian_count(kelp: &Kelp): u64 {
    kelp.guardians.length()
}

#[test_only]
public fun test_commits_count(kelp_registry: &KelpRegistry): u64 {
    kelp_registry.commits.length()
}

#[test_only]
public fun test_commit_fees_value(kelp_registry: &KelpRegistry): u64 {
    kelp_registry.commit_fees.value()
}
