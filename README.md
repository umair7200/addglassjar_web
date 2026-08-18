# Glass Jar - Telegram Mini App (with Firebase SDK)

This version of the app uses the **Firebase JS SDK (NPM version)** for real-time data syncing and authentication.

## Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your computer.

### 2. Install Dependencies
Open your terminal in this folder and run:
```bash
npm install
```

### 3. Development
To run the app locally for testing:
```bash
npm run dev
```
It will give you a local URL (usually `http://localhost:5173`).

### 4. Build for Production
To generate the final files for hosting (GitHub Pages, Vercel, etc.):
```bash
npm run build
```
The output will be in a new `dist/` folder. **Upload the contents of `dist/` to your web server.**

### 5. Monetag Configuration
1. Create a **Direct Link** in your Monetag dashboard.
2. Open `app.js` and replace `"YOUR_DIRECT_LINK_URL_HERE"` with your link.
3. In `index.html`, replace `YOUR_ZONE_ID` with your Monetag zone ID.

### 6. Firebase Firestore Setup
Make sure you enable **Firestore** and **Anonymous Authentication** in your Firebase console:
1. Go to **Authentication** -> **Sign-in method** -> Enable **Anonymous**.
2. Go to **Firestore Database** -> **Rules** -> Allow reads/writes for authenticated users.

### 7. @BotFather
1. Use `/newapp` in @BotFather.
2. Use your HTTPS hosted URL.
3. Users will now have their balance and rewards synced across devices via Firebase!
