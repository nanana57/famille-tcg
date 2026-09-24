/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (Édition Sécurisée)
   =========================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyB7zw74kk9Xp1gF3OFpwnG1bJ3935yZMJY",
    authDomain: "famille-tcg.firebaseapp.com",
    databaseURL: "https://famille-tcg-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "famille-tcg",
    storageBucket: "famille-tcg.firebasestorage.app",
    messagingSenderId: "258877697356",
    appId: "1:258877697356:web:534d00175517add7f4b3e9"
};

let fbDB = null;
let monId = null;
let monPseudo = null;
window.multiPartie = null;
let monRole = null;
let dejaLancee = false;

function normaliserPseudo(p) { return (p || 'anonyme').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').slice(0, 20); }

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            fbDB = firebase.database();
            firebase.auth().onAuthStateChanged(user => { if (user) { monId = user.uid; initApresAuth(user); } });
        }
    } catch(e) { console.error("Firebase bloqué par le navigateur."); }
});

function toggleAuthMode(mode) {
    document.getElementById('box-login').classList.toggle('hidden', mode === 'register');
    document.getElementById('box-register').classList.toggle('hidden', mode !== 'register');
}

function lancerModeHorsLigne(pseudoForce, emailForce) {
    if (typeof J === 'undefined') { alert("Erreur critique : app.js n'a pas pu se charger (Cache agressif)."); return; }
    J.nom = pseudoForce || "Joueur_" + Math.floor(Math.random() * 1000);
    monPseudo = normaliserPseudo(J.nom);
    
    document.getElementById('display-pseudo').innerText = J.nom;
    document.getElementById('hero-name').innerText = J.nom;
    document.getElementById('main-nav').classList.remove('hidden');
    
    if (typeof chargerProgression === 'function') chargerProgression(emailForce);
    if (typeof changerEcran === 'function') changerEcran('menu-screen');
}

function connexionCompte() {
    const err = document.getElementById('auth-error-login');
    const ident = document.getElementById('auth-ident-login').value.trim();
    const pwd = document.getElementById('auth-password-login').value;
    err.innerText = "Connexion...";

    if(!ident || !pwd) { err.innerText = "Champs requis."; return; }
    if (typeof firebase === 'undefined') { lancerModeHorsLigne(ident, ident); return; }

    let timeout = setTimeout(() => lancerModeHorsLigne(ident, ident), 3000);

    if (ident.includes('@')) {
        firebase.auth().signInWithEmailAndPassword(ident, pwd).then(() => clearTimeout(timeout)).catch(e => { clearTimeout(timeout); err.innerText = "Erreur email/mdp."; });
    } else {
        if (fbDB) {
            fbDB.ref('pseudos_reserves/' + normaliserPseudo(ident)).once('value').then(snap => {
                if (snap.exists() && snap.val().email) {
                    firebase.auth().signInWithEmailAndPassword(snap.val().email, pwd).then(() => clearTimeout(timeout)).catch(e => { clearTimeout(timeout); err.innerText = "Erreur mot de passe."; });
                } else { clearTimeout(timeout); err.innerText = "Pseudo introuvable."; }
            }).catch(() => { clearTimeout(timeout); lancerModeHorsLigne(ident, null); });
        }
    }
}

function creerCompte() {
    const err = document.getElementById('auth-error-reg');
    const pseudo = document.getElementById('auth-pseudo-reg').value.trim();
    const email = document.getElementById('auth-email-reg').value.trim().toLowerCase();
    const pwd = document.getElementById('auth-password-reg').value;
    err.innerText = "Création...";

    if(!pseudo || !email || !pwd) { err.innerText = "Champs requis."; return; }
    if (pwd.length < 6) { err.innerText = "Mot de passe court."; return; }
    if (typeof firebase === 'undefined') { lancerModeHorsLigne(pseudo, email); return; }

    let timeout = setTimeout(() => lancerModeHorsLigne(pseudo, email), 3000);

    firebase.auth().createUserWithEmailAndPassword(email, pwd).then(creds => {
        clearTimeout(timeout);
        if(fbDB) {
            fbDB.ref('profils/' + creds.user.uid).set({ pseudo: pseudo, email: email }).catch(()=>{});
            fbDB.ref('pseudos_reserves/' + normaliserPseudo(pseudo)).set({ uid: creds.user.uid, email: email }).catch(()=>{});
        }
    }).catch(e => { clearTimeout(timeout); err.innerText = "Erreur : " + e.message; });
}

function initApresAuth(user) {
    if (user && user.email === 'nassim57132@gmail.com') document.getElementById('nav-admin').classList.remove('hidden');
    
    if(fbDB && user) {
        fbDB.ref('profils/' + user.uid).once('value').then(snap => {
            let p = snap.val();
            lancerModeHorsLigne((p && p.pseudo) ? p.pseudo : "Joueur", user.email);
            setupFirebaseListeners();
        }).catch(() => lancerModeHorsLigne("Joueur", user.email));
    } else { lancerModeHorsLigne("Joueur", user ? user.email : null); }
}

function setupFirebaseListeners() {
    fbDB.ref('joueurs/' + monId).set({ pseudo: J.nom, pseudoNorm: monPseudo, etat: 'libre', dernierPing: Date.now() });
    fbDB.ref('joueurs/' + monId).onDisconnect().remove();
}
