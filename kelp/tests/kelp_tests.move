#[test_only]
module kelp::kelp_tests {

    use sui::{
        hash::blake2b256,
        bcs,
        clock::{Self, Clock},
        coin,
        sui::SUI,
        test_scenario::{Self, Scenario},
        test_utils,
        vec_set
    };

    use kelp::kelp::{Self, Kelp, KelpRegistry};

    const ENotImplemented: u64 = 0;


    fun init_tests(
        scenario: &mut Scenario,
        user: address
    ): (Clock, KelpRegistry) {
        // Create a clock for testing purposes.
        let clock = clock::create_for_testing(scenario.ctx());
        scenario.next_tx(user);

        let kelp_registry = kelp::test_create_kelp_registry(scenario.ctx());

        (clock, kelp_registry)
    }

    fun cleanup(
        scenario: Scenario,
        clock: Clock,
        kelp_registry: KelpRegistry
    ) {
        // Destroy the testing clock.
        clock.destroy_for_testing();
        // Close the KelpRegistry.
        test_utils::destroy(kelp_registry);
        // End the test scenario.
        scenario.end();
    }

    const COMMIT_FEE: u64 = 1_000_000_000;
    const REVEAL_WINDOW: u64 = 120_000; //3_600_000;

    #[test]
    fun test_create_kelp() {
        let user = @0x23f5f16c179f11117465e139fd5dc7d7a56367c605eec48b43404b8cdda3a8a7;
        let mut scenario = test_scenario::begin(user);
        let (clock, mut kelp_registry) = init_tests(&mut scenario, user);

        kelp::create_kelp(
            &mut kelp_registry,
            COMMIT_FEE,
            REVEAL_WINDOW,
            true,
            vec_set::empty<address>(),
            scenario.ctx()
        );

        test_scenario::next_tx(&mut scenario, user);
        let kelp_val = test_scenario::take_shared<Kelp>(&scenario);
        let k = kelp_val;

        // Get the registry from the KelpRegistry registry.
        assert!(kelp_registry.test_registry_length() == 1, 0);

        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, user, &k), 0);

        k.test_destroy_kelp();
        cleanup(scenario, clock, kelp_registry);
    }

    #[test, expected_failure(abort_code = ::kelp::kelp::ECommitAlreadyExists)]
    fun test_commit_already_exists() {
        let (owner, new_owner) = (@0x23f5f16c179f11117465e139fd5dc7d7a56367c605eec48b43404b8cdda3a8a7, @0x1);
        let mut scenario = test_scenario::begin(owner);
        let (clock, mut kelp_registry) = init_tests(&mut scenario, owner);

        kelp::create_kelp(
            &mut kelp_registry,
            COMMIT_FEE,
            REVEAL_WINDOW,
            true,
            vec_set::empty<address>(),
            scenario.ctx()
        );

        test_scenario::next_tx(&mut scenario, owner);
        let kelp_val = test_scenario::take_shared<Kelp>(&scenario);
        let k = kelp_val;

        // Get the registry from the KelpRegistry registry.
        assert!(kelp_registry.test_registry_length() == 1, 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);

        // commit
        scenario.next_tx(new_owner);

        let kelp_address: address = k.test_kelp_address();
        let nonce = b"nonce";

        let mut c = bcs::to_bytes(&kelp_address);
        c.append(bcs::to_bytes(&new_owner));
        c.append(bcs::to_bytes(&nonce));

        let hash_value = blake2b256(&c);

        kelp::commit(
            &mut kelp_registry,
            hash_value,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock
        );

        kelp::commit(
            &mut kelp_registry,
            hash_value,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock
        );

        k.test_destroy_kelp();
        cleanup(scenario, clock, kelp_registry);
    }

    #[test, expected_failure(abort_code = ::kelp::kelp::ERevealTooLate)]
    fun test_reveal_too_late() {
        let (owner, new_owner) = (@0x23f5f16c179f11117465e139fd5dc7d7a56367c605eec48b43404b8cdda3a8a7, @0x1);
        let mut scenario = test_scenario::begin(owner);
        let (mut clock, mut kelp_registry) = init_tests(&mut scenario, owner);

        kelp::create_kelp(
            &mut kelp_registry,
            COMMIT_FEE,
            REVEAL_WINDOW,
            true,
            vec_set::empty<address>(),
            scenario.ctx()
        );

        test_scenario::next_tx(&mut scenario, owner);
        let kelp_val = test_scenario::take_shared<Kelp>(&scenario);
        let mut k = kelp_val;

        // Get the registry from the KelpRegistry registry.
        assert!(kelp_registry.test_registry_length() == 1, 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);

        // commit
        scenario.next_tx(new_owner);

        let kelp_address: address = k.test_kelp_address();
        let nonce = b"nonce";

        let mut c = bcs::to_bytes(&kelp_address);
        c.append(bcs::to_bytes(&new_owner));
        c.append(bcs::to_bytes(&nonce));

        let hash_value = blake2b256(&c);

        kelp::commit(
            &mut kelp_registry,
            hash_value,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock
        );

        clock::increment_for_testing(&mut clock, 120_001);

        // reveal
        kelp::reveal(
            &mut kelp_registry,
            &mut k,
            new_owner,
            nonce,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock,
            scenario.ctx()
        );

        // claim
        kelp::claim(
            &mut kelp_registry,
            &mut k,
            &clock,
            scenario.ctx()
        );

        assert!(kelp_registry.test_registry_length() == 2, 0);
        assert!(!kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, new_owner, &k), 0);

        k.test_destroy_kelp();
        cleanup(scenario, clock, kelp_registry);
    }

    #[test, expected_failure(abort_code = ::kelp::kelp::EClaimTooSoon)]
    fun test_claim_too_soon() {
        let (owner, new_owner) = (@0x23f5f16c179f11117465e139fd5dc7d7a56367c605eec48b43404b8cdda3a8a7, @0x1);
        let mut scenario = test_scenario::begin(owner);
        let (clock, mut kelp_registry) = init_tests(&mut scenario, owner);

        kelp::create_kelp(
            &mut kelp_registry,
            COMMIT_FEE,
            REVEAL_WINDOW,
            true,
            vec_set::empty<address>(),
            scenario.ctx()
        );

        test_scenario::next_tx(&mut scenario, owner);
        let kelp_val = test_scenario::take_shared<Kelp>(&scenario);
        let mut k = kelp_val;

        // Get the registry from the KelpRegistry registry.
        assert!(kelp_registry.test_registry_length() == 1, 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);

        // commit
        scenario.next_tx(new_owner);

        let kelp_address: address = k.test_kelp_address();
        let nonce = b"nonce";

        let mut c = bcs::to_bytes(&kelp_address);
        c.append(bcs::to_bytes(&new_owner));
        c.append(bcs::to_bytes(&nonce));

        let hash_value = blake2b256(&c);

        kelp::commit(
            &mut kelp_registry,
            hash_value,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock
        );

        // reveal
        kelp::reveal(
            &mut kelp_registry,
            &mut k,
            new_owner,
            nonce,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock,
            scenario.ctx()
        );

        // claim
        kelp::claim(
            &mut kelp_registry,
            &mut k,
            &clock,
            scenario.ctx()
        );

        assert!(kelp_registry.test_registry_length() == 2, 0);
        assert!(!kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, new_owner, &k), 0);

        k.test_destroy_kelp();
        cleanup(scenario, clock, kelp_registry);
    }

    #[test]
    fun test_claim_kelp() {
        let (owner, new_owner) = (@0x23f5f16c179f11117465e139fd5dc7d7a56367c605eec48b43404b8cdda3a8a7, @0x1);
        let mut scenario = test_scenario::begin(owner);
        let (mut clock, mut kelp_registry) = init_tests(&mut scenario, owner);

        kelp::create_kelp(
            &mut kelp_registry,
            COMMIT_FEE,
            REVEAL_WINDOW,
            true,
            vec_set::empty<address>(),
            scenario.ctx()
        );

        test_scenario::next_tx(&mut scenario, owner);
        let kelp_val = test_scenario::take_shared<Kelp>(&scenario);
        let mut k = kelp_val;

        // Get the registry from the KelpRegistry registry.
        assert!(kelp_registry.test_registry_length() == 1, 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);

        // commit
        scenario.next_tx(new_owner);

        let kelp_address: address = k.test_kelp_address();
        let nonce = b"nonce";

        let mut c = bcs::to_bytes(&kelp_address);
        c.append(bcs::to_bytes(&new_owner));
        c.append(bcs::to_bytes(&nonce));

        let hash_value = blake2b256(&c);

        kelp::commit(
            &mut kelp_registry,
            hash_value,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock
        );

        // reveal
        kelp::reveal(
            &mut kelp_registry,
            &mut k,
            new_owner,
            nonce,
            coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx()),
            &clock,
            scenario.ctx()
        );

        clock::increment_for_testing(&mut clock, 120_000);

        // claim
        kelp::claim(
            &mut kelp_registry,
            &mut k,
            &clock,
            scenario.ctx()
        );

        assert!(kelp_registry.test_registry_length() == 2, 0);
        assert!(!kelp::test_registry_contains_kelp_address_owner(&kelp_registry, owner, &k), 0);
        assert!(kelp::test_registry_contains_kelp_address_owner(&kelp_registry, new_owner, &k), 0);

        k.test_destroy_kelp();
        cleanup(scenario, clock, kelp_registry);
    }

    #[test]
    fun test_kelp() {
        // pass
    }

    #[test, expected_failure(abort_code = ::kelp::kelp_tests::ENotImplemented)]
    fun test_kelp_fail() {
        abort ENotImplemented
    }

}
