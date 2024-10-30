// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Module: kelp
/// KEy-Loss Protection (KELP) is a mechanism that allows an account owner to recover their account if they lose their private key.
#[allow(unused_const)]
module kelp::kelp {
    // === Imports ===
    use sui::{
        bcs,
        balance::{Self, Balance},
        clock::Clock,
        coin::{Self, Coin},
        dynamic_field as df,
        hash::blake2b256 as hash,
        package,
        sui::SUI,
        table::{Self, Table},
        transfer::Receiving,
        vec_set::{Self, VecSet},
    };

    // === Errors ===
    /// Mismatch between the expected and actual version of the Kelp object.
    const EVersionMismatch: u64 = 0;
    /// The guardian already exists.
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
    /// No commit found for the sender.
    const ECommitNotFound: u64 = 7; // Added this error
    /// Invalid commit hash length.
    const EInvalidCommitHashLength: u64 = 8;
    /// Claim attempt made by an address other than the dominant claimant.
    const EWrongClaimant: u64 = 9;
    /// Insufficient commit fee provided.
    const ECommitFeeNotEnough: u64 = 10;
    /// Sender is not a registered guardian.
    const ENotGuardian: u64 = 11;
    /// Sender is not the owner of the KELP resource.
    const ENotTheKelpOwner: u64 = 12;
    /// Account balance does not exist.
    const EAccountBalanceDoesNotExist: u64 = 14;

    // === Constants ===
    /// Current version of the Kelp module.
    const VERSION: u8 = 0;
    /// Minimum commit fee required. (1 SUI)
    const COMMIT_FEE: u64 = 1_000_000_000;
    /// Duration of the reveal window in milliseconds (2 minutes - 120_000).
    const REVEAL_WINDOW: u64 = 120_000; //3_600_000;
    /// Expected length of the commit hash.
    const COMMIT_HASH_LENGTH: u64 = 32;

    // === Type Keys ===
    /// Dynamic field key representing a balance of a particular coin type.
    public struct AccountBalance<phantom T> has copy, drop, store { }

    public struct ReceivingObjectKey<phantom T> has copy, drop, store { }

    public struct KELP has drop {}

    /// A registry of KELPs with a UID and a set of hashed network addresses.
    public struct KelpRegistry has key {
        id: UID,
        version: u8,
        registry: Table<address, VecSet<ID>>,
        commits: Table<vector<u8>, Commit>,
        commit_fees: Balance<SUI>,
    }

    /// Represents a KELP recovery setup for an account.  Stored as a shared object.
    /// It is a shared object because we need to allow reveal and claim updates from external accounts.
    public struct Kelp has key {
        id: UID,
        /// Version of the Kelp object.
        version: u8,
        /// KELP owner.
        owner: address,
        /// Fee required for submitting a reveal.
        reveal_fee_amount: u64,
        /// Accumulated fees from commits and reveals.
        fees: Balance<SUI>,
        /// Duration of the challenge window in milliseconds.
        challenge_window: u64,
        /// Whether KELP recovery is enabled for the account.
        enabled: bool,
        /// Optional Dominant Reveal.
        dominant_reveal: Option<DominantReveal>,
        /// Set of guardian addresses.
        guardians: VecSet<address>,
    }

    /// Represents a commit to initiate recovery.  Stored under the sender's address.
    public struct Commit has store {
        /// Hash of the commit data h(address_c, address_r, nonce).
        commit_hash: vector<u8>,
        /// Locked fee submitted with the commit.
        commit_fee: u64,
        /// Timestamp of the commit in milliseconds.
        commit_time: u64,
    }

    /// Represents the currently dominant reveal.  Stored in the Kelp object.
    public struct DominantReveal has store {
        /// Timestamp of the associated commit in milliseconds.
        commit_time: u64,
        /// Timestamp of the reveal in milliseconds.
        reveal_time: u64,
        /// Address of the claimant.
        claimant: address,
    }

    /// Initializes the Kelp module.
    /// This function publishes the `KelpRegistry` object, which tracks all Kelp objects.
    fun init(otw: KELP, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx);

