# KEy-Loss Protection (KELP) for Sui

This Sui Move module provides a key-loss protection (KELP) mechanism for account owners.  KELP allows users to recover their accounts if they lose their private keys, utilizing a commit-reveal scheme and a network of guardians.

## Overview

KELP operates on a commit-reveal scheme with a challenge period.  Guardians play a crucial role in confirming recovery attempts, offering additional security.

1. **Commit:** The account owner generates a commit hash using their original address, a recovery address, and a nonce.  They then submit this hash along with a commit fee to the `KelpRegistry`.
2. **Reveal:** After a specified reveal window, guardians can reveal the recovery data (claimant address and nonce) associated with the commit hash. The earliest commit wins.
3. **Challenge:** Within the challenge window, the original owner can challenge a recovery attempt, effectively cancelling it and reclaiming the accumulated fees.
4. **Claim:** If no challenge is made within the challenge window, the claimant can claim the account, transferring ownership to the recovery address.

## Key Features

* **Commit-Reveal Scheme:** Enhances security by requiring a two-step recovery process.
* **Guardian Network:** Introduces trusted parties to verify recovery attempts.
* **Challenge Period:** Allows the original owner to dispute unauthorized recovery attempts.
* **Fee Mechanism:** Discourages spamming and incentivizes guardian participation.
* **Dynamic Field Support:** Allows users to store arbitrary objects and coins in their Kelp object, which can then be claimed back by the original owner or transferred to the new owner after a succesful claim.
* **Versioning:**  Includes versioning for future upgrades and compatibility.

## Usage

### Initialization

The module is initialized by calling the `init` function. This publishes the `KelpRegistry` shared object.

### Enabling KELP

Account owners can enable KELP by calling the `create_kelp` function, specifying the reveal fee, challenge window, and a set of guardian addresses.  This publishes a `Kelp` shared object linked to their account.

### Recovery Process

1. **Commit:** Call the `commit` function with the commit hash and the commit fee.
2. **Reveal:** After the reveal window, a guardian calls the `reveal` function with the recovery data and reveal fee.
3. **Challenge (Optional):** Within the challenge window, the original owner can call the `challenge` function to cancel the recovery attempt.
4. **Claim:** If no challenge is made, the claimant calls the `claim` function to take ownership of the account.

## Functions

### Core Functions

* `init`: Initializes the KELP module.
* `create_kelp`: Creates and publishes a Kelp object for an account.
* `commit`: Submits a commit hash to initiate recovery.
* `reveal`: Reveals the recovery data.
* `claim`: Claims the account after a successful reveal.
* `challenge`: Challenges a recovery attempt within the challenge window.
* `collect_fees`: Allows the owner to collect accumulated fees.

### Helper Functions

* `bump_kelp_version`: Updates the Kelp object version.
* `bump_kelp_registry_version`: Updates the KelpRegistry version.
* `is_kelp_version_valid`: Checks if the Kelp object version is valid.
* `is_kelp_registry_version_valid`: Checks if the KelpRegistry version is valid.
* `add_guardian`: Adds a guardian to the Kelp object.
* `remove_guardian`: Removes a guardian from the Kelp object.
* `tongle_enable`: Enables or disables the KELP recovery feature.
* `accept_payment`: Accepts payments.
* `withdraw`: Withdraws coins.
* `withdraw_and_accept`: Withdraws coins and accepts payments.
* `withdraw_all`: Withdraws all coins.
* `accept_object`: Accepts object.
* `get_object`: Gets an object stored within the KELP resource.

## Error Codes

The module defines several error codes for various failure scenarios, which are documented in the code comments.

## Security Considerations

* **Guardian Selection:** Careful selection of guardians is crucial for security.
* **Nonce Management:** Secure generation and storage of the nonce is essential to prevent replay attacks.


This README provides a high-level overview of the KELP module. Refer to the inline code comments for more detailed information.