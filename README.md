# KelpMe -- KEy-Loss Protection (KELP) for Sui

Losing web3 private keys often results in irrecoverable asset loss. Existing solutions are mainly proactive, requiring complex backups that most users don't adopt in practice. KelpMe implements the [KELP (KEy-Loss Protection) protocol][paper] on the [Sui blockchain][sui], offering a fully **reactive** recovery mechanism that requires **no prior setup** from the user.

KelpMe allows users to reclaim assets by initiating a three-phase smart contract flow: **Commit -> Reveal -> Claim** (or **Challenge**). We extend the original protocol with optional **Guardians** and economic deterrents (fee-based penalties for false claims). Sui's object-centric model enables key rotation semantics -- users regain control of a Kelp account without moving funds.

## Links

- [KELP scientific paper][paper] (ePrint 2021/289)
- [KelpMe pitch deck][deck]
- [KelpMe website][site] (testnet)
- [KelpMe on X][twitter]

[paper]: https://eprint.iacr.org/2021/289
[deck]: https://docs.google.com/presentation/d/1UFYTg3bJ7iT8znsAvZ8mJwiYRgNF7T-FluB7O75exeQ
[site]: https://kelpme.io
[twitter]: https://x.com/kelpmerecover
[sui]: https://sui.io

## Protocol Overview

KELP exploits an information asymmetry: the account owner is usually the first to know that their key has been lost. Anyone can initiate a claim, but the legitimate owner can cancel it by proving key possession (signing a Challenge transaction). This makes claims succeed **only** when the key is truly lost.

### Protocol Flow

```
Claimant                            Blockchain
   |                                     |
   |-- Commit(hash, fee_1) ------------->|  Store commitment
   |                                     |
   |   [wait for finality]               |
   |                                     |
   |-- Reveal(kelp, claimant, nonce, fee_2) ->|  Verify hash, record reveal
   |                                     |
   |   [challenge window t2]             |  Owner can Challenge here
   |                                     |
   |-- Claim() ------------------------->|  Transfer ownership
   |                                     |
```

### Phases

1. **Commit** -- The claimant computes `hash = blake2b256(bcs(kelp_address) || bcs(claimant_address) || bcs(nonce))` and submits it with a commit fee (`fee_1 = 1 SUI`). The hash hides which account is being claimed.

2. **Reveal** -- Within the reveal window (`t1 = 2 minutes`), a guardian (or anyone, if no guardians are set) reveals the claimant address and nonce along with a reveal fee (`fee_2`). The contract verifies the hash matches a stored commit. The earliest commit becomes the _dominant reveal_.

3. **Claim** -- After the challenge window (`t2`, set per-account) elapses without a challenge, the claimant calls `claim()` to take ownership.

4. **Challenge** -- At any time during the challenge window, the original owner can call `challenge()` to cancel the pending claim and retain the accumulated fees as compensation.

### Mapping to the Paper

| Paper Parameter         | Contract Constant/Field           | Description                             |
| ----------------------- | --------------------------------- | --------------------------------------- |
| `h` (hash function)     | `blake2b256`                      | Commitment hash function                |
| `address_c`             | `kelp_address` (Kelp object ID)   | Account being claimed                   |
| `address_r`             | `claimant`                        | Recovery address                        |
| `t1` (reveal window)    | `REVEAL_WINDOW` = 120,000 ms      | Time to reveal after commit             |
| `t2` (challenge window) | `kelp.challenge_window`           | Per-account, set at creation            |
| `fee_1` (commit fee)    | `COMMIT_FEE` = 1 SUI              | Discourages random-testing attacks      |
| `fee_2` (reveal fee)    | `kelp.reveal_fee_amount`          | Per-account minimum, enforced on reveal |
| `com` (commitment)      | `commits` table in `KelpRegistry` | Stored by hash key                      |

### Extensions Beyond the Paper

- **Guardian network**: Optional set of trusted addresses that must perform the reveal. When guardians are empty, anyone can reveal (original paper behavior).
- **Stale commit cleanup**: Anyone can call `remove_stale_commit()` to garbage-collect expired commits and receive the commit fee as a reward.
- **Asset custody**: The Kelp object can hold arbitrary coins and objects via `accept_payment()` / `accept_object()`, providing an on-chain vault that transfers with ownership.
- **Event emissions**: All state transitions emit events (`KelpCreated`, `CommitSubmitted`, `RevealProcessed`, `ClaimCompleted`, `ChallengeMade`, `StaleCommitRemoved`) for wallet monitoring.

## Repository Layout

```
kelp/                   Sui Move smart contract
  sources/kelp.move     Core module
  tests/kelp_tests.move Comprehensive test suite (36 tests)
  Move.toml             Package manifest
dapp/                   Vite + React 19 SPA
  src/hooks/            React hooks for each contract operation
  src/components/       UI components (Dashboard, RecoveryFlow, etc.)
  src/lib/              Shared helpers (tx utils, explorer URLs)
  src/config.ts         Contract addresses and constants
  src/dApp-kit.ts       Sui network and wallet configuration
publish/                Deployment script
  publish.sh            Deploy to localnet/devnet/testnet/mainnet
```

