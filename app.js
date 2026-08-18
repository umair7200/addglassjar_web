import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const tg = window.Telegram.WebApp;

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAidLeWp03epau_JDEuZlcJve9Xzc8cnXk",
  authDomain: "addglassjarbot.firebaseapp.com",
  databaseURL: "https://addglassjarbot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "addglassjarbot",
  storageBucket: "addglassjarbot.firebasestorage.app",
  messagingSenderId: "20123164762",
  appId: "1:20123164762:web:8f71f6c808c4b0fdce7863",
  measurementId: "G-ZJ08CFLSM4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// --- APP CONFIGURATION ---
const ESTIMATED_REVENUE_PER_AD = 1.0;
const USER_REVENUE_SHARE = 0.30;
const REWARD_PER_AD = ESTIMATED_REVENUE_PER_AD * USER_REVENUE_SHARE;
const JAR_UNIT_VALUE = 0.01;
const MIN_WITHDRAWAL = 150.0;
const MAX_JAR_UNITS = 500;

// --- STATE ---
let state = {
    balance: 0.0,
    pending: 0,
    multiplier: 1,
    method: 'Easypaisa',
    uid: null
};

// --- ELEMENTS ---
const water = document.getElementById('water');
const pendingVal = document.getElementById('pending-val');
const pendingPkr = document.getElementById('pending-pkr');
const balanceVal = document.getElementById('balance-val');
const multiplierVal = document.getElementById('multiplier-val');
const withdrawalSection = document.getElementById('withdrawal-section');
const btnWithdraw = document.getElementById('btn-withdraw');

// --- INITIALIZATION ---
tg.expand();

async function initApp() {
    try {
        const userCred = await signInAnonymously(auth);
        state.uid = userCred.user.uid;

        const tgUser = tg.initDataUnsafe?.user;
        const docId = tgUser ? `tg_${tgUser.id}` : state.uid;

        await loadUserData(docId);
        startPassiveAccumulation(docId);
        updateUI();
        initInAppAds();
    } catch (e) {
        console.error("Firebase Auth Error", e);
        tg.showAlert("Login failed. Check internet.");
    }
}

async function loadUserData(docId) {
    const userRef = doc(db, "users", docId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        state.balance = data.balance || 0.0;
        state.pending = data.pendingRewards || 0;
        state.multiplier = data.multiplier || 1;
    } else {
        await setDoc(userRef, {
            balance: 0.0,
            pendingRewards: 0,
            multiplier: 1,
            lastActive: serverTimestamp()
        });
    }
}

function startPassiveAccumulation(docId) {
    setInterval(async () => {
        if (state.pending < MAX_JAR_UNITS) {
            state.pending = Math.min(state.pending + 2, MAX_JAR_UNITS);
            updateUI();
            const userRef = doc(db, "users", docId);
            await updateDoc(userRef, {
                pendingRewards: state.pending,
                lastActive: serverTimestamp()
            });
        }
    }, 30000);
}

function updateUI() {
    pendingVal.innerText = state.pending;
    const pkr = state.pending * JAR_UNIT_VALUE;
    pendingPkr.innerText = `Rs. ${pkr.toFixed(2)}`;
    balanceVal.innerText = `Rs. ${state.balance.toFixed(2)}`;
    multiplierVal.innerText = `x${state.multiplier}`;

    const fill = (state.pending / MAX_JAR_UNITS) * 100;
    water.style.height = `${fill}%`;

    if (state.balance > 0) {
        withdrawalSection.classList.remove('hidden');
    }

    const name = document.getElementById('payout-name').value;
    const acc = document.getElementById('payout-acc').value;
    btnWithdraw.disabled = state.balance < MIN_WITHDRAWAL || !name || !acc;
    btnWithdraw.innerText = `REQUEST Rs. ${state.balance.toFixed(2)}`;
}

// --- ACTIONS ---
document.getElementById('btn-claim').addEventListener('click', () => {
    tg.HapticFeedback.impactOccurred('medium');
    showAd(() => claim(1));
});

document.getElementById('btn-auto-5').addEventListener('click', () => {
    tg.showConfirm("Watch 5 ads for x5 multiplier?", (ok) => {
        if (ok) {
            let shown = 0;
            const loop = () => {
                showAd(() => {
                    shown++;
                    state.multiplier = shown;
                    updateUI();
                    if (shown < 5) {
                        loop();
                    } else {
                        claim(5);
                    }
                });
            };
            loop();
        }
    });
});

document.getElementById('btn-auto-10').addEventListener('click', () => {
    tg.showConfirm("Watch 10 ads for x10 multiplier?", (ok) => {
        if (ok) {
            let shown = 0;
            const loop = () => {
                showAd(() => {
                    shown++;
                    state.multiplier = shown;
                    updateUI();
                    if (shown < 10) {
                        loop();
                    } else {
                        claim(10);
                    }
                });
            };
            loop();
        }
    });
});

function showAd(callback) {
    if (typeof window.show_11602627 === 'function') {
        window.show_11602627().then(() => {
            tg.showAlert('You have seen an ad!');
            callback();
        }).catch((e) => {
            console.error("Ad error", e);
            tg.showAlert("Ad failed or was closed early.");
        });
    } else {
        tg.showAlert("Ad engine starting... please wait.");
    }
}

async function claim(adCount) {
    const jarReward = state.pending * JAR_UNIT_VALUE;
    const adReward = adCount * REWARD_PER_AD;
    const total = (jarReward + adReward) * state.multiplier;

    const tgUser = tg.initDataUnsafe?.user;
    const docId = tgUser ? `tg_${tgUser.id}` : state.uid;
    const userRef = doc(db, "users", docId);

    try {
        tg.HapticFeedback.notificationOccurred('success');
        await updateDoc(userRef, {
            balance: increment(total),
            pendingRewards: 0,
            multiplier: 1
        });

        state.balance += total;
        state.pending = 0;
        state.multiplier = 1;
        updateUI();
        tg.showAlert(`Claimed Rs. ${total.toFixed(2)}!`);
    } catch (e) {
        tg.showAlert("Claim failed. Please retry.");
    }
}

// --- WITHDRAWAL LOGIC ---
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        tg.HapticFeedback.selectionChanged();
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        state.method = e.target.dataset.method;
    });
});

document.getElementById('btn-withdraw').addEventListener('click', async () => {
    const name = document.getElementById('payout-name').value;
    const acc = document.getElementById('payout-acc').value;
    const amount = state.balance;

    try {
        tg.HapticFeedback.impactOccurred('heavy');
        await addDoc(collection(db, "withdrawals"), {
            uid: state.uid,
            tgId: tg.initDataUnsafe?.user?.id || null,
            name: name,
            amount: amount,
            method: state.method,
            account: acc,
            status: "PENDING",
            timestamp: serverTimestamp()
        });

        const emailBody = `Withdrawal Request:\nName: ${name}\nAmount: Rs. ${amount.toFixed(2)}\nMethod: ${state.method}\nAccount: ${acc}`;
        const mailto = `mailto:mockingjay1721@gmail.com?subject=Withdrawal&body=${encodeURIComponent(emailBody)}`;
        tg.openLink(mailto);

        tg.showConfirm("Request saved! After sending email, click OK to reset balance.", async (ok) => {
            if (ok) {
                const tgUser = tg.initDataUnsafe?.user;
                const docId = tgUser ? `tg_${tgUser.id}` : state.uid;
                await updateDoc(doc(db, "users", docId), { balance: 0 });
                state.balance = 0;
                updateUI();
            }
        });
    } catch (e) {
        tg.showAlert("Withdrawal request failed. Check connection.");
    }
});

document.getElementById('payout-name').addEventListener('input', updateUI);
document.getElementById('payout-acc').addEventListener('input', updateUI);

// Start the app
initApp();
initInAppAds();

function initInAppAds() {
    if (typeof window.show_11602627 === 'function') {
        window.show_11602627({
            type: 'inApp',
            inAppSettings: {
                frequency: 2,
                capping: 0.1,
                interval: 30,
                timeout: 5,
                everyPage: false
            }
        });
    } else {
        setTimeout(initInAppAds, 2000);
    }
}
