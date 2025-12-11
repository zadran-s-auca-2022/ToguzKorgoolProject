# ToguzKorgoolProject

A web-based implementation of the traditional Kyrgyz board game Toguz Korgool, created as my Senior Project.

Live game:  
https://zadran-s-auca-2022.github.io/ToguzKorgoolProject/

---

## Project Overview

The game is played by Player A (human, bottom row) against the Computer (top row).  
Each side has 9 pits with stones (korgools) and one kazan (store) for captured stones.  
The goal is to collect more than half of all stones (at least 82).

This project is the Fall-semester implementation for COM-431.1 (Senior Project) at AUCA.

---

## Basic Rules

- 18 pits in total:
  - Pits 1–9 for Player A (bottom).
  - Pits 1–9 for Player B (top).
- Each pit starts with 9 stones.

On a turn:

1. The player chooses one of their non-empty pits.  
2. If the pit has 1 stone, it moves to the next pit.  
3. If the pit has more than 1 stone:
   - 1 stone stays in the chosen pit.
   - The rest are sown one by one into the following pits.

Capturing:

- If the last stone lands in an opponent pit and that pit now has an even number of stones,  
  all its stones are moved to the player’s kazan.

Tuz (sool):

- If the last stone makes an opponent pit contain exactly 3 stones, that pit can become a tuz.  
- Any later stones landing there go directly to the owner’s kazan.  
- Each player can have only one tuz, and the opponent’s 9th pit cannot become a tuz.

The game ends when one player reaches 82 or more stones, or when one side has no stones left in their pits.  
Remaining stones are added to the corresponding kazans and the higher score wins.

---

## Main Features

- Human vs Computer (no two-player mode).  
- Complete sowing, capturing, and tuz logic.  
- Simple AI that tries to choose moves with the best capture.  
- Visual board with pits, stones, pit numbers, and kazans.  
- Move history panel with detailed log of each move.  
- Optional sound effects for sowing and capturing.  
- Splash screen with Start Game button.  
- Settings panel (sound on/off, rules summary).  
- Responsive layout for different screen sizes.

---

## Technologies Used

- HTML5  
- CSS3  
- Vanilla JavaScript (ES6)  
- Git and GitHub  
- GitHub Pages

---

## How to Play Online

1. Open: https://zadran-s-auca-2022.github.io/ToguzKorgoolProject/  
2. Click “Start Game”.  
3. Click a bottom pit (1–9) to make a move.  
4. Use “New Game vs Computer” to restart.

---

## How to Run the Project Locally

1. Clone the repository:

       git clone https://github.com/zadran-s-auca-2022/ToguzKorgoolProject.git

2. Go into the folder:

       cd ToguzKorgoolProject

3. Open `index.html` in a browser:

   - Double-click `index.html` in your file manager, or  
   - From the terminal:

         start index.html

No extra tools or servers are required.

---

## Project Structure

    ToguzKorgoolProject/
    ├── index.html   # Main webpage and layout
    ├── style.css    # Styling and board design
    ├── game.js      # Game logic, AI, move history, tuz rule, settings, sounds
    └── README.md    # Project documentation

---

## Possible Future Work

- 3D environment
- Multi-language interface (Kyrgyz, Russian, English).

---

## Author

Saima Zadran  
Senior Project – Software Engineering Program  
American University of Central Asia
