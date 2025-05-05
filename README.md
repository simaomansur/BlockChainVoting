# Blockchain Voting System — *The Boyz on the Block*

## Overview
Elections are not always safe or secure. Transparent and accurate tools are necessary to ensure fair voting practices. Without secure systems, elections may be corrupted — undermining democracy itself.

This project leverages **blockchain technology** to create a secure, immutable voting platform. Once a vote (i.e., transaction) is submitted, it cannot be altered. Each voter can vote only once per poll, and all votes are auditable and verifiable.

---

## Objectives

### Security & Integrity
- Encrypt and immutably record each vote on a blockchain.
- Hash voter IDs to maintain anonymity.
- Explore additional privacy techniques like **Zero-Knowledge Proofs** to prevent correlation attacks.
- Enable third-party auditors to validate vote chains.
- Include **penetration testing** and **formal verification**.
- Define expected transaction volume and performance metrics.

### Transparency & Fairness
- Allow voters and admins to view vote counts, validate blockchains, and confirm one-vote-per-user behavior.

### Usability
- Provide a simple interface to create polls, vote, and view results in real time.

### Scalability
- Simulate a **national ballot initiative** to test high-concurrency and performance under load.

---

## Functional Requirements

### User Roles
- **Voter**: Log in with simulated credentials, vote in polls, and view results + blockchain data.
- **Administrator**: Create polls and manage the voting process.

### Pages / Views
- **Home Page**: Choose to create a poll, vote, or participate in the national mock election.
- **Create Poll Page**: Admin can enter poll title, question, and options. Poll ID is generated automatically.
- **Existing Polls Page**: View active polls with metadata like creation time and admin identity.
- **Vote Page**: Vote via a clean interface using bubbles/radio buttons.
- **Election Ballot Page**: Simulates a full ballot (President, Congress, Judges, Propositions). After voting, the blockchain state and vote counts are shown for transparency.

---

## Technical Requirements

### Backend
- Language: **Rust**
- Responsibilities:
  - Manage blockchain logic.
  - Store votes as immutable blocks.
  - Validate blockchain integrity and vote counts.

### Frontend
- Framework: **React**
- UI: **Material-UI (MUI)**
- Responsibilities:
  - Display all pages/views.
  - Communicate with backend via **Axios**.

### Blockchain Structure

#### Normal Polls
- Each vote becomes a block containing a simple transaction string.

#### Election Polls
- More advanced format:
  - Each vote is a JSON object.
  - Includes contests and selected options.
  - Blockchain verifies block hashes and aggregates votes per contest.

### Data Security
- Votes are hashed using **SHA-256**.
- Voter IDs are hashed for anonymity.
- Blockchain integrity is verified by checking `hash` and `previous_hash` fields.

### Testing & Validation
- **Unit Tests**: For blockchain components (block creation, hash validation, etc.).
- **Integration Tests**: End-to-end testing from poll creation to vote submission and validation.

### Performance Considerations
- Capable of handling **high concurrency**, especially during election poll simulations.
- Scalable to future distributed or threshold voting enhancements.

---

## Production Requirements

### UI / UX
- Clean, responsive design that emphasizes transparency and security.
- Real-time feedback: vote receipts, vote counts, blockchain status.
- Accessible for diverse user needs.

### Development Tools
- **Backend**: Rust, Cargo, Docker, Docker Compose
- **Frontend**: React, Material-UI, Axios, Docker
- **Testing**:
  - Rust unit test framework
  - Jest / React Testing Library for frontend

### Timeline
- Initial working prototype to be completed in approximately **8 weeks**.

---

## Usage & Process Flow

### 1. Create a Poll
- Admin logs in → navigates to *Create Poll* page → inputs poll title, question, and options.
- Poll is added to the blockchain and appears on the *Existing Polls* page.

### 2. Cast a Vote
- Voter logs in → selects a poll → votes via UI (radio buttons/bubbles).
- Vote is hashed and added as a block in the blockchain.

### 3. View Results & Verify Blockchain
- Voters can see:
  - Live vote counts
  - Blockchain chain details
  - Confirmation that their vote is included and unaltered

---

run the app

1. chmod +x run-docker.sh (should only need to do this once)
2. ./run-docker.sh (runs the app)

or 

1. docker-compose up --build (runs the app)
2. docker-compose down (stops the app) or ctrl+c

test

1. chmod +x run-tests.sh (should only need to do this once)
2. ./run-tests.sh (runs the tests)

reset db
1. docker-compose down -v --remove-orphans (stops the app and removes volumes)

search database

1. docker exec -it project-db-1 psql -U username -d my_database
2. \d (lists tables)
3. \d polls (shows columns in polls table)
    -SELECT * FROM polls; (shows all rows in polls table)
4. \d voters (shows columns in voters table)
    -SELECT * FROM voters; (shows all rows in voters table)

