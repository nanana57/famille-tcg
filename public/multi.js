/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (version compat)
   =========================================================== */

// ⚠️ Remplace databaseURL par celle de TON projet (Étape 2)
const firebaseConfig = {
    apiKey: "AIzaSyB7zw74kk9Xp1gF3OFpwnG1bJ3935yZMJY",
    authDomain: "famille-tcg.firebaseapp.com",
    databaseURL: "https://famille-tcg-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "famille-tcg",
    storageBucket: "famille-tcg.firebasestorage.app",
    messagingSenderId: "258877697356",
    appId: "1:258877697356:web:534d00175517add7f4b3e9",
    measurementId: "G-ZBBL3J9HYJ"
};

let fbDB = null;
let fbUserRef = null;
let fbJoueursRef = null;
let monId = null;
window.multiPartie = null;

/* ---------- Initialisation ---------- */
function initFirebase() {
    if (typeof firebase === 'undefined') {
        const info = document.getElementById('multi-info');
        if (info) info.innerText =
            'Firebase non chargé. Vérifie les scripts dans index.html.';
        console.error('[Firebase] SDK non chargé.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    fbDB = firebase.database();

    if (!firebaseConfig.databaseURL) {
        console.error('[Firebase] databaseURL manquant dans firebaseConfig !');
        const info = document.getElementById('multi-info');
        if (info) info.innerText =
            'Config Firebase incomplète : databaseURL manquant.';
        return;
    }

    monId = 'j_' + Math.random().toString(36).slice(2, 10);
    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');

    // Présence : on se retire automatiquement à la déconnexion
    fbUserRef.onDisconnect().remove();
    fbUserRef.set({
        pseudo: (J.nom || 'Anonyme'),
        etat: 'libre',
        dernierPing: Date.now()
    });

    // Liste des joueurs en temps réel
    fbJoueursRef.on('value', snap => {
        const data = snap.val() || {};
        afficherListeJoueurs(data);
    });

    // Défis entrants
    fbDB.ref('defis/' + monId).on('value', snap => {
        const defi = snap.val();
        if (defi && defi.de && defi.etat === 'en_attente') {
            afficherDefiRecu(defi);
        }
    });

    // Suivi de la partie
    fbDB.ref('parties/' + monId).on('value', snap => {
        const p = snap.val();
        if (!p) return;

        if (p.etat === 'en_cours' && p.adversaire) {
            lancerPartieEnLigne(p);
        }
        if (p.etat === 'forfait' && p.forfaitPar !== monId) {
            if (!partieFinie) {
                partieFinie = true;
                clearInterval(timer);
                enregistrerResultat(true);
                banniere('Victoire par forfait !');
                setTimeout(() => {
                    const bf = document.getElementById('btn-forfait');
                    if (bf) bf.hidden = true;
                    changerEcran('menu-screen');
                }, 2200);
            }
        }
    });

    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Connecté à Firebase — tu es visible dans la liste.';
}

/* ---------- Liste des joueurs ---------- */
function rafraichirJoueurs() {
    if (!fbDB) {
        initFirebase();
        return;
    }
    // La liste se met à jour automatiquement via l'écouteur 'value'
    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Liste à jour.';
}

function afficherListeJoueurs(data) {
    const liste = document.getElementById('multi-liste');
    const count = document.getElementById('multi-count');
    const combatCount = document.getElementById('multi-combat-count');
    if (!liste) return;

    const joueurs = Object.entries(data).filter(([id]) => id !== monId);
    let enCombat = 0;
    liste.innerHTML = '';

    if (joueurs.length === 0) {
        liste.innerHTML = '<p class="hint">Aucun autre joueur connecté pour le moment.</p>';
    }

    joueurs.forEach(([id, j]) => {
        if (j.etat === 'en_combat') enCombat++;
        const div = document.createElement('div');
        div.className = 'multi-joueur';
        const libre = j.etat === 'libre';
        div.innerHTML = `
            <div>
                <div class="mj-nom">${j.pseudo || 'Anonyme'}</div>
                <div class="mj-etat ${libre ? 'libre' : 'en-combat'}">
                    ${libre ? '● Disponible' : '⚔ En combat'}
                </div>
            </div>
            <button ${libre ? '' : 'disabled'} onclick="defierJoueur('${id}')">
                ${libre ? 'Défier' : 'Occupé'}
            </button>
        `;
        liste.appendChild(div);
    });

    if (count) count.innerText = `${joueurs.length} joueur(s) connecté(s)`;
    if (combatCount) combatCount.innerText = `${enCombat} en combat`;
}

/* ---------- Défi ---------- */
function defierJoueur(adversaireId) {
    if (!fbDB || !monId) return;
    fbDB.ref('defis/' + adversaireId).set({
        de: monId,
        dePseudo: J.nom || 'Anonyme',
        etat: 'en_attente',
        timestamp: Date.now()
    });
    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Défi envoyé… en attente de réponse.';
}

let defiEnCours = null;
function afficherDefiRecu(defi) {
    defiEnCours = defi;
    const texte = document.getElementById('defi-texte');
    if (texte) texte.innerText = `${defi.dePseudo} te défie en duel !`;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.add('open');
}

function accepterDefi() {
    if (!defiEnCours) return;
    const adversaireId = defiEnCours.de;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');

    const partieId = [monId, adversaireId].sort().join('_');
    const refPartie = fbDB.ref('parties/' + partieId);

    refPartie.set({
        joueur1: monId,
        joueur2: adversaireId,
        etat: 'en_cours',
        tour: 'joueur1',
        timestamp: Date.now()
    });

    fbDB.ref('parties/' + monId).set({ etat: 'en_cours', adversaire: adversaireId, partieId });
    fbDB.ref('parties/' + adversaireId).set({ etat: 'en_cours', adversaire: monId, partieId });

    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
    fbDB.ref('joueurs/' + adversaireId).update({ etat: 'en_combat' });

    fbDB.ref('defis/' + monId).remove();

    lancerPartieEnLigne({ adversaire: adversaireId, partieId });
}

function refuserDefi() {
    if (!defiEnCours) return;
    fbDB.ref('defis/' + monId).remove();
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    defiEnCours = null;
}

/* ---------- Lancement d'une partie en ligne ---------- */
function lancerPartieEnLigne(p) {
    window.multiPartie = {
        active: true,
        adversaireId: p.adversaire,
        partieId: p.partieId,
        refPartie: fbDB.ref('parties/' + p.partieId)
    };
    info('Partie en ligne — synchronisation en cours…');
}

/* ---------- Forfait en ligne ---------- */
function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    window.multiPartie.refPartie.update({
        etat: 'forfait',
        forfaitPar: monId,
        timestamp: Date.now()
    });
    fbDB.ref('joueurs/' + monId).update({ etat: 'libre' });
    fbDB.ref('joueurs/' + window.multiPartie.adversaireId).update({ etat: 'libre' });
    window.multiPartie.active = false;
}

/* ---------- Nettoyage à la fermeture ---------- */
window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});

/* ---------- Initialisation auto si app.js a déjà chargé ---------- */
// initFirebase() est appelé depuis connecter() dans app.js
// (déjà en place dans la version précédente d'app.js)