## Build, Test, and Deploy

### Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) (latest stable)
- [pnpm](https://pnpm.io/) (for the frontend)

### Smart Contract

```bash
cd kelp

# Build
sui move build

# Run tests
sui move test

# Run tests with verbose output
sui move test --verbose
```

### Deployment

```bash
cd publish

# Deploy to testnet (also: devnet, mainnet, or omit for localnet)
./publish.sh testnet
```

Requires `sui`, `jq`, and `curl`. Outputs object IDs (`PACKAGE_ID`, `REGISTRY_ID`, `REGISTRY_TABLE`) to `publish/.env`.

### Frontend

```bash
cd dapp

pnpm install
pnpm run dev        # Start dev server (Vite)
pnpm run build      # Type-check + production build
pnpm run preview    # Preview production build
```

Configure contract addresses in `dapp/.env` (tracked, `VITE_` prefix):

- `VITE_PACKAGE_ID` -- Deployed KELP package object ID
- `VITE_REGISTRY_ID` -- KelpRegistry shared object ID

## Architecture

### Smart Contract Objects

- **`KelpRegistry`** (shared, singleton) -- Global registry mapping owner addresses to their Kelp IDs. Stores pending commits and accumulated commit fees.
- **`Kelp`** (shared, per-account) -- Per-account recovery configuration: owner, guardians, fee parameters, challenge window, and the current dominant reveal.

### Core Functions

| Function              | Who Calls            | Purpose                                    |
| --------------------- | -------------------- | ------------------------------------------ |
| `create_kelp`         | Account owner        | Creates a Kelp recovery config             |
| `commit`              | Claimant (anyone)    | Submits a hash commitment with fee         |
| `reveal`              | Guardian (or anyone) | Reveals recovery data, verifies hash       |
| `claim`               | Claimant             | Transfers ownership after challenge window |
| `challenge`           | Current owner        | Cancels pending claim, keeps fees          |
| `collect_fees`        | Current owner        | Withdraws accumulated fees                 |
| `remove_stale_commit` | Anyone               | Cleans up expired commits for a fee reward |

### Management Functions

| Function                                       | Who Calls               | Purpose                                  |
| ---------------------------------------------- | ----------------------- | ---------------------------------------- |
| `add_guardian` / `remove_guardian`             | Owner                   | Manage the guardian set                  |
| `toggle_enable`                                | Owner                   | Enable/disable KELP recovery             |
| `accept_payment` / `withdraw` / `withdraw_all` | Owner / anyone (accept) | Manage coin balances                     |
| `accept_object` / `get_object`                 | Owner / anyone (accept) | Manage stored objects                    |
| `borrow_val` / `return_val`                    | Owner                   | Borrow objects with hot-potato guarantee |

### Frontend Hooks

Each contract operation has a corresponding React hook in `dapp/src/hooks/`:

- `useCreateKelp` -- Creates a Kelp for the connected wallet
- `useCommit` -- Computes the blake2b hash client-side and submits a commit
- `useReveal` -- Reveals recovery data (guardian action)
- `useClaim` -- Claims after challenge window
- `useChallenge` -- Owner challenges a claim
- `useTransferSUI` -- Accepts pending coins into KELP, withdraws, and transfers to a recipient
- `useClaimTokens` -- Accepts pending coins and withdraws the full balance to connected wallet
- `useSignAndExecute` -- Shared hook wrapping `dAppKit.signAndExecuteTransaction`

## Security Considerations

### Trust Model

KELP assumes that **long-range censorship is infeasible** on Sui. An adversary who can censor transactions for the entire challenge window (`t2`) could execute an attack. Setting `t2` to months or years makes this impractical.

### Attack Defenses

| Attack                        | Defense                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Front-running**             | Commit-reveal scheme hides the target account until reveal                              |
| **Random testing**            | Commit fee (`fee_1`) makes mass testing expensive                                       |
| **Targeted pre-commitment**   | Reveal fee (`fee_2`) makes failed claims costly; dominant reveal favors earliest commit |
| **Malicious claims**          | Challenge window lets the owner cancel and collect attacker's fees                      |
| **Stale commit accumulation** | `remove_stale_commit()` allows garbage collection with economic incentive               |

### Important Notes

- **Guardian selection**: Guardians have significant power -- they control who can reveal. Choose guardians carefully. An empty guardian set allows anyone to reveal (original paper behavior).
- **Nonce security**: The nonce must be kept secret until reveal. If leaked, an attacker can compute the hash and front-run with their own commit.
- **Challenge window sizing**: Should be long enough for the owner to detect a claim and respond. The paper recommends months to years for high-value accounts.
- **Reveal window (`t1 = 2 min`)**: Appropriate for Sui's fast finality (~2-3 second). Prevents stale commits from accumulating but is short enough that censorship attacks on reveal inclusion are unlikely.

## Credits

KelpMe is a collaborative work inspired by the Bybit/DMCC Dubai Hackathon. The team includes students from AUS (American University of Sharjah), industry leaders, the Mysten Labs cryptography team, and co-authors of the original KELP algorithm.
