# 🂡 4-Player Dou Dizhu (Landlord)

A modern, fully functional, browser-based implementation of the popular Chinese card game **Dou Dizhu (Landlord)**. Designed for 4 players (1 Human vs 3 AI) with a focus on polished UI/UX, smooth animations, and advanced AI strategy.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)
![Vite](https://img.shields.io/badge/Vite-5-646cff)

## ✨ Features

### 🎮 Core Gameplay
- **4-Player Rules**: Standard double-deck (108 cards) rules. One Landlord vs Three Peasants.
- **Complete Rule Engine**: Supports all hand types (Singles, Pairs, Triples, Straights, Bombs, Rockets, Airplanes, etc.).
- **Game Flow**: Smooth transitions from Shuffling -> Dealing -> Bidding -> Playing -> Scoring.

### 🤖 Advanced AI
- **Smart Strategy**: AI opponents use sophisticated logic, not just random moves.
- **Cooperation**: Peasant AIs work together to block the Landlord or help teammates.
- **Bomb Preservation**: AI intelligently saves bombs for critical moments.
- **Endgame Aggression**: AI switches to aggressive dumping mode when hand size is low.

### 🎨 Polished UI/UX
- **Immersive Design**: Classic green felt table, high-quality card assets, and role indicators.
- **Smooth Animations**: Powered by `framer-motion` for dealing, playing, and winning effects.
- **Smart Interaction**:
    - **Drag-to-Select**: Intuitive card selection.
    - **Smart Hint**: One-click best move suggestion (prioritizes Straights/Triples).
    - **Auto-Play**: Let the AI take over your turn if you need a break.
- **Themes**: Switch between Classic (Green), Tech (Dark Blue), and Wood (Amber) styles.

### 💰 Scoring & Persistence
- **Robust Scoring**: Automatically calculates base scores, bombs, rockets, and Spring/Anti-Spring multipliers.
- **Data Persistence**: Saves your total score, win rate, and match history to `localStorage`.
- **Visual Results**: Beautiful victory/defeat screens with detailed score breakdowns.

### 🛠 Developer Tools
- **Debug Overlay**: Press `Ctrl+D` to see AI hands, real-time evaluation scores, and decision reasoning.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/doudizhu.git
    cd doudizhu
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and visit `http://localhost:5173`.

### Network Access
To play on other devices in your local network:
1.  Ensure your computer and device are on the same Wi-Fi.
2.  Run `npm run dev`.
3.  Look for the `Network` URL in the terminal (e.g., `http://192.168.1.5:5173`).

## 🕹 How to Play

1.  **Bidding**: At the start, choose to bid 1, 2, or 3 points to become the Landlord. The highest bidder wins.
    -   **Landlord**: Plays alone against the other 3. Wins if they empty their hand first.
    -   **Peasants**: Work together. If *any* peasant empties their hand, the peasant team wins.
2.  **Playing**:
    -   Select cards by clicking or dragging.
    -   Click **Play** to submit your hand.
    -   Click **Pass** if you cannot beat the current hand.
    -   Use **Hint** for assistance.
3.  **Winning**: The game ends immediately when a player runs out of cards.

## 🏗 Tech Stack

-   **Frontend Framework**: React 18
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Animations**: Framer Motion
-   **Build Tool**: Vite
-   **Icons**: Lucide React
-   **State Management**: React Hooks (Custom `useGameLoop`)

## 📂 Project Structure

```
src/
├── components/     # UI Components (GameTable, Card, PlayerHand, etc.)
├── hooks/          # Game Logic Hooks (useGameLoop)
├── utils/          # Core Logic
│   ├── rules.ts    # Hand validation and comparison
│   ├── ai.ts       # AI strategy and decision making
│   ├── deck.ts     # Deck generation and shuffling
│   ├── score.ts    # Scoring and persistence
│   └── sound.ts    # Audio management
├── contexts/       # Global Contexts (Toast)
└── types.ts        # TypeScript definitions
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
