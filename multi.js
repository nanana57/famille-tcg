/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (state-sync)
   =========================================================== */

// ⚠️ Remplace databaseURL par celle de TON projet
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

// Rôle du joueur local dans la partie en ligne : 'joueur1' ou 'joueur2'
let monRole = null;
let refPartie = null;

/* ---------- Initialisation ---------- */
function initFirebase() {
    if (typeof firebase === 'undefined') {
        const info = document.getElementById('multi-info');
        if (info) info.innerText = 'Firebase non chargé.';
        console.error('[Firebase] SDK non chargé.');
        return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    fbDB = firebase.database();

    if (!firebaseConfig.databaseURL) {
        console.error('[Firebase] databaseURL manquant');
        return;
    }

    monId = 'j_' + Math.random().toString(36).slice(2, 10);
    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');

    fbUserRef.onDisconnect().remove();
    fbUserRef.set({
        pseudo: (J.nom || 'Anonyme'),
        etat: 'libre',
        dernierPing: Date.now()
    });

    // Liste des joueurs
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

    // Écoute de MES parties (pour savoir si un défi est accepté)
    fbDB.ref('parties/' + monId).on('value', snap => {
        const p = snap.val();
        if (!p) return;

        if (p.etat === 'en_cours' && p.adversaire && p.partieId) {
            // On attend l'état complet de la partie pour vraiment démarrer
            ecouterPartie(p.partieId, p.adversaire);
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
    if (!fbDB) { initFirebase(); return; }
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

    // ID de partie trié pour être identique des deux côtés
    const partieId = [monId, adversaireId].sort().join('_');
    refPartie = fbDB.ref('parties_data/' + partieId);

    // Rôle : celui dont l'ID est le plus petit est joueur1
    monRole = (monId < adversaireId) ? 'joueur1' : 'joueur2';

    // On notifie les deux joueurs via leur noeud personnel
    fbDB.ref('parties/' + monId).set({
        etat: 'en_cours',
        adversaire: adversaireId,
        partieId,
        role: monRole
    });
    fbDB.ref('parties/' + adversaireId).set({
        etat: 'en_cours',
        adversaire: monId,
        partieId,
        role: (monRole === 'joueur1') ? 'joueur2' : 'joueur1'
    });

    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
    fbDB.ref('joueurs/' + adversaireId).update({ etat: 'en_combat' });

    fbDB.ref('defis/' + monId).remove();

    // On lance directement la partie en local
    ecouterPartie(partieId, adversaireId);
}

function refuserDefi() {
    if (!defiEnCours) return;
    fbDB.ref('defis/' + monId).remove();
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    defiEnCours = null;
}

/* ---------- Lancement réel d'une partie en ligne ---------- */

// Écoute l'état partagé de la partie et lance dès que les deux sont prêts
function ecouterPartie(partieId, adversaireId) {
    if (window.multiPartie && window.multiPartie.active) return; // déjà en cours

    refPartie = fbDB.ref('parties_data/' + partieId);

    // On marque notre présence
    const dejaLa = refPartie.child('joueurs');
    refPartie.child('presence/' + monId).set(true);
    refPartie.child('presence/' + monId).onDisconnect().remove();

    // Attente que les deux soient présents
    refPartie.child('presence').on('value', snap => {
        const p = snap.val() || {};
        const ids = Object.keys(p);
        if (ids.length >= 2 && (!window.multiPartie || !window.multiPartie.active)) {
            demarrerPartieEnLigne(partieId, adversaireId);
        }
    });

    // Écoute des mises à jour de l'état pour synchroniser
    refPartie.child('etat').on('value', snap => {
        const etat = snap.val();
        if (!etat || !window.multiPartie || !window.multiPartie.active) return;
        // L'adversaire a joué : on applique son état
        if (etat.par !== monId) {
            appliquerEtatAdverse(etat);
        }
    });
}

function demarrerPartieEnLigne(partieId, adversaireId) {
    window.multiPartie = {
        active: true,
        adversaireId,
        partieId,
        refPartie
    };

    // Pseudo de l'adversaire pour l'affichage
    fbDB.ref('joueurs/' + adversaireId).once('value').then(snap => {
        const j = snap.val() || {};
        const pseudo = j.pseudo || 'Adversaire';
        lancerPartieMultijoueur(pseudo);
    });

    info('Partie en ligne lancée !');
}

// Prépare un deck aléatoire (ou celui sélectionné)
function piocherDeckEnLigne() {
    // Utilise le deck choisi dans le menu ; à défaut, un deck préconstruit
    const sel = document.getElementById('deck-select');
    const idx = sel ? parseInt(sel.value) : 0;
    if (mesDecks[idx] && mesDecks[idx].cartes.length === 20) {
        return mesDecks[idx].cartes.slice();
    }
    return hasard(decksPreconstruits).cartes.slice();
}

/* ---------- Synchronisation d'état ---------- */
function serialiserCote(side) {
    return {
        patience: side.patience,
        manaActuel: side.manaActuel,
        manaMax: side.manaMax,
        numTour: side.numTour,
        deckIds: side.deck.map(c => c.id),
        main: side.main.map(c => ({ id:c.id, uid:c.uid })),
        plateau: side.plateau.map(m => ({
            id:m.id, uid:m.uid, prenom:m.prenom, emoji:m.emoji,
            atk:m.atk, vie:m.vie, vieMax:m.vieMax,
            auraAtk:m.auraAtk, auraVieAppliquee:m.auraVieAppliquee,
            motsCles:m.motsCles, aAttaque:m.aAttaque, malade:m.malade,
            gele:m.gele, silence:m.silence, jeton:m.jeton
        })),
        terrain: side.terrain ? { id:side.terrain.id, uid:side.terrain.uid } : null
    };
}

function deserialiserCote(side, data) {
    if (!data) return;
    side.patience = data.patience;
    side.manaActuel = data.manaActuel;
    side.manaMax = data.manaMax;
    side.numTour = data.numTour;
    side.deck = data.deckIds.map(id => instancier(defCarte(id), side.cle));
    side.main = data.main.map(o => {
        const inst = instancier(defCarte(o.id), side.cle);
        inst.uid = o.uid;
        return inst;
    });
    side.plateau = data.plateau.map(o => ({
        uid:o.uid, id:o.id, prenom:o.prenom, emoji:o.emoji,
        famille: defCarte(o.id) ? defCarte(o.id).famille : 'Neutre',
        cout: defCarte(o.id) ? defCarte(o.id).cout : 0,
        rarete: defCarte(o.id) ? defCarte(o.id).rarete : 'commune',
        desc: defCarte(o.id) ? defCarte(o.id).desc : '',
        atk:o.atk, vie:o.vie, vieMax:o.vieMax,
        auraAtk:o.auraAtk, auraVieAppliquee:o.auraVieAppliquee,
        motsCles:o.motsCles || [],
        aAttaque:o.aAttaque, malade:o.malade,
        gele:o.gele, silence:o.silence, jeton:o.jeton,
        cote: side.cle
    }));
    side.terrain = data.terrain ? (() => {
        const inst = instancier(defCarte(data.terrain.id), side.cle);
        inst.uid = data.terrain.uid;
        return inst;
    })() : null;
}

// Envoie l'état complet aux deux joueurs (celui qui vient d'agir)
function publierEtat() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    const etat = {
        par: monId,
        tourActuel,
        joueur1: serialiserCote(J),
        joueur2: serialiserCote(B),
        timestamp: Date.now()
    };
    window.multiPartie.refPartie.child('etat').set(etat);
}

// Applique l'état de l'adversaire (on est côté client, on écrase notre état local)
function appliquerEtatAdverse(etat) {
    // Si on est joueur1, l'état J est le nôtre, l'état B vient de l'adversaire (et inversement)
    if (monRole === 'joueur1') {
        deserialiserCote(B, etat.joueur2);
    } else {
        deserialiserCote(B, etat.joueur1);
    }
    tourActuel = etat.tourActuel;
    rafraichirJeu();
    verifierFin();
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

/* ---------- Nettoyage ---------- */
window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});