        transfer::share_object(
            KelpRegistry {
                id: object::new(ctx),
                version: VERSION,
                registry: table::new(ctx),
                commits: table::new<vector<u8>, Commit>(ctx),
                commit_fees: balance::zero(),
            }
        );
    }

    /// Creates and publishes a new Kelp object.
    /// This enables KELP recovery for the calling account.
    ///
    /// Arguments:
    /// * `kelp_registry`: Mutable reference to the KelpRegistry object.
    /// * `reveal_fee_amount`: Amount of SUI required for a reveal.
    /// * `challenge_window`: Duration of the challenge window in milliseconds.
    /// * `enabled`: Whether KELP recovery is initially enabled.
    /// * `guardians`: Vector of guardian addresses.
    /// * `ctx`: Transaction context.
    public fun create_kelp(
        kelp_registry: &mut KelpRegistry,
        reveal_fee_amount: u64,
        challenge_window: u64,
        enabled: bool,
        guardians: VecSet<address>,
        ctx: &mut TxContext
    ) {
        let id = object::new(ctx);

        if (kelp_registry.registry.contains(ctx.sender())) {
            let v_set = kelp_registry.registry.borrow_mut(ctx.sender());
            v_set.insert(id.uid_to_inner());
        } else {
            kelp_registry.registry.add(ctx.sender(), vec_set::singleton(id.uid_to_inner()));
        };

        // Make `Kelp` a shared object. 
        transfer::share_object(
            Kelp {
                id,
                version: VERSION,
                owner: ctx.sender(),
                reveal_fee_amount,
                fees: balance::zero(),
                challenge_window,
                enabled,
                guardians,
                dominant_reveal: option::none(),
            }
        );
    }

    /// Commits to a future claim on a KELP account.  This is the first step in the recovery process.
    ///
    /// Arguments:
    /// * `kelp_registry`: Mutable reference to the KelpRegistry object.
    /// * `commit_hash`: Hash of the commit data (address_c, address_r, nonce).
    /// * `commit_fee`: Coin containing the commit fee.
    /// * `clock`: Reference to the clock object.
    public fun commit(
        kelp_registry: &mut KelpRegistry,
        commit_hash: vector<u8>,
        commit_fee: Coin<SUI>,
        clock: &Clock
    ) {
        assert!(is_kelp_registry_version_valid(kelp_registry), EVersionMismatch);
        // assert!(commit_hash.length() == COMMIT_HASH_LENGTH, EInvalidCommitHashLength);
        assert!(coin::value(&commit_fee) == COMMIT_FEE, ECommitFeeNotEnough);

        // Check if a commit already exists for this hash. Replaced addressc with hash.
        assert!(!kelp_registry.commits.contains(commit_hash), ECommitAlreadyExists);

        kelp_registry.commits.add<vector<u8>, Commit>(
            commit_hash,
            Commit {
                commit_hash,
                commit_fee: COMMIT_FEE,
                commit_time: clock.timestamp_ms()
            }
        );
        
        kelp_registry.commit_fees.join(commit_fee.into_balance());
    }

    /// Reveals the recovery data and completes the second step of the recovery process.
    ///
    /// Arguments:
    /// * `kelp_registry`: Mutable reference to the KelpRegistry object.
    /// * `kelp`: Mutable reference to the Kelp object.
    /// * `claimant`: The recovery address.
    /// * `nonce`: The nonce used in the commit.
    /// * `reveal_fee`: Coin containing the reveal fee.
    /// * `clock`: Reference to the clock object.
    /// * `ctx`: Transaction context.
    public fun reveal(
        kelp_registry: &mut KelpRegistry,
        kelp: &mut Kelp,
        claimant: address,
        nonce: vector<u8>,
        reveal_fee: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // assert REVEAL_WINDOW has elapsed
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(is_kelp_registry_version_valid(kelp_registry), EVersionMismatch);
        assert!(kelp.enabled, EKelpNotEnabled);
        if (kelp.guardians.size() > 0) assert!(kelp.guardians.contains(&ctx.sender()), ENotGuardian);
        let address_c: address = object::id_address(kelp);

        let mut data = bcs::to_bytes(&address_c);
        data.append(bcs::to_bytes(&claimant));
        data.append(bcs::to_bytes(&nonce));

        let expected_hash = hash(&data);

        assert!(kelp_registry.commits.contains(expected_hash), ECommitNotFound);

        // // Check the sender's commit hash matches the expected hash
        // let commit = kelp_registry.commits.remove(expected_hash);
        let commit = kelp_registry.commits.remove(expected_hash);
        let reveal_time = clock.timestamp_ms();
        // assert!(reveal_time - commit.commit_time <= REVEAL_WINDOW, ERevealTooLate);

        let Commit{
            commit_hash: _,
            commit_fee: commit_fee,
            commit_time: commit_time
        } = commit;
        let c_fee = coin::take(&mut kelp_registry.commit_fees, commit_fee, ctx);

        // // sweep the commit and reveal fees into the KELP resource
        coin::put(&mut kelp.fees, c_fee);
        coin::put(&mut kelp.fees, reveal_fee);

        if (reveal_time - commit_time <= REVEAL_WINDOW) {
            // TODO: is there a better way?
            if (kelp.dominant_reveal.is_none()) {
                option::fill(&mut kelp.dominant_reveal, DominantReveal {
                    commit_time,
                    reveal_time: reveal_time,
                    claimant
                });
            } else {
                let dominant_reveal = option::borrow(&kelp.dominant_reveal);
                if (commit_time < dominant_reveal.commit_time) {
                    let old_value = option::swap(&mut kelp.dominant_reveal, DominantReveal {
                        commit_time,
                        reveal_time: reveal_time,
                        claimant
                    });
                    let DominantReveal{
                        commit_time: _,
                        reveal_time: _,
                        claimant: _
                    } = old_value;
                };
            };
        };
    }

    public fun claim(
        kelp_registry: &mut KelpRegistry,
        kelp: &mut Kelp,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        let current_timestamp = clock.timestamp_ms();

        let extracted_dominant_reveal = option::extract(&mut kelp.dominant_reveal);

        assert!(extracted_dominant_reveal.claimant == ctx.sender(), EWrongClaimant);
        assert!(current_timestamp - extracted_dominant_reveal.reveal_time >= kelp.challenge_window, EClaimTooSoon);

        // Store the original owner BEFORE updating kelp.owner
        let original_owner = kelp.owner;

        kelp.owner = extracted_dominant_reveal.claimant;

        if (kelp_registry.registry.contains(original_owner)) {
            let v_set = kelp_registry.registry.borrow_mut(original_owner);
            if (v_set.contains(&kelp.id.uid_to_inner())) {
                v_set.remove(&kelp.id.uid_to_inner());
            };
        };

        if (kelp_registry.registry.contains(kelp.owner)) {
            let v_set = kelp_registry.registry.borrow_mut(kelp.owner);
            v_set.insert(kelp.id.uid_to_inner());
        } else {
            kelp_registry.registry.add(kelp.owner, vec_set::singleton(kelp.id.uid_to_inner()));
        };

        // TODO: option set to none
        let DominantReveal{
            commit_time: _,
            reveal_time: _,
            claimant: _,
        } = extracted_dominant_reveal;
        
    }

    /// Challenges a claim within the challenge window.
    ///
    /// Arguments:
    /// * `kelp`: Mutable reference to the Kelp object.
    /// * `ctx`: Transaction context.
    ///
    /// Returns: The accumulated fees (returned to the challenger).
    public fun challenge(
        kelp: &mut Kelp,
        ctx: &mut TxContext
    ) {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        let address_c = kelp.owner;
        assert!(address_c == ctx.sender(), EBadChallenge);
        // Clear the Reveal object, effectively cancelling the Dominant Reveal.
        // TODO: option set to none
        let extracted_dominant_reveal = option::extract(&mut kelp.dominant_reveal);
        let DominantReveal{
            commit_time: _,
            reveal_time: _,
            claimant: _,
        } = extracted_dominant_reveal;
    }
    
    /// Collect all commit/reveal fees in the KELP resource under ‘account‘. This can be called
    /// by the owner of the KELP resource at any time.
    /// Note: a transaction that calls ‘collect_fees‘ will also (implicitly) issue a challenge by incrementing ‘account_c‘s sequence number.
    public fun collect_fees(
        kelp: &mut Kelp,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
        let amount = balance::value(&kelp.fees);
        coin::take(&mut kelp.fees, amount, ctx)
    }

    // === Helper Functions ===

    /// Updates the version of the registry if the current version is lower than `VERSION`.
    /// This function is permissionless and can be called by anyone.
    public fun bump_kelp_version(
        kelp: &mut Kelp,
    ) {
        if (VERSION > kelp.version) kelp.version = VERSION
    }

    /// Updates the version of the registry if the current version is lower than `VERSION`.
    public fun bump_kelp_registry_version(
        kelp_registry: &mut KelpRegistry,
    ) {
        if (VERSION > kelp_registry.version) kelp_registry.version = VERSION
    }

    /// Checks whether the registry's version matches the package version.
    public fun is_kelp_version_valid(
        kelp: &Kelp,
    ): bool {
        kelp.version == VERSION
    }

    /// Checks whether the registry's version matches the package version.
    public fun is_kelp_registry_version_valid(
        kelp_registry: &KelpRegistry,
    ): bool {
        kelp_registry.version == VERSION
    }

    /// Adds a guardian to the KELP resource.
    public fun add_guardian(
        kelp: &mut Kelp,
        guardian: address,
        ctx: &mut TxContext
    ) {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
        assert!(!kelp.guardians.contains(&guardian), EAlreadyAGuardian);
        kelp.guardians.insert(guardian);
    }

    /// Removes a guardian from the KELP resource.
    public fun remove_guardian(
        kelp: &mut Kelp,
        guardian: address,
        ctx: &mut TxContext
    ) {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
        assert!(kelp.guardians.contains(&guardian), EAlreadyAGuardian);
        kelp.guardians.remove(&guardian);
    }

    /// Toggles the KELP recovery feature on or off.
    public fun tongle_enable(
        kelp: &mut Kelp,
        ctx: &mut TxContext,
    ) {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
        kelp.enabled = !kelp.enabled;
    }

    /// This function will receive a coin sent to the `Kelp` object and then
    /// join it to the balance for each coin type.
    /// Dynamic fields are used to index the balances by their coin type.
    public fun accept_payment<T>(
        kelp: &mut Kelp, 
        sent: Receiving<Coin<T>>
    ) {
        // Receive the coin that was sent to the `kelp` object
        // Since `Coin` is not defined in this module, and since it has the `store`
        // ability we receive the coin object using the `transfer::public_receive` function.
        let coin = transfer::public_receive(&mut kelp.id, sent);
        let account_balance_type = AccountBalance<T>{};
        let kelp_uid = &mut kelp.id;

        // Check if a balance of that coin type already exists.
        // If it does then merge the coin we just received into it,
        // otherwise create new balance.
        if (df::exists_(kelp_uid, account_balance_type)) {
            let balance: &mut Coin<T> = df::borrow_mut(kelp_uid, account_balance_type);
            coin::join(balance, coin);
        } else {
            df::add(kelp_uid, account_balance_type, coin);
        }
    }

    /// Withdraw `amount` of coins of type `T` from `kelp`.
    public fun withdraw<T>(
        kelp: &mut Kelp,
        amount: u64, 
        ctx: &mut TxContext
    ): Coin<T> {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);

        let account_balance_type = AccountBalance<T>{};
        // Make sure what we are withdrawing exists
        assert!(df::exists_(&kelp.id, account_balance_type), EAccountBalanceDoesNotExist);
        let balance: &mut Coin<T> = df::borrow_mut(&mut kelp.id, account_balance_type);
        assert!(balance.value() >= amount, 0);
        coin::split(balance, amount, ctx)
    }

    public fun withdraw_and_accept<T>(
        kelp: &mut Kelp,
        amount: u64, 
        mut sents: vector<Receiving<Coin<T>>>,
        ctx: &mut TxContext
    ): Coin<T> {
        while (!sents.is_empty()) accept_payment<T>(kelp, sents.pop_back());
        withdraw<T>(kelp, amount, ctx)
    }

    public fun withdraw_all<T>(
        kelp: &mut Kelp,
        ctx: &mut TxContext
    ): Coin<T> {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);

        let account_balance_type = AccountBalance<T>{};
        // Make sure what we are withdrawing exists
        assert!(df::exists_(&kelp.id, account_balance_type), EAccountBalanceDoesNotExist);
        df::remove(&mut kelp.id, account_balance_type)
    }

    public fun accept_object<T: key + store>(
        kelp: &mut Kelp,
        receiving_object: Receiving<T>
    ) {
        let obj = transfer::public_receive(&mut kelp.id, receiving_object);
        let object_id: ID = object::id(&obj);
        df::add(&mut kelp.id, object_id, obj);
    }

    public fun get_object<T: key + store>(
        kelp: &mut Kelp,
        id: ID,
        ctx: &mut TxContext
    ): T {
        assert!(is_kelp_version_valid(kelp), EVersionMismatch);
        assert!(kelp.owner == ctx.sender(), ENotTheKelpOwner);
        df::remove(&mut kelp.id, id)
    }

    // === Test ===

    #[test_only]
    public fun test_create_kelp_registry(ctx: &mut TxContext): KelpRegistry {
            KelpRegistry {
                id: object::new(ctx),
                version: VERSION,
                registry: table::new(ctx),
                commits: table::new<vector<u8>, Commit>(ctx),
                commit_fees: balance::zero(),
            }
    }

    /// Returns the registry `Table` of a KelpRegistry object.
    ///
    /// This function is marked as `test_only` and can only be called within tests.
    #[test_only]
    public fun test_registry_length(registry: &mut KelpRegistry): u64 {
        registry.registry.length()
    }

    #[test_only]
    public fun test_registry_contains_kelp_address_owner(
        kelp_registry: &KelpRegistry,
        owner: address,
        kelp: &Kelp
    ): bool {
        if (kelp_registry.registry.contains(owner)) {
            let v_set = kelp_registry.registry.borrow(owner);
            return v_set.contains(&kelp.id.uid_to_inner())
        };
        return false
    }

    #[test_only]
    public fun test_destroy_kelp(
        kelp: Kelp
    ) {
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
            let DominantReveal{
                commit_time: _,
                reveal_time: _,
                claimant: _,
            } = extracted_dominant_reveal;
        };
        dominant_reveal.destroy_none<DominantReveal>();

        id.delete();
    }

    #[test_only]
    public fun test_kelp_address(
        kelp: &Kelp
    ): address {
        kelp.id.uid_to_address()
    }
}
