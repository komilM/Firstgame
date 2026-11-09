# First-person sword game

A React, Vite, and Three.js browser game. Walk across a grassy battlefield and
fight the red-team opponents with a sword.

## Run locally

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To create a production build, run
`npm run build`; run `npm run preview` to view that build locally.

## Controls

- **W A S D**: move
- **Mouse**: look around (click the game to capture the mouse)
- **Touchscreen**: drag on the game to look; tilt the left virtual stick to move at different speeds and use the right buttons to jump and attack/shoot
- **Space**: jump
- **Left mouse button**: attack with the selected weapon
- **1**: select sword; a close hit reduces enemy health
- **2** or **B**: select bow and shoot arrows; arrows damage enemies on contact
- Red-team opponents attack with their own bows and arrows.
- **Third-person mouse movement**: orbit all the way around the character
- **V** or the on-screen buttons: switch between first- and third-person view
- **Main menu**: choose Uzbek, Russian, or English; select the green field or desert arena; set 1–10 blue-team members (including the player) and 1–10 red-team opponents
- Blue teammates automatically help attack nearby opponents
- Press **Escape** to open the menu and adjust match settings
- **Escape**: release the mouse
