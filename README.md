# ToguzKorgoolProject

A web-based implementation of the traditional **Kyrgyz strategy game Toguz Korgool**, created as my Senior Project.

**Live Game:**  
https://zadran-s-auca-2022.github.io/ToguzKorgoolProject/

---

## Project Overview

This project recreates the classic Kyrgyz board game **Toguz Korgool** as an interactive web application.

The game is played by two players (Player A and Player B).  
Each player has 9 pits containing stones called **korgools**, plus a store (kazan) for captured stones.  
On each turn, the player selects one of their pits and distributes its korgools counter-clockwise according to the traditional rules.

The objective is to **capture more than half of all korgools (≥ 82 stones)**.

This prototype was developed as the **Fall-semester implementation** for the Senior Project course (COM-431.1) at the American University of Central Asia.

---

## Gameplay at a Glance

- **Two rows of 9 pits** (top: Player B, bottom: Player A)
- Each pit starts with **9 korgools**
- On your turn, click one of your pits:
  - If the pit has **1 stone**, that stone is sown into the **next** pit.
  - If the pit has **more than 1 stone**, **1 stone remains** in the selected pit, and the rest are sown one-by-one into subsequent pits.
- If the **last stone** lands in an opponent’s pit and that pit now has an **even number of stones**, they are captured into your **kazan**.
- When a player’s kazan reaches **82 or more stones**, the game ends and the winner is declared.
- The implementation also supports the **tuz / sool** rule (special capturing pit) with standard restrictions.

---

## Main Features

-  **Two-player local mode** (on the same device)  
-  **“Play vs Computer” mode**  
  - Simple AI that chooses a move aiming to capture the most stones this turn.
-  **Full sowing & capturing logic**
  - 1-stone vs multi-stone moves
  - Capturing on even counts
  - Tuz (sool) rule support
  - Automatic detection of game end (≥ 82 stones or no more possible moves)
-  **Visual board & pits**
  - Wooden board style inspired by real Toguz Korgool sets
  - Stone graphics instead of plain numbers
  - Pit numbers for easier explanation and move history
-  **Move History panel**
  - Logs each move with player, pit number, stones moved, last pit, and captured stones
-  **Settings panel**
  - Toggle sound effects (sowing / capturing)
  - View a short rules summary
-  **Splash screen**
  - Simple start screen with game logo and “Start Game” button
-  **Responsive layout**
  - Works on desktop and adapts to smaller windows (laptop / tablet)

---

## Technologies Used

- **HTML5** – page structure and layout  
- **CSS3** – board design, animations, and responsive styling  
- **JavaScript (Vanilla)** – full game logic, AI opponent, move history, and UI updates  
- **Git & GitHub** – version control  
- **GitHub Pages** – live hosting  

---

## How to Run the Project Locally

1. **Clone the repository:**

   ```bash
   git clone https://github.com/zadran-s-auca-2022/ToguzKorgoolProject.git
```

## Project Structure

```
ToguzKorgoolProject/
├── index.html   # Main webpage and layout
├── style.css    # Styling, board design, responsive rules
├── game.js      # Full game logic, AI, move history, settings, sounds
└── README.md    # Project documentation
```

## ✍️ Author

Saima Zadran
Senior Project – Software Engineering Program
American University of Central Asia

---
