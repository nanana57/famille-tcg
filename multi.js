/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (avec vrais tours)
   =========================================================== */

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

let monRole = null;
let refPartie = null;
let dejaLancee = false;
let defiEnCours = null;

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

    fbJoueursRef.on('value', snap => {
        const data = snap.val() || {};
        afficherListeJoueurs(data);
    });

    fbDB.ref('defis/' + monId).on('value', snap => {
        const defi = snap.val();
        if (defi && defi.de && defi.etat === 'en_attente') {
            afficherDefiRecu(defi);
        }
    });

    fbDB.ref('parties/' + monId).on('value', snap => {
        const p = snap.val();
        if (!p) return;

        if (p.etat === 'en_cours' && p.partieId) {
            ecouterPartie(p.partieId);
        }

        if (p.etat === 'forfait' && p.forfaitPar && p.forfaitPar !== monId) {
            if (!partieFinie) {
                partieFinie = true;
                clearInterval(timer);
                enregistrerResultat(true);
                banniere('Victoire par forfait !');
                const attente = document.getElementById('attente-overlay');
                if (attente) attente.classList.remove('open');
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

/* ---------- Envoi d'un défi ---------- */
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

/* ---------- Réception d'un défi ---------- */
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
    const idTries = [monId, adversaireId].sort();
    monRole = (monId === idTries[0]) ? 'joueur1' : 'joueur2';

    refPartie = fbDB.ref('parties_data/' + partieId);
    refPartie.set({
        joueurs: {
            [idTries[0]]: true,
            [idTries[1]]: true
        },
        roles: {
            [idTries[0]]: 'joueur1',
            [idTries[1]]: 'joueur2'
        },
        etat: 'init',
        timestamp: Date.now()
    });

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

    ecouterPartie(partieId);
}

function refuserDefi() {
    if (!defiEnCours) return;
    fbDB.ref('defis/' + monId).remove();
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    defiEnCours = null;
}

/* ---------- Lancement réel de la partie en ligne ---------- */
function ecouterPartie(partieId) {
    if (dejaLancee) return;

    refPartie = fbDB.ref('parties_data/' + partieId);

    refPartie.child('presence/' + monId).set(true);
    refPartie.child('presence/' + monId).onDisconnect().remove();

    refPartie.on('value', snap => {
        const p = snap.val();
        if (!p || !p.joueurs) return;

        const ids = Object.keys(p.joueurs);
        if (ids.length < 2) return;
        if (dejaLancee) return;

        monRole = p.roles[monId] || ((monId === ids[0]) ? 'joueur1' : 'joueur2');

        const adversaireId = ids.find(id => id !== monId);
        fbDB.ref('joueurs/' + adversaireId).once('value').then(snapJ => {
            const j = snapJ.val() || {};
            const pseudoAdverse = j.pseudo || 'Adversaire';

            dejaLancee = true;

            window.multiPartie = {
                active: true,
                adversaireId,
                partieId,
                refPartie,
                role: monRole,
                jeCommence: (monRole === 'joueur1'),
                mulliganTermine: false
            };

            lancerPartieMultijoueur(pseudoAdverse);
        });

        refPartie.child('etat_data').on('value', snapEtat => {
            const etat = snapEtat.val();
            if (!etat || !window.multiPartie || !window.multiPartie.active) return;
            if (etat.par === monId) return;
            appliquerEtatAdverse(etat);
        });
    });
}

/* ---------- Deck pour la partie en ligne ---------- */
function piocherDeckEnLigne() {
    const sel = document.getElementById('deck-select');
    const idx = sel ? parseInt(sel.value) : 0;
    if (mesDecks[idx] && mesDecks[idx].cartes.length === 20) {
        return mesDecks[idx].cartes.slice();
    }
    return hasard(decksPreconstruits).cartes.slice();
}

/* ---------- Sérialisation / désérialisation ---------- */
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
    side.plateau = data.plateau.map(o => {
        const def = defCarte(o.id);
        return {
            uid:o.uid, id:o.id, prenom:o.prenom, emoji:o.emoji,
            famille: def ? def.famille : 'Neutre',
            cout: def ? def.cout : 0,
            rarete: def ? def.rarete : 'commune',
            desc: def ? def.desc : '',
            atk:o.atk, vie:o.vie, vieMax:o.vieMax,
            auraAtk:o.auraAtk, auraVieAppliquee:o.auraVieAppliquee,
            motsCles:o.motsCles || [],
            aAttaque:o.aAttaque, malade:o.malade,
            gele:o.gele, silence:o.silence, jeton:o.jeton,
            cote: side.cle
        };
    });
    side.terrain = data.terrain ? (() => {
        const inst = instancier(defCarte(data.terrain.id), side.cle);
        inst.uid = data.terrain.uid;
        return inst;
    })() : null;
}

/* ---------- Mulligan : signaler prêt et attendre l'autre ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    const ref = window.multiPartie.refPartie;

    ref.child('mulligan/' + monId).set(true);

    ref.child('mulligan').on('value', snap => {
        const m = snap.val() || {};
        const ids = Object.keys(m);
        if (ids.length < 2) return;
        if (window.multiPartie.mulliganTermine) return;
        window.multiPartie.mulliganTermine = true;
        ref.child('mulligan').off('value');

        fermerAttente();

        const jeSuisJoueur1 = window.multiPartie.jeCommence;
        if (jeSuisJoueur1) {
            // C'est à moi de commencer
            tourActuel = 'joueur';
            modeAttente = false;
            debutTourJoueur();
            publierEtat();
        } else {
            // On attend que l'autre commence
            modeAttente = true;
            tourActuel = 'attente';
            document.getElementById('tour-indicateur').innerText = 'Attente…';
            document.getElementById('btn-endturn').classList.add('inactif');
            afficherAttente("En attente de l'adversaire", "L'adversaire commence la partie…");
        }
    });
}

/* ---------- Publication de l'état complet ---------- */
function publierEtat() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    if (typeof modeAttente !== 'undefined' && modeAttente) return;
    if (tourActuel === 'attente') return;

    const etat = {
        par: monId,
        tourActuel,
        joueur1: serialiserCote(J),
        joueur2: serialiserCote(B),
        timestamp: Date.now()
    };
    window.multiPartie.refPartie.child('etat_data').set(etat);
}

/* ---------- Application de l'état adverse (vrai tour par tour) ---------- */
function appliquerEtatAdverse(etat) {
    // On remplace TOUT l'état local par celui publié
    deserialiserCote(J, etat.joueur1);
    deserialiserCote(B, etat.joueur2);

    // Le publieur envoie 'joueur' s'il vient de commencer son tour,
    // ou 'bot' s'il vient de finir son tour.
    if (etat.tourActuel === 'bot') {
        // L'adversaire a fini son tour → à moi
        modeAttente = false;
        tourActuel = 'joueur';
        fermerAttente();

        // Nouveau tour local : mana +1, cartes prêtes, pioche
        prochainManaMax(J);
        J.plateau.forEach(m => { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
        piocher(J, 1);

        document.getElementById('tour-indicateur').innerText = 'Ton tour';
        document.querySelector('.turn-pill').classList.remove('bot');
        document.getElementById('btn-endturn').classList.remove('inactif');
        banniere('À toi de jouer');
    } else {
        // L'adversaire est en train de jouer
        modeAttente = true;
        tourActuel = 'bot';
        document.getElementById('tour-indicateur').innerText = 'Tour adverse';
        document.querySelector('.turn-pill').classList.add('bot');
        document.getElementById('btn-endturn').classList.add('inactif');
        afficherAttente("Tour adverse", "L'adversaire joue…");
    }

    rafraichirJeu();
    verifierFin();
}

/* ---------- Forfait en ligne ---------- */
function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    modeAttente = false;
    fbDB.ref('parties/' + window.multiPartie.adversaireId).update({
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