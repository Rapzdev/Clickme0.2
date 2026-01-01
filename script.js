// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAXQiftlIzLeoizjJ4Y-UgpKUbK5SmuUUE",
    authDomain: "clicknow-questme.firebaseapp.com",
    projectId: "clicknow-questme",
    storageBucket: "clicknow-questme.firebasestorage.app",
    messagingSenderId: "1074756983426",
    appId: "1:1074756983426:web:f501cccd16ab86f9def29b",
    measurementId: "G-K6ZRMZJRM4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userLocation = null;
let currentScore = 0;
let totalClicks = 0;
let clickTimes = [];
let isAdmin = false;
let currentTitle = '🆕 Newbie';
let isWarningShown = false;
let suspiciousClickCount = 0;

// Title System dengan lebih banyak title
const TITLES = [
    { name: '🆕 Newbie', minScore: 0, emoji: '🆕' },
    { name: '🥉 Bronze Clicker', minScore: 100, emoji: '🥉' },
    { name: '🥈 Silver Clicker', minScore: 500, emoji: '🥈' },
    { name: '🥇 Gold Clicker', minScore: 1000, emoji: '🥇' },
    { name: '💎 Diamond Clicker', minScore: 2500, emoji: '💎' },
    { name: '⚔️ Gold Slayer', minScore: 5000, emoji: '⚔️' },
    { name: '🔥 Legendary Slayer', minScore: 10000, emoji: '🔥' },
    { name: '🌟 Master Clicker', minScore: 25000, emoji: '🌟' },
    { name: '👑 King of Clicks', minScore: 50000, emoji: '👑' },
    { name: '🚀 Cosmic Clicker', minScore: 100000, emoji: '🚀' },
    { name: '⚡ God of Clicks', minScore: 250000, emoji: '⚡' },
    { name: '🏆 Ultimate Champion', minScore: 500000, emoji: '🏆' },
    { name: '👹 Administration', minScore: 0, emoji: '👹', isAdmin: true }
];

// Get Title based on score
function getTitleForScore(score, isAdminUser = false) {
    if (isAdminUser) {
        return TITLES.find(t => t.isAdmin) || TITLES[0];
    }
    
    const validTitles = TITLES.filter(t => !t.isAdmin && score >= t.minScore);
    return validTitles[validTitles.length - 1] || TITLES[0];
}

// Get Next Title
function getNextTitle(currentScore) {
    const nonAdminTitles = TITLES.filter(t => !t.isAdmin);
    for (let title of nonAdminTitles) {
        if (currentScore < title.minScore) {
            return title;
        }
    }
    return nonAdminTitles[nonAdminTitles.length - 1];
}

// Update Title Display
function updateTitleDisplay(score, isAdminUser = false) {
    const title = getTitleForScore(score, isAdminUser);
    const userTitleEl = document.getElementById('userTitle');
    
    if (userTitleEl) {
        userTitleEl.textContent = title.name;
    }
    
    // Update progress bar
    if (!isAdminUser) {
        const nextTitle = getNextTitle(score);
        const nextTitleNameEl = document.getElementById('nextTitleName');
        const nextTitleProgressEl = document.getElementById('nextTitleProgress');
        const progressFillEl = document.getElementById('progressFill');
        
        if (nextTitle && score < nextTitle.minScore) {
            const progress = score;
            const target = nextTitle.minScore;
            const percentage = (progress / target) * 100;
            
            if (nextTitleNameEl) nextTitleNameEl.textContent = `Next: ${nextTitle.name}`;
            if (nextTitleProgressEl) nextTitleProgressEl.textContent = `${progress}/${target}`;
            if (progressFillEl) progressFillEl.style.width = `${percentage}%`;
        } else {
            if (nextTitleNameEl) nextTitleNameEl.textContent = `Max Title Reached!`;
            if (nextTitleProgressEl) nextTitleProgressEl.textContent = `${score}`;
            if (progressFillEl) progressFillEl.style.width = `100%`;
        }
    }
    
    return title;
}

// Show Title Notification
function showTitleNotification(title) {
    const notification = document.getElementById('titleNotification');
    const titleNameEl = document.getElementById('notificationTitleName');
    
    if (notification && titleNameEl) {
        titleNameEl.textContent = title.name;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}

// Anti-Cheat System
function checkForAutoClicker() {
    const now = Date.now();
    const recentClicks = clickTimes.filter(time => now - time < 1000);
    
    // If more than 15 clicks per second, likely auto-clicker
    if (recentClicks.length > 15) {
        suspiciousClickCount++;
        showCheatWarning();
        return true;
    }
    
    // Check for perfect intervals (bot behavior)
    if (recentClicks.length >= 5) {
        const intervals = [];
        for (let i = 1; i < recentClicks.length; i++) {
            intervals.push(recentClicks[i] - recentClicks[i - 1]);
        }
        
        // If all intervals are exactly the same, it's a bot
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const allSame = intervals.every(interval => Math.abs(interval - avgInterval) < 5);
        
        if (allSame) {
            suspiciousClickCount++;
            showCheatWarning();
            return true;
        }
    }
    
    return false;
}

function showCheatWarning() {
    if (isWarningShown) return;
    
    const warning = document.getElementById('cheatWarning');
    const legitStatus = document.getElementById('legitStatus');
    
    if (warning) {
        warning.classList.add('show');
        isWarningShown = true;
        
        setTimeout(() => {
            warning.classList.remove('show');
            isWarningShown = false;
        }, 2000);
    }
    
    if (legitStatus && suspiciousClickCount > 3) {
        legitStatus.textContent = 'Suspicious';
        legitStatus.style.color = '#ff6b6b';
    }
}

// Get country from coordinates
async function getCountryFromCoords(lat, lon) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const data = await response.json();
        return data.countryName || 'Unknown';
    } catch (error) {
        console.error('Error getting country:', error);
        return 'Unknown';
    }
}

// Request Location
window.requestLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const country = await getCountryFromCoords(position.coords.latitude, position.coords.longitude);
                userLocation = country;
                register();
            },
            (error) => {
                showError('❌ Lokasi diperlukan untuk pendaftaran!');
            }
        );
    } else {
        showError('❌ Browser tidak menyokong geolocation');
    }
};

// Show/Hide Forms
window.showLogin = function() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
    document.getElementById('authError').textContent = '';
};

window.showRegister = function() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.add('active');
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('authError').textContent = '';
};

// Register - TAK UBAH DATA LAMA
async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!username || !password) {
        showError('❌ Sila isi semua medan');
        return;
    }

    if (!userLocation) {
        showError('❌ Sila benarkan lokasi');
        return;
    }

    try {
        const email = `${username.toLowerCase()}@goldenclicker.game`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Check if user already exists
        const existingDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (!existingDoc.exists()) {
            // Only create new user if doesn't exist
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                username: username,
                country: userLocation,
                score: 0,
                title: TITLES[0].name,
                isOnline: true,
                lastActive: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
        }

        showError('');
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showError('❌ Username sudah digunakan');
        } else if (error.code === 'auth/weak-password') {
            showError('❌ Password terlalu lemah (minimum 6 karakter)');
        } else {
            showError('❌ Ralat: ' + error.message);
        }
    }
}

// Login
window.login = async function() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showError('❌ Sila isi semua medan');
        return;
    }

    try {
        const email = `${username.toLowerCase()}@goldenclicker.game`;
        await signInWithEmailAndPassword(auth, email, password);
        showError('');
    } catch (error) {
        showError('❌ Username atau password salah');
    }
};

// Logout
window.logout = async function() {
    if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            isOnline: false,
            lastActive: new Date().toISOString()
        });
    }
    await signOut(auth);
    window.location.href = 'index.html';
};

// Show Error
function showError(message) {
    document.getElementById('authError').textContent = message;
}

// Show Page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// Animate click counter
function animateClickCounter() {
    const counter = document.getElementById('clickCounter');
    if (!counter) return;
    
    counter.style.animation = 'none';
    setTimeout(() => {
        counter.style.animation = 'floatUp 0.8s ease-out';
    }, 10);
}

// Add animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-100px) scale(1.5);
        }
    }
`;
document.head.appendChild(style);

// Increment Score
window.incrementScore = async function() {
    if (!currentUser) return;

    // Anti-cheat check
    if (checkForAutoClicker()) {
        return; // Block the click if suspicious
    }

    const oldTitle = getTitleForScore(currentScore, isAdmin);
    
    currentScore++;
    totalClicks++;
    
    // Update UI
    const scoreElement = document.getElementById('scoreValue');
    if (scoreElement) {
        scoreElement.textContent = currentScore;
    }
    
    const totalClicksElement = document.getElementById('totalClicks');
    if (totalClicksElement) {
        totalClicksElement.textContent = totalClicks;
    }

    // Check for new title
    const newTitle = updateTitleDisplay(currentScore, isAdmin);
    if (newTitle.name !== oldTitle.name && !isAdmin) {
        showTitleNotification(newTitle);
        currentTitle = newTitle.name;
        
        // Update title in Firebase
        await updateDoc(doc(db, 'users', currentUser.uid), {
            title: currentTitle
        });
    }

    // Animate
    animateClickCounter();

    // Track click times for anti-cheat and CPS
    const now = Date.now();
    clickTimes.push(now);
    clickTimes = clickTimes.filter(time => now - time < 1000);
    
    const cps = clickTimes.length;
    const cpsElement = document.getElementById('clicksPerSec');
    if (cpsElement) {
        cpsElement.textContent = cps;
    }

    // Update Firebase (throttled to every 5 clicks)
    if (currentScore % 5 === 0) {
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                score: currentScore,
                lastActive: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating score:', error);
        }
    }
};

// Update user rank
async function updateUserRank() {
    if (!currentUser) return;
    
    const rankElement = document.getElementById('userRank');
    if (!rankElement) return;

    try {
        const q = query(collection(db, 'users'), orderBy('score', 'desc'));
        const snapshot = await getDocs(q);
        
        let rank = 1;
        snapshot.forEach((docSnap) => {
            if (docSnap.id === currentUser.uid) {
                rankElement.textContent = `Ranking: #${rank}`;
                return;
            }
            rank++;
        });
    } catch (error) {
        console.error('Error getting rank:', error);
    }
}

