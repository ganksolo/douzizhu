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

### 2. Scoring & Persistence
- **Advanced Scoring System**:
  - **Base Score**: Determined by the bidding phase (1, 2, or 3).
  - **Multipliers**:
    - **Bombs**: Each bomb doubles the score (*2).
    - **Rocket**: Doubles the score (*2).
    - **Spring**: Landlord wins without peasants playing any cards (*2).
  - **Distribution**:
    - Landlord wins: Receives score from all 3 peasants.
    - Landlord loses: Pays score to all 3 peasants.
- **Detailed Result Screen**:
  - **Victory/Defeat Visuals**:
    - **Victory**: Golden trophy, falling coins animation, warm gradient.
    - **Defeat**: Gray sad face, rain animation, cool tones.
  - **Score Breakdown**: Shows base score, bomb count, spring bonus, and total multiplier.
  - **Score Change**: Clearly shows points won or lost (e.g., +120, -60).
- **Data Persistence**:
  - Automatically saves total score, win/loss record, and match history to `localStorage`.
  - Stats persist across page reloads.

### 3. Enhanced AI Opponents
- **Advanced Strategy AI**: Three AI players with sophisticated decision-making.
- **Hand Analysis**: AI decomposes hand into Bombs, Triples, Pairs, and Singles to plan moves.
- **Smart Leading**: Prioritizes playing complex hands (Straights, Airplanes, Triples) over Singles.
- **Smart Following**: 
  - Tries to match the played type without breaking valuable combos.
  - Prioritizes dumping "useless" singles.
- **Bomb Preservation**: AI avoids breaking bombs unless in endgame or when necessary.
- **Peasant Cooperation**:
  - Blocks landlord with strong cards when landlord is next player.
  - Helps teammates with weak cards when teammate is next player.
- **Endgame Aggression**: When < 5 cards remaining, AI enters aggressive mode to empty hand.

### 4. User Interface & Experience
- **Immersive Design**:
  - Green felt table background (Classic theme).
  - High-quality card visuals with suit colors and symbols.
  - **Refined Card UI**: 
    - **Smart Scaling**: Small cards (AI/Bottom) scale down the center pattern to avoid overlap, while keeping corner numbers readable.
    - **Distinct Jokers**: Black Joker is now gray, Red Joker remains red, making them easy to distinguish.
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
  - **Smart Hint**: 
    - Automatically selects the best cards to play.
    - **Intelligent Free Play**: Prioritizes Straights, Triples, and Pairs over Singles when leading.
    - **Context Aware**: Correctly identifies opponent's hand type.
  - **Auto-Play Mode**: Toggle button (bottom-left) to enable AI control for human player.
- **Theming**:
  - **Settings Menu**: Toggle between Classic (Green), Tech (Dark Blue), and Wood (Amber) themes.

### 5. Developer Tools
- **Debug Overlay** (Press `Ctrl+D` / `Cmd+D`):
  - Toggle visibility of AI debugging information.
  - **AI Hand View**: Face-up display of all 3 AI players' hands.
  - **Hand Scores**: Real-time evaluation scores (0-100) for each AI.
  - **AI Reasoning**: Last action reasoning for each AI (colored badges).
  - Compact, scrollable overlay in top-left corner.

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
