# Project Walkthrough: 4-Player Dou Dizhu

## Overview
This project is a fully functional, browser-based implementation of the popular Chinese card game **Dou Dizhu (Landlord)**, designed for 4 players (1 Human vs 3 AI). It is built with **React**, **TypeScript**, and **Tailwind CSS**, featuring a polished UI, smooth animations, and sound effects.

## Features

### 1. Core Gameplay
- **4-Player Rules**: Uses a double deck (108 cards). One Landlord vs Three Peasants.
- **Full Rule Engine**:
  - Supports all standard hands: Singles, Pairs, Triples, Straights, Bombs, Rockets, etc.
  - Validates moves and compares hand values correctly.
- **Game Flow**:
  - **Shuffling & Dealing**: Visual animations for deck shuffling and card dealing.
  - **Bidding Phase**: Players bid for the Landlord position.
  - **Playing Phase**: Turn-based play with validation.
  - **Win Condition**: The game ends when any player runs out of cards.

### 2. AI Opponents
- **Rule-Based AI**: Three AI players capable of playing the game autonomously.
- **Strategies**:
  - **Leading**: Tries to get rid of small cards first.
  - **Following**: intelligently finds the smallest hand that can beat the current play.
  - **Passing**: Knows when to pass if it cannot win.

### 3. User Interface & Experience
- **Immersive Design**:
  - Green felt table background (Classic theme).
  - High-quality card visuals with suit colors and symbols.
  - Role icons (Crown for Landlord, User for Peasants).
- **Animations (Framer Motion)**:
  - **Shuffling**: Rotating deck animation.
  - **Dealing**: Cards fly to players one by one.
  - **Card Interaction**: Smooth selection (pop-up) and playing (fly-to-center) animations.
  - **Turn Indicator**: Active player is highlighted with a breathing glow.
- **Sound Effects**:
  - High-quality OGG sounds for shuffling, dealing, playing, winning, losing, and clicking.
- **Advanced Interaction**:
  - **Drag-to-Select**: Click and drag to select multiple cards at once.
  - **Smart Hint**: "Hint" button automatically selects the best cards to play.
- **Theming**:
  - **Settings Menu**: Toggle between Classic (Green), Tech (Dark Blue), and Wood (Amber) themes.

### 4. Technical Architecture
- **State Management**: Custom `useGameLoop` hook manages the complex game state machine.
- **Component Structure**:
  - `GameTable`: Main container and layout.
  - `PlayerHand`: Renders cards for each player, handling layout and drag selection.
  - `Card`: Reusable, animated card component.
  - `GameOverModal`: Reusable modal for game results.
- **Utils**:
  - `deck.ts`: Deck generation and manipulation.
  - `rules.ts`: Core game logic and validation.
  - `ai.ts`: AI decision tree and hint generation.
  - `sound.ts`: Audio management.
  - `theme.ts`: Theme configuration.

## How to Play
1. **Start**: The game starts with a shuffling and dealing animation.
2. **Bid**: When it's your turn, choose to bid 1, 2, 3 points or Pass. The highest bidder becomes the Landlord.
3. **Play**:
   - Select cards by clicking or dragging.
   - Use the "Hint" button if you're stuck.
   - Click "Play" to put them on the table.
   - Click "Pass" if you cannot or do not want to beat the current hand.
4. **Win**: Empty your hand first to win! If you are a Peasant, you also win if any other Peasant empties their hand.
5. **Customize**: Click the Settings icon (top right) to change the game theme.

## Development Commands
- `npm run dev`: Start the local development server.
- `npm run build`: Build the project for production.
