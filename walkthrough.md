# Project Walkthrough: 4-Player Dou Dizhu

## Overview
This project is a fully functional, browser-based implementation of the popular Chinese card game **Dou Dizhu (Landlord)**, designed for 4 players (1 Human vs 3 AI). It is built with **React**, **TypeScript**, and **Tailwind CSS**, featuring a polished UI, smooth animations, advanced AI, and comprehensive debugging tools.

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

### 2. Enhanced AI Opponents
- **Advanced Strategy AI**: Three AI players with sophisticated decision-making.
- **Bomb Preservation**: AI avoids breaking bombs unless in endgame or when necessary.
- **Peasant Cooperation**:
  - Blocks landlord with strong cards when landlord is next player.
  - Helps teammates with weak cards when teammate is next player.
- **Endgame Aggression**: When < 5 cards remaining, AI enters aggressive mode to empty hand.
- **Hand Evaluation**: AI scores hands (0-100) based on bombs, pairs, triples, and high cards.
- **Console Logging**: AI decisions logged with reasoning (BOMB_PRESERVE, BLOCK_LANDLORD, etc.).

### 3. User Interface & Experience
- **Immersive Design**:
  - Green felt table background (Classic theme).
  - High-quality card visuals with suit colors and symbols.
  - Role icons (Crown for Landlord, User for Peasants).
- **Spatial Layout**:
  - **4 Separate Play Areas**: Each player's played cards appear at their position (Bottom, Right, Top, Left).
  - Clear visual indication of who played which cards.
- **Animations (Framer Motion)**:
  - **Shuffling**: Rotating deck animation.
  - **Dealing**: Cards fly to players one by one.
  - **Card Interaction**: 
    - Smooth selection (pop-up) and playing (fly-to-center) animations.
    - **Optimized Hover**: Cards float up smoothly without scaling, preventing layout jitter.
  - **Turn Indicator**: Active player is highlighted with a breathing glow.
  - **Toast Notifications**: Non-blocking error/warning messages with auto-dismiss.
- **Sound Effects**:
  - High-quality OGG sounds for shuffling, dealing, playing, winning, losing, and clicking.
  - **Smart Preloading**: Sounds load in background with progress indicator.
  - **Autoplay Handling**: Respects browser policies, initializes on user interaction.
  - **Sound Toggle**: Bottom-right button to enable/disable sounds with visual feedback.
- **Advanced Interaction**:
  - **Drag-to-Select**: Click and drag to select multiple cards at once.
  - **Smart Hint**: "Hint" button automatically selects the best cards to play (resets previous selection).
  - **Auto-Play Mode**: Toggle button (bottom-left) to enable AI control for human player.
- **Theming**:
  - **Settings Menu**: Toggle between Classic (Green), Tech (Dark Blue), and Wood (Amber) themes.

### 4. Developer Tools
- **Debug Overlay** (Press `Ctrl+D` / `Cmd+D`):
  - Toggle visibility of AI debugging information.
  - **AI Hand View**: Face-up display of all 3 AI players' hands.
  - **Hand Scores**: Real-time evaluation scores (0-100) for each AI.
  - **AI Reasoning**: Last action reasoning for each AI (colored badges).
  - Compact, scrollable overlay in top-left corner.

### 5. Technical Architecture
- **State Management**: Custom `useGameLoop` hook manages the complex game state machine.
- **Component Structure**:
  - `GameTable`: Main container and layout with position-based play areas.
  - `PlayerHand`: Renders cards for each player, handling layout and drag selection.
  - `Card`: Reusable, animated card component.
  - `GameOverModal`: Reusable modal for game results.
  - `SoundToggle`: Sound control button with ready indicator.
  - `DebugOverlay`: Developer debugging overlay with AI insights.
- **Contexts**:
  - `ToastContext`: Global toast notification system with auto-dismiss.
- **Utils**:
  - `deck.ts`: Deck generation and manipulation.
  - `rules.ts`: Core game logic and validation.
  - `ai.ts`: Enhanced AI with bomb preservation, cooperation, endgame strategies, and hand evaluation.
  - `sound.ts`: Audio management with preloading and autoplay handling.
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
5. **Customize**:
   - Click the Settings icon (top right) to change the game theme.
   - Click the Sound icon (bottom right) to toggle sound effects.
   - Click the Bot icon (bottom left) to enable/disable auto-play.
6. **Debug** (Developers):
   - Press `Ctrl+D` / `Cmd+D` to toggle debug overlay.
   - View AI hands, scores, and decision reasoning.

## Development Commands
- `npm run dev`: Start the local development server.
- `npm run build`: Build the project for production.
