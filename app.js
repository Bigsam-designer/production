const firebaseConfig = {
    // Votre configuration Firebase ici
    // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDsr-meX8fr0PIHcpQQ3qUzJb3Q6KP8o4E",
  authDomain: "production-tempete.firebaseapp.com",
  databaseURL: "https://production-tempete-default-rtdb.firebaseio.com",
  projectId: "production-tempete",
  storageBucket: "production-tempete.firebasestorage.app",
  messagingSenderId: "1034574214388",
  appId: "1:1034574214388:web:9acdf1c06b7606a9f09aa1",
  measurementId: "G-P5FV4Q0W15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();
const messaging = firebase.messaging();

// Écouteur pour l'état d'authentification
auth.onAuthStateChanged(user => {
    if (user) {
        document.querySelector('#loginBtn').style.display = 'none';
        document.querySelector('#logoutBtn').style.display = 'block';
        initializeUser(user.uid);
        setupNotifications();
    } else {
        document.querySelector('#loginBtn').style.display = 'block';
        document.querySelector('#logoutBtn').style.display = 'none';
        resetUI();
    }
});

// Initialise ou vérifie l'état utilisateur
function initializeUser(userId) {
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (!doc.exists) {
                showRegistrationForm();
            } else {
                setupDashboard(doc.data());
            }
        })
        .catch(error => handleError(error, 'Erreur lors de la vérification de l\'utilisateur'));
}

function showRegistrationForm() {
    document.getElementById('register').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

function setupDashboard(userData) {
    document.getElementById('register').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    updateUserStats(userData);
    fetchVideosToShare();
    updatePromotions(userData);
    updateLeaderboard();
    updateNotifications();
}

// Inscription avec validation avancée
document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = auth.currentUser;
    const userData = getFormData();
    if (validateUserData(userData)) {
        registerUser(user.uid, userData);
    }
});

function getFormData() {
    return {
        name: document.getElementById('name').value,
        surname: document.getElementById('surname').value,
        country: document.getElementById('country').value,
        city: document.getElementById('city').value,
        number: document.getElementById('number').value,
        description: document.getElementById('description').value,
        level: 1,
        points: 0,
        shares: 0,
        trophies: 0,
        followsOfficial: false
    };
}

function validateUserData(data) {
    if (data.description.length < 50) {
        alert('La description doit contenir au moins 50 mots.');
        return false;
    }
    if (!/^[a-zA-Z ]{2,50}$/.test(data.name)) {
        alert('Le nom doit contenir entre 2 et 50 lettres.');
        return false;
    }
    // Ajoutez plus de validations ici pour chaque champ...
    return true;
}

function registerUser(userId, userData) {
    db.runTransaction(transaction => {
        return transaction.get(db.collection('users').doc(userId))
            .then(doc => {
                if (!doc.exists) {
                    transaction.set(db.collection('users').doc(userId), userData);
                } else {
                    throw new Error('Utilisateur déjà enregistré.');
                }
            });
    }).then(() => {
        document.getElementById('register').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        fetchVideosToShare();
        updateUserStats(userData);
    }).catch(error => handleError(error, 'Erreur lors de l\'inscription'));
}

function fetchVideosToShare() {
    db.collection('videos').get()
        .then(snapshot => {
            let videosHTML = '';
            snapshot.forEach(doc => {
                videosHTML += `<div class="video-item"><i class="fas fa-video"></i><video src="${doc.data().url}" controls></video><button class="share-button" data-video-id="${doc.id}"><i class="fas fa-share-alt"></i> Partager</button></div>`;
            });
            document.getElementById('videosToShare').innerHTML = videosHTML;
            addShareEventListeners();
        })
        .catch(error => handleError(error, 'Erreur lors de la récupération des vidéos'));
}

function addShareEventListeners() {
    document.querySelectorAll('.share-button').forEach(button => {
        button.addEventListener('click', () => {
            shareVideo(button.getAttribute('data-video-id'));
        });
    });
}

function shareVideo(videoId) {
    // Logique de partage avec des APIs de réseaux sociaux ici
    // Cette partie est simulée pour l'exemple
    db.runTransaction(transaction => {
        return transaction.get(db.collection('users').doc(auth.currentUser.uid))
            .then(doc => {
                let newShares = doc.data().shares + 1;
                let newPoints = doc.data().points + 10; // Points pour chaque partage
                if (newPoints >= 100 * doc.data().level) {
                    newPoints -= 100 * doc.data().level;
                    newLevel = doc.data().level + 1;
                    transaction.update(doc.ref, { level: newLevel, points: newPoints, shares: newShares });
                } else {
                    transaction.update(doc.ref, { points: newPoints, shares: newShares });
                }
            });
    }).then(() => {
        updateUserStats();
        checkForPromotion();
        notifyShare();
    }).catch(error => handleError(error, 'Erreur lors du partage de la vidéo'));
}

function updateUserStats(userData = null) {
    db.collection('users').doc(auth.currentUser.uid).get()
        .then(doc => {
            const data = userData || doc.data();
            document.getElementById('userStats').innerHTML = `
                <i class="fas fa-user-cog"></i>
                <p>Niveau: ${data.level}</p>
                <p>Points: ${data.points}</p>
                <p>Partages: ${data.shares}</p>
                <p>Trophées: ${data.trophies}</p>
            `;
        })
        .catch(error => handleError(error, 'Erreur lors de la mise à jour des stats'));
}

function updatePromotions(userData) {
    const promotionsHTML = `
        <i class="fas fa-star"></i>
        <p id="currentPromotion">${userData.promotionTime ? 'Promotion actuelle: ' + userData.promotionTime : 'Aucune promotion'}</p>
        <p id="specialPromotion">${userData.specialPromotion ? 'Vous avez une promotion spéciale!' : ''}</p>
    `;
    document.getElementById('promotions').innerHTML = promotionsHTML;
}

function updateLeaderboard() {
    // Logique pour récupérer et afficher le leaderboard
    db.collection('users').orderBy('shares', 'desc').limit(10).get()
        .then(snapshot => {
            let leaderboardHTML = '';
            snapshot.forEach(userDoc => {
                const userData = userDoc.data();
                leaderboardHTML += `<li><i class="fas fa-trophy"></i> ${userData.name || 'Anonyme'} - Partages: ${userData.shares}</li>`;
            });
            document.getElementById('leaderboardList').innerHTML = leaderboardHTML;
        })
        .catch(error => handleError(error, 'Erreur lors de la mise à jour du leaderboard'));
}

function updateNotifications() {
    db.collection('notifications').where('userId', '==', auth.currentUser.uid).orderBy('createdAt', 'desc').limit(10).get()
        .then(snapshot => {
            let notificationsHTML = '';
            snapshot.forEach(doc => {
                const notification = doc.data();
                notificationsHTML += `<li><i class="fas fa-bell"></i> ${notification.message}</li>`;
            });
            document.getElementById('notificationList').innerHTML = notificationsHTML || '<li>Aucune notification pour le moment.</li>';
        })
        .catch(error => handleError(error, 'Erreur lors de la mise à jour des notifications'));
}

function setupNotifications() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            messaging.useServiceWorker(registration);
            messaging.getToken().then((currentToken) => {
                if (currentToken) {
                    // Envoyer le token au serveur pour les notifications push
                    console.log('Token de notification:', currentToken);
                    // Ici, vous pouvez stocker le token dans Firestore ou l'envoyer à votre serveur
                } else {
                    console.log('Aucun token de notification disponible.');
                }
            }).catch((err) => {
                console.log('Erreur lors de la récupération du token:', err);
            });

            messaging.onMessage((payload) => {
                console.log('Message reçu:', payload);
                // Affichage de la notification dans l'interface utilisateur
                const notification = payload.notification;
                const newNotification = document.createElement('li');
                newNotification.innerHTML = `<i class="fas fa-bell"></i> ${notification.title}: ${notification.body}`;
                document.getElementById('notificationList').prepend(newNotification);
            });
        }).catch(error => {
            console.error('Service worker registration failed:', error);
        });
    }
}

function checkForPromotion() {
    // Cette fonction pourrait être appelée par une fonction Cloud périodiquement
    db.collection('users').orderBy('shares', 'desc').limit(3).get()
        .then(snapshot => {
            let i = 1;
            const batch = db.batch();
            snapshot.forEach(userDoc => {
                const time = i === 1 ? '1 jour' : (i === 2 ? '2 heures' : '20 minutes');
                batch.update(userDoc.ref, {
                    promotionTime: time,
                    trophies: firebase.firestore.FieldValue.increment(1)
                });
                if (userDoc.data().trophies === 7) { // Si l'utilisateur a 7 trophées successifs
                    batch.update(userDoc.ref, { specialPromotion: true });
                    // Ici, vous pourriez ajouter une logique pour un cadeau spécial
                }
                i++;
            });
            return batch.commit();
        })
        .catch(error => handleError(error, 'Erreur lors de la vérification des promotions'));
}

function notifyShare() {
    // Exemple de notification push
    const payload = {
        notification: {
            title: 'Partage réussi!',
            body: 'Votre partage a été comptabilisé! Continuez!'
        }
    };
    messaging.send(payload);
}

function resetUI() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('register').style.display = 'none';
}

function handleError(error, message) {
    console.error(message, error);
    alert(`${message}: ${error.message}`);
}

// Logique pour l'enregistrement du service worker déjà incluse dans setupNotifications
