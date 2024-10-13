# KEy-Loss Protection (KELP) for Sui

This Sui Move package implements KELP, a key-loss protection mechanism allowing account owners to recover their accounts if they lose their private keys.

## Overview

KELP allows an account owner to designate a set of guardians and pre-register a recovery address. If the owner loses their key, they can initiate a recovery process involving a commit-reveal scheme.  Guardians participate in the reveal phase, and after a challenge window, the owner can claim their account back using the recovery address.

## Key Features

* **Commit-Reveal Scheme:**  Enhances security by requiring a two-step process for recovery.
* **Guardian Network:**  Distributes trust among a set of guardians, preventing single points of failure.
* **Challenge Window:**  Allows the original owner to challenge a potentially malicious recovery attempt.
* **Fees:**  Incentivizes guardian participation and discourages frivolous recovery attempts.
* **Dynamic Fields:** Enables holding and withdrawing various coin types and objects within the `Kelp` object.
* **Upgradeability:** Built-in versioning and upgrade mechanisms.

## Module Structure

The `kelp::kelp` module contains the core logic for KELP:

* **`KelpRegistry`:** A global registry tracking all Kelp objects.
* **`Kelp`:**  Represents a KELP recovery setup for an account (shared object).
* **`Commit`:** Stores commit information under the sender's address.
* **`DominantReveal`:** Stores the current dominant reveal within the Kelp object.

## Functions

### Initialization

* **`init`:** Initializes the `KelpRegistry`.

### Core Functionality

* **`create_kelp`:** Creates and publishes a new `Kelp` object.
* **`commit`:** Initiates the recovery process with a commit.
* **`reveal`:** Reveals recovery data and supports a claim.
* **`claim`:** Claims the account using the recovery address.
* **`challenge`:** Challenges a claim within the challenge window.
* **`collect_fees`:** Allows the owner to collect accumulated fees.

### Guardian Management

* **`add_guardian`:** Adds a guardian to the `Kelp` object.
* **`remove_guardian`:** Removes a guardian from the `Kelp` object.

### Enable/Disable

* **`tongle_enable`:** Enables or disables the KELP recovery for the account.

### Asset Management

* **`accept_payment<T>`:**  Accepts payments of any coin type `T`.
* **`withdraw<T>`:** Withdraws coins of type `T`.
* **`withdraw_and_accept<T>`:** Combines accepting and withdrawing coins.
* **`withdraw_all<T>`:** Withdraws all coins of a specific type `T`.
* **`accept_object<T>`:** Accepts any object of type `T`.
* **`get_object<T>`:** Retrieves a stored object of type `T`.


### Helper Functions

* **`bump_kelp_version` / `bump_kelp_registry_version`:**  Bump version numbers for upgradeability.
* **`is_kelp_version_valid` / `is_kelp_registry_version_valid`:** Check version validity.

## Usage

See the included example scripts for usage demonstrations.

## Errors

The module defines several error codes for handling various scenarios:

* `EVersionMismatch`: Mismatch between expected and actual Kelp/Registry version.
* `EAlreadyAGuardian`: Guardian already exists.
* `EBadChallenge`: Invalid challenge attempt.
* `EKelpNotEnabled`: KELP recovery is not enabled.
* `ERevealTooSoon`: Reveal attempt made too soon.
* `EClaimTooSoon`: Claim attempt made too soon.
* `ECommitAlreadyExists`: A commit with the same hash already exists.
* `ECommitNotFound`: No commit found for the sender.
* `EInvalidCommitHashLength`: Invalid commit hash length.
* `EWrongClaimant`: Claim attempt by an address other than the dominant claimant.
* `ECommitFeeNotEnough`: Insufficient commit fee.
* `ENotGuardian`: Sender is not a registered guardian.
* `ENotTheKelpOwner`: Sender is not the KELP owner.
* `EAccountBalanceDoesNotExist`: Account balance does not exist.


## Contributing

Contributions are welcome!  Please open an issue or submit a pull request.

## License

Apache-2.0