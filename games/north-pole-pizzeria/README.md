# North Pole Pizzeria

Original Christmas cooking and shop-management mini-game for GameBox. Inspired by the *genre and cooking loop* of Good Pizza, Great Pizza; no artwork, characters, wording, or code from that commercial game is copied.

## Play
Visit [North Pole Pizzeria](https://chipbutt.github.io/GameBox/north-pole-pizzeria/) or open the Christmas GameBox section.

- Read each visitor's full pizza order and watch their patience.
- **Select Tomato sauce or Mozzarella**, then **drag your finger or mouse across the pizza** to spread the sauce or sprinkle cheese exactly where you want it. Selecting the ingredient alone adds nothing; a single dab only covers a small patch. The customer's rating reflects how well you cover the base. Do not paint an ingredient if the order asks you to leave it off. Each drag is one undoable action.
- Choose other toppings, then tap individual pieces onto the pizza. Aim for **six pieces** of each requested ingredient on whole pizzas, or **three** on the specified half. Incorrect toppings, wasted ingredients and incorrect half placement reduce quality and profit.
- Bake in the animated wood-fired oven. A standard pizza should be pulled at about **72–110%**; extra-crispy requests need **104–148%**.
- Cut pizzas with the **CUT PIZZA** button: two, three or four cuts for four, six or eight slices.
- Serve, see the score, tips, costs and profit, and take the next order. Every day has four customers.
- Spend earnings after each day on a **faster oven, longer customer patience, or higher tips**.
- New ingredients become available over the first four days. The shop's cash, upgrades, and day are saved locally in the browser.

## Artwork

The kitchen, pizza, cheese, dough, toppings, customers, oven, greeting card and interface are original Canvas, SVG and CSS illustrations, generated without external image CDNs. The GameBox menu illustration additionally reuses the local Kenney Christmas present asset (`assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_red.png`). All game artwork renders without downloading proprietary source-game assets.

## Code
- `engine.mjs`: deterministic order generation, availability, ingredient costs, scoring, equipment, customer timer
- `game.mjs`: UI, procedural food illustration, oven, touch interactions, save/resume
- `index.html`, `style.css`: responsive mobile-first Christmas restaurant
- `engine.test.mjs`, `browser-smoke.cjs`: unit tests and real Chrome tests
- `.github/workflows/north-pole-pizzeria.yml`: CI against mobile 390×844, 360×740 and desktop 1280×900

No build step, databases, paid APIs or third-party runtime libraries are required. Shop progress is stored on the device and is never uploaded.