// Go to admin page
window.goToAdmin = function() {
    window.location.href = 'admin.html';
};

// Load Admin Panel
async function loadAdminPanel() {
    const playersSnapshot = await getDocs(collection(db, 'users'));
    const players = [];
    let onlineCount = 0;
    let highestScore = 0;

    playersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        players.push({ id: docSnap.id, ...data });
        
        if (data.isOnline) onlineCount++;
        if (data.score > highestScore) highestScore = data.score;
    });

    const totalElement = document.getElementById('totalPlayers');
    const onlineElement = document.getElementById('onlinePlayers');
    const highestElement = document.getElementById('highestScore');

    if (totalElement) totalElement.textContent = players.length;
    if (onlineElement) onlineElement.textContent = onlineCount;
    if (highestElement) highestElement.textContent = highestScore;

    const tbody = document.getElementById('playersTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        players.sort((a, b) => b.score - a.score);

        players.forEach(player => {
            const row = document.createElement('tr');
            const lastActive = new Date(player.lastActive);
            const formattedDate = lastActive.toLocaleString('ms-MY');
            const playerTitle = player.title || getTitleForScore(player.score || 0, player.username?.toLowerCase() === 'rapzz').name;
            
            row.innerHTML = `
                <td>
                    <strong>${player.username}</strong><br>
                    <small style="color: var(--gold-dark);">${playerTitle}</small>
                </td>
                <td>📍 ${player.country}</td>
                <td><strong style="color: var(--gold-primary)">${player.score || 0}</strong></td>
                <td><span class="status-badge ${player.isOnline ? 'status-online' : 'status-offline'}">
                    ${player.isOnline ? '🟢 Online' : '🔴 Offline'}
                </span></td>
                <td>${formattedDate}</td>
            `;
            tbody.appendChild(row);
        });
    }

    onSnapshot(collection(db, 'users'), () => {
        loadAdminPanel();
    });
}

// Load Leaderboard - MODERN STYLE
async function loadLeaderboard() {
    const topThreeContainer = document.querySelector('.top-three');
    const leaderboardBody = document.getElementById('leaderboardBody');
    
    if (!topThreeContainer && !leaderboardBody) return;

    const q = query(collection(db, 'users'), orderBy('score', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        const players = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const playerTitle = data.title || getTitleForScore(data.score || 0, data.username?.toLowerCase() === 'rapzz').name;
            players.push({ id: docSnap.id, ...data, displayTitle: playerTitle });
        });

        // Top 3 Podium
        if (topThreeContainer) {
            topThreeContainer.innerHTML = '';
            
            const medals = ['🥇', '🥈', '🥉'];
            const positions = ['first', 'second', 'third'];
            
            for (let i = 0; i < Math.min(3, players.length); i++) {
                const player = players[i];
                const podium = document.createElement('div');
                podium.className = `podium ${positions[i]}`;
                podium.innerHTML = `
                    <div class="medal">${medals[i]}</div>
                    <div class="podium-name">${player.username}</div>
                    <div class="podium-title">${player.displayTitle}</div>
                    <div class="podium-country">📍 ${player.country}</div>
                    <div class="podium-score">${player.score || 0}</div>
                `;
                topThreeContainer.appendChild(podium);
            }
        }

        // Modern Leaderboard List
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '';
            
            players.forEach((player, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-modern-item';
                
                if (currentUser && player.id === currentUser.uid) {
                    item.classList.add('current-user');
                }

                const rank = index + 1;
                const rankDisplay = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}`;
                
                item.innerHTML = `
                    <div class="modern-item-header">
                        <div class="modern-rank-name">
                            <div class="modern-rank">${rankDisplay}</div>
                            <div>
                                <div class="modern-name">${player.username}</div>
                            </div>
                        </div>
                        <div class="modern-country">📍 ${player.country}</div>
                    </div>
                    <div class="modern-item-details">
                        <div class="modern-title-row">
                            <span class="modern-title-label">Title:</span>
                            <span class="modern-title-value">${player.displayTitle}</span>
                        </div>
                        <div class="modern-gold-row">
                            <span class="modern-gold-label">Gold:</span>
                            <span class="modern-gold-value">${player.score || 0}</span>
                        </div>
                    </div>
                `;
                
                leaderboardBody.appendChild(item);
            });
        }
    });
}

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    const currentPage = window.location.pathname;
    
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentScore = userData.score || 0;
            isAdmin = userData.username.toLowerCase() === 'rapzz';
            currentTitle = userD
