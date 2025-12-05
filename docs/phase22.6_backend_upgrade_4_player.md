# Phase 22.6: Backend 4-Player Rules & PvE

## Overview
Upgrades the backend from a 3-player variant to a standard 4-player settings (PvE enabled).
This phase refactors the seat management system, implements bot auto-fill, adjusts the dealing logic for two decks, and updates the scoring rules.

## Engineering Facts

### 1. Seat System Refactor
- **Old Structure**: `room:{id}:players` (List/Hash keyed by UserId).
- **New Structure**: `room:{id}:seats` (Hash Map).
    - **Key**: Seat Index (`0`, `1`, `2`, `3`).
    - **Value**: JSON Object (RoomPlayer + `isBot: boolean`).
- **Logic**: 
    - Players are assigned the first available seat (0-3).
    - `RoomService.getPlayers` returns a list sorted by `seat`.

### 2. PvE Bot Auto-fill
- **Trigger**: `RoomService.tryStartGame()`.
- **Condition**: If valid players >= 1 and < 4.
- **Action**: Empty seats are filled with auto-generated Bot agents.
    - ID: `bot-{timestamp}-{seat}`
    - IsBot: `true`
    - Ready: `true`

### 3. Dealing Logic (2 Decks)
- **Module**: `DealingState`
- **Total Cards**: 108 (2 Standard Decks + 4 Jokers).
- **Distribution**:
    - **Bottom Cards**: 8 (Reserved).
    - **Player Hands**: 25 cards each (100 total distributed).
- **Sorting**: Players are sorted by `seatIndex` before dealing to ensure consistent clockwise distribution.

### 4. Turn Rotation & Win Condition
- **Rotation**: `(CurrentSeatIndex + 1) % 4`.
- **Win Condition**: `PlayingState` checks `player.hand.length === 0` after every move.
    - If met: Transitions to `GameEndState`.

### 5. Scoring (1L vs 3P)
- **Module**: `MatchService`
- **Logic**: Zero-sum based on Base Stake (`unit = base * multiplier`).
    - **Landlord Win**: Landlord `+3 * unit`, Peasants `-1 * unit` (each).
    - **Landlord Loss**: Landlord `-3 * unit`, Peasants `+1 * unit` (each).

## Data Flows

### Room Creation & Join
1. `POST /rooms` (Type: PVE/PVP) -> `RoomService`.
2. `join_room` (Socket) -> `RoomService.joinRoom` -> Update `room:{id}:seats`.

### variable "seats" payload
When client receives `player_list` or `room_info`, the `players` array is guaranteed to be sorted by `seat` (0 -> 3).

### Game Start
1. Owner clicks Start.
2. `RoomService` fills empty seats with Bots.
3. `GameContext` initialized with 4 players (Real + Bots).
4. `DealingState` deals 108 cards.
5. `PlayingState` starts loop.

## Verification
- **Redis Inspection**:
    ```bash
    HGETALL room:{id}:seats
    # Expect keys "0", "1", "2", "3"
    ```
- **Game Log**:
    - Look for "Deck shuffled with 108 cards".
    - Look for "Reserved 8 bottom cards".
    - Look for "Dealt 25 cards to Seat X".
