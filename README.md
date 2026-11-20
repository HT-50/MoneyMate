# MoneyMate

MoneyMate is a responsive personal finance and savings tracker built with vanilla HTML, CSS, and JavaScript, paired with Firebase Authentication and Realtime Database alongside `localStorage` caching[cite: 1, 4, 5].

## Features

- **Dashboard Overview:** Tracks total balance, income, and expenses at a glance, plus a 2-column goal progress section with percentage bars[cite: 3, 4].
- **Transaction Management:** Add, edit, and delete income and expense entries with green (`#16a34a`) and red (`#dc2626`) amount styling[cite: 4, 5].
- **Savings Goals:** Create goals with target and saved amounts, view progress in a structured table, increment saved amounts quickly with **+ Add Saved**, or edit and delete goals[cite: 2, 5].
- **Account & Persistence:** Supports user authentication, avatar customization, local caching via `localStorage`, and cloud sync with Firebase[cite: 1, 5].
- **Responsive Layout:** Adapts from desktop screens down to compact mobile viewports[cite: 4].

## Tech Stack

- **Frontend:** HTML5, CSS3 (`Inter` font), Vanilla JavaScript[cite: 4, 5]
- **Backend / Cloud:** Firebase Authentication & Firebase Realtime Database[cite: 1, 2, 3, 5]
- **Browser Storage:** `localStorage` and `sessionStorage`[cite: 1, 5]

## Project Structure

```text
├── CSS/
│   └── Style.css
├── Javascript/
│   ├── Auth.js
│   ├── Firebase.js
│   └── Script.js
├── Image/
│   ├── Default-user.jpg
│   ├── Gear-Icon.png
│   └── Icon.svg
└── HTML/
    ├── index.html
    ├── Transaction.html
    ├── Goals.html
    └── Abouts.html
