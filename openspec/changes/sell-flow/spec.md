# Specifications for sell-flow

## Domain: Database Schema

### ADDED Requirements

#### Requirement: Schema Additions
The system MUST update the Prisma schema to add `sellRate` and `isPaid` to `GiftcardBatch`, `buyRate` to `Order`, and `codeHash` to `Giftcard`.
The system MUST ensure `codeHash` has a unique constraint.

##### Scenario: Schema validation
- GIVEN a database with the updated schema
- WHEN a `Giftcard` is inserted with a duplicate `codeHash`
- THEN the database MUST reject the insertion

### REMOVED Requirements

#### Requirement: Giftcard.price
(Reason: Price is now calculated dynamically as `amount * sellRate`.)

## Domain: Security

### ADDED Requirements

#### Requirement: Secure Code Storage
The system MUST symmetrically encrypt `claimCode` and `pinCode` using AES-256-GCM before saving to the database.
The system MUST generate a deterministic SHA-256 hash for `claimCode` and store it in `codeHash` for duplicate detection.
The system MUST read the encryption key from an environment variable and MUST NOT hardcode it.

##### Scenario: Encrypting and hashing codes
- GIVEN a valid `claimCode` and encryption key in env vars
- WHEN the encryption utility is called
- THEN it MUST return an AES-256-GCM encrypted string and a valid SHA-256 hash

## Domain: Seller Actions

### ADDED Requirements

#### Requirement: publishBatch Action
The system MUST provide a `publishBatch` server action that validates inputs (amount > 0, claimCode not empty, valid brand/country).
The system MUST detect duplicate codes via `codeHash` and reject only the duplicate cards, not the entire batch.
The system MUST encrypt `claimCode` and `pinCode` for all valid cards.
The system MUST snapshot the user's current `sellRate` and save it to the `GiftcardBatch`.
The system MUST create the batch and all valid cards within a single database transaction.
The system MUST throw an error if no valid cards remain after filtering duplicates.

##### Scenario: Seller publishes batch successfully
- GIVEN a seller with a valid `sellRate`
- WHEN they submit a batch of valid, unique gift cards
- THEN the system MUST create the batch with the snapshotted `sellRate`, encrypt the codes, and save them in a transaction

##### Scenario: Seller publishes batch with some duplicate codes
- GIVEN a seller submitting a batch containing one new card and one duplicate card
- WHEN `publishBatch` is called
- THEN the system MUST reject the duplicate card, successfully publish the new card, and create the batch

##### Scenario: Seller publishes batch with ALL duplicate codes
- GIVEN a seller submitting a batch where every card is a duplicate
- WHEN `publishBatch` is called
- THEN the system MUST throw an error and NOT create an empty batch

##### Scenario: Seller publishes batch with invalid data
- GIVEN a seller submitting a batch with missing amounts or empty claim codes
- WHEN `publishBatch` is called
- THEN the system MUST reject the invalid cards or the entire request with a validation error

#### Requirement: getSellerBatches Updates
The system MUST decrypt `claimCode` and `pinCode` before returning batches to the seller.
The system MUST calculate the total batch value dynamically using the `sellRate` snapshot.

##### Scenario: Seller views their batches with decrypted codes
- GIVEN a seller who has published batches
- WHEN they view their batches
- THEN the system MUST return the batches with decrypted `claimCode` and `pinCode` values

## Domain: Order Actions

### ADDED Requirements

#### Requirement: createOrder Rate Snapshot
The system MUST snapshot the buyer's current `buyRate` and save it to the `Order` upon creation.

##### Scenario: Buyer creates order and buyRate is snapshotted
- GIVEN a buyer with a `buyRate` of 0.90
- WHEN they create an order
- THEN the system MUST store `0.90` as `buyRate` on the created `Order`

#### Requirement: Decrypt Codes on Read
The system MUST decrypt `claimCode` and `pinCode` whenever gift cards are read for order fulfillment or display.

##### Scenario: System reads gift cards for an order
- GIVEN an order containing gift cards with encrypted codes
- WHEN the system fetches the cards
- THEN it MUST successfully decrypt the `claimCode` and `pinCode`

## Domain: Seller UI

### MODIFIED Requirements

#### Requirement: Sell Wizard Integration
The system MUST use the real `publishBatch` server action instead of a stub when a seller submits a batch.
The system MUST display the seller's actual `sellRate` in the review step instead of a hardcoded value.

##### Scenario: Seller submits from UI
- GIVEN a seller completing the sell wizard
- WHEN they click publish
- THEN the UI MUST call `publishBatch` and handle the response

#### Requirement: Seller Cards View
The system MUST display the `isPaid` status of batches.
The system MUST calculate estimated payouts using the formula: sum of `effectiveAmount` * `batch.sellRate`, where `effectiveAmount` is the original amount if `USED`, `reportedAmount` if `WRONG_AMOUNT`, and `0` for `INVALID`.

##### Scenario: Seller sees correct payout calculation
- GIVEN a published batch with one `USED` ($100), one `WRONG_AMOUNT` (reported $50), and one `INVALID` ($100) card, with `sellRate` 0.80
- WHEN the seller views the batch
- THEN the system MUST calculate the payout as `($100 + $50 + $0) * 0.80 = $120`

##### Scenario: Batch is marked as paid
- GIVEN a batch with `isPaid=true`
- WHEN the seller views their batches
- THEN the UI MUST clearly indicate that the batch has been paid