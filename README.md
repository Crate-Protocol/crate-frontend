<div align="center">

<img src="public/crate-logo.svg" width="100" height="100" alt="Crate Logo" />

# Crate

### The beat marketplace where producers get paid in 5 seconds.

[![License](https://img.shields.io/badge/License-MIT-facc15?style=flat-square&labelColor=000)](LICENSE)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-facc15?style=flat-square&labelColor=000&logo=stellar&logoColor=white)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Contracts-Soroban-facc15?style=flat-square&labelColor=000)](https://soroban.stellar.org)
[![React](https://img.shields.io/badge/React-18-facc15?style=flat-square&labelColor=000&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-facc15?style=flat-square&labelColor=000&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Network](https://img.shields.io/badge/Network-Testnet-facc15?style=flat-square&labelColor=000)](https://stellar.org/developers)

[Overview](#overview) · [Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Contracts](#deployed-contracts) · [Contributing](#contributing)

</div>

---

## Currently Building

| Feature | Status | Branch |
|---|---|---|
| Beat upload flow with IPFS | Done | `main` |
| Marketplace grid with filters | In Progress | `feat/marketplace-filters` |
| Audio preview player (30s clips) | In Progress | `feat/audio-preview` |
| Mobile app (React Native) | In Progress | `crate-mobile` |
| Mainnet deployment | Planned | — |

---

## Overview

**Crate** is a peer-to-peer sample and beat marketplace built on [Stellar](https://stellar.org). It proves a simple thesis: producers deserve to be paid instantly, and Ethereum fees make that impossible on a $20 beat.

Stellar settles in **5 seconds** at **fractions of a cent**. Crate builds on top of that to give producers a 90% revenue split — no middlemen, no waiting 30 days for a payout, no label taking your cut.

> _"Getting your beat sold on Crate isn't just a transaction. It's validation. It's making it."_

---

## Features

### For Producers
- **Instant settlement** — XLM hits your wallet in 5 seconds after purchase
- **90/10 split** — Keep 90% of every sale vs. the industry standard 30–50%
- **Three license tiers** — Lease, Premium, and Exclusive pricing per beat
- **Collab splits** — Co-produced beats split earnings automatically, no manager needed
- **IPFS storage** — Your beats live on decentralized storage. No platform can take them down
- **On-chain licensing** — Every purchase mints a verifiable license record

### For Buyers
- **30-second previews** — Full untagged beat unlocked only after purchase
- **Instant ownership** — License proof stored on-chain, no disputes
- **My Beats library** — Revisit purchased beats, receipts, and download links from one wallet-linked page
- **Browse by genre, BPM, key, mood** — Discover exactly what you need
- **Exclusive purchases** — Buy a beat exclusively and it's removed from the marketplace

### Platform
- **No intermediaries** — Soroban smart contract handles payments, splits, and licensing
- **Freighter wallet** — Seamless Web3 experience with Stellar Wallet Kit
- **Real-time balance** — Live XLM balance updates via Horizon
- **Mobile-ready** — Responsive UI, companion React Native app available

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Crate Frontend                           │
│              React 18 · TypeScript · Vite · Tailwind             │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐
│  Crate Backend  │  │   Soroban    │  │   IPFS / Pinata     │
│  Node · Express │  │   Contract   │  │  Audio + Metadata   │
│  Analytics/IPFS │  │  (Rust/WASM) │  │  Decentralized CDN  │
└────────┬────────┘  └──────┬───────┘  └────────────────────┘
         │                  │
         └──────────────────┘
                  │
         ┌────────▼────────┐
         │  Stellar Network │
         │  Testnet → Main  │
         │  5s · ~$0.0001   │
         └─────────────────┘
```

### Smart Contract Functions

| Function | Description |
|---|---|
| `upload_sample(title, cid, prices, genre, bpm)` | List a beat with three license tier prices |
| `purchase_license(sample_id, tier)` | Buy a license — auto-splits XLM 90/10 |
| `withdraw_earnings(producer)` | Pull accumulated balance to wallet |
| `delist_sample(sample_id)` | Remove beat (only if no active licenses) |
| `get_sample(id)` | Fetch beat metadata and pricing |
| `get_earnings(address)` | Check withdrawable balance |
| `get_stats()` | Platform-wide totals |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Wallet** | Freighter via `@creit.tech/stellar-wallets-kit` |
| **Blockchain** | Stellar, Soroban smart contracts (Rust) |
| **Storage** | IPFS via Pinata gateway |
| **SDK** | `@stellar/stellar-sdk` v13 |
| **Backend** | Node.js, Express, TypeScript |
| **Mobile** | React Native, Expo |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Freighter Wallet](https://freighter.app) browser extension (set to **Testnet**)

### Installation

```bash
# Clone
git clone https://github.com/Crate-Protocol/crate-frontend.git
cd crate-frontend

# Install
npm install

# Configure
cp .env.example .env
# Fill in your Pinata JWT and contract ID

# Start
npm run dev
```

Open **http://localhost:5173**

### Environment Variables

```env
# Deployed contract on Stellar Testnet
VITE_CONTRACT_ID=CA7DGEWWS3VH5J2I4I7FFEB5UHK2MJSYWDKDQKXQM7GDNLI2IRATDTLG

# Token contract used for purchase + withdrawal flows
VITE_XLM_TOKEN_ADDRESS=your_token_contract_address_here

# Pinata IPFS (for beat uploads)
VITE_PINATA_JWT=your_pinata_jwt_here
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud

# Network
VITE_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_RPC_URL=https://soroban-testnet.stellar.org
```

---

## Deployed Contracts

| Contract | Network | Address |
|---|---|---|
| `crate_marketplace` | Stellar Testnet | [`CA7DGEWW...DTLG`](https://stellar.expert/explorer/testnet/contract/CA7DGEWWS3VH5J2I4I7FFEB5UHK2MJSYWDKDQKXQM7GDNLI2IRATDTLG) |

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.tsx          # Top nav with wallet connect
│   ├── SampleCard.tsx      # Beat card with preview + buy
│   ├── WalletButton.tsx    # Connect / disconnect
│   └── AudioPlayer.tsx     # 30-second preview player
├── contracts/
│   └── crate.ts            # Soroban contract bindings
├── hooks/
│   ├── useWallet.ts        # Freighter wallet state
│   └── useContract.ts      # Contract read/write helpers
├── pages/
│   ├── Home.tsx            # Landing + hero
│   ├── Marketplace.tsx     # Browse beats
│   ├── Upload.tsx          # List your beat
│   ├── Profile.tsx         # Earnings + withdrawals
│   └── SampleDetail.tsx    # Beat page + license tiers
└── styles/
    └── index.css           # Design tokens + globals
```

---

## License Tiers

| Tier | Rights | Typical Price |
|---|---|---|
| **Lease** | Non-exclusive, limited commercial use, 100k streams | 10–50 XLM |
| **Premium** | Exclusive commercial, unlimited streams, full radio rights | 100–500 XLM |
| **Exclusive** | Full ownership transfer, beat removed from marketplace | 500–5000 XLM |

Each tier is enforced by the smart contract — no PDF contracts, no lawyers, no disputes.

---

## Why Stellar?

| | Ethereum | Stellar |
|---|---|---|
| **Settlement time** | 12+ seconds (PoS) | ~5 seconds |
| **Transaction fee** | $2–50 | ~$0.0001 |
| **Fee on a $20 beat sale** | $1–10 (5–50%) | $0.001 (<0.01%) |
| **Smart contracts** | EVM/Solidity | Soroban/Rust |
| **Asset issuance** | ERC-20 | Native |

A producer selling a $20 beat on Ethereum loses $5+ in gas. On Crate, they keep $18.

---

## Contributing

Crate is open source and community-driven. Contributions welcome.

```bash
# Fork → clone → branch
git checkout -b feat/your-feature

# Make changes, then open a PR
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Check [open issues](https://github.com/Crate-Protocol/crate-frontend/issues) for good first issues.

---

## Ecosystem

| Repo | Description |
|---|---|
| [crate-contracts](https://github.com/Crate-Protocol/crate-contracts) | Soroban smart contracts (Rust) |
| [crate-backend](https://github.com/Crate-Protocol/crate-backend) | API, IPFS proxy, analytics |
| [crate-mobile](https://github.com/Crate-Protocol/crate-mobile) | React Native mobile app |

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
  <img src="public/crate-logo.svg" width="40" alt="Crate" />
  <br/>
  <sub>Built on Stellar · Open Source · Non-custodial</sub>
  <br/><br/>

  [![Stars](https://img.shields.io/github/stars/Crate-Protocol/crate-frontend?style=flat-square&labelColor=000&color=facc15)](https://github.com/Crate-Protocol/crate-frontend/stargazers)
  [![Forks](https://img.shields.io/github/forks/Crate-Protocol/crate-frontend?style=flat-square&labelColor=000&color=facc15)](https://github.com/Crate-Protocol/crate-frontend/network/members)
  [![Issues](https://img.shields.io/github/issues/Crate-Protocol/crate-frontend?style=flat-square&labelColor=000&color=facc15)](https://github.com/Crate-Protocol/crate-frontend/issues)
</div>
