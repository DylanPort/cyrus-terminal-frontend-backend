Cyrus Prebond Terminal is a token launch and fundraising platform built on Solana.
It enables project creators to create a new token, raise SOL funding, and migrate to a live token once the funding goal is reached. Users can commit SOL to support tokens, upvote them, and receive refunds if the token fails to reach its target.

Features
Create Prebond Token

Upload a token image (base64), name, symbol, and description (up to 200 words).
Optionally commit some SOL (e.g., 0.25 or 0.5) immediately upon creation.
All Tokens Listing

See every token in a scrollable list, including image, description, links, upvote count, comments, and current commit progress toward the SOL target.
Hover or click on a token to view more details.
Commit & Refund

Users can commit SOL to a token’s raise at any time, as long as it hasn’t reached the target.
If the token does not reach the target in time, contributors can get a refund (minus a small fee).
Upvotes & Comments

Users can upvote a token to increase its popularity.
Each token has a comment section with nested replies.
Migrated Tokens

Once the SOL target is reached, the token is considered “migrated,” and backers can transfer their tokens (mock or actual Solana SPL logic).
Trending Tokens

A sidebar shows the top 5 tokens by upvote count.
Referral System

Users can generate a unique referral link and share it to earn “Cyrus Points” for each new user they bring to the platform.
AI Agent Management (Optional)

Users can create an AI agent (like a chatbot or assistant) that can be started/stopped and has logs.
This is a side feature demonstrating integration with AI or automated scripts.
Tech Stack
Front End

HTML/CSS/JS with a neon/cyberpunk theme
Uses Fetch API calls to communicate with the Node/Express server.
Phantom Wallet integration for Connect Wallet.
Back End

Node.js & Express
Saves data in db.json (JSON-based storage) or a real database if desired.
Manages routes for token creation, upvotes, commits, refunds, and AI agent endpoints.
Solana/Wallet

Integration with Phantom or other Solana wallets for committing SOL.
Actual transfer logic can be mocked or replaced with real Solana on-chain calls.
Installation & Setup
Clone this Repository

bash
Copy code
git clone https://github.com/YourUser/cyrus-prebondterminal.git
cd cyrus-prebondterminal
Install Dependencies

bash
Copy code
npm install
Run the Server

By default, server runs on PORT=3000 (or whatever’s in .env):
bash
Copy code
npm start
The server will load db.json (if exists) and serve the front end from the public/ folder.
Open in Browser

Visit http://localhost:3000 to view the front end.
Connect Phantom Wallet or use the site’s functionality.
Usage
Create a Token

On the left panel, fill in Token Name, Symbol, Image, optional links, and description.
Click Create Token to save it to the platform.
Commit SOL

After creating or browsing a token, press Commit to stake some SOL.
If you’re not connected to a wallet, the site will prompt you to connect Phantom.
Refund

If a token hasn’t reached its target, your committed SOL can be refunded.
Click Refund on that token’s card to get your partial or full funds back.
Upvote & Comment

Upvote your favorite tokens to help them appear in Trending.
Click on a token to open the modal with comments and nested replies.
Migrate

Once a token hits its target (collectiveSOL >= solTarget), it’s automatically flagged as migrated.
Users may see a Transfer button to move actual tokens on-chain (if fully implemented).
Referral & AI Agents (Optional)

Generate a referral link in Show Referral.
Create AI Agent to manage an agent that can log activities in the background.
Directory Structure
php
Copy code
cyrus-prebondterminal/
├── public/
│   ├── index.html      # The main front-end code
│   ├── css, images, etc.
│   └── (any other assets)
├── server.js           # Express server logic
├── db.json             # JSON-based storage for tokens/agents
├── package.json
├── README.md           # This file
└── ...
Contributing
Fork the project.
Create a feature branch.
Commit your changes.
Open a Pull Request explaining your additions/changes.
License
This project is licensed under the MIT License, so you’re free to use, modify, and distribute it
