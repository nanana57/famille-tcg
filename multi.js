/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v9)
   Principe : joueur1 démarre la partie dès que
   - les 2 mulligans sont validés, OU
   - 6 secondes se sont écoulées.
   Les deux joueurs écoutent un seul flag : `parties_data/<id>/demarrage`
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
let monPseudo = null;
window.multiPartie = null;

let monRole = null;
let dejaLancee = false;
let defiEnCours = null;
let _ecouteurActif = null;

/* ---------- Utilitaires pseudo ---------- */
function normaliserPseudo(p) {
    return (p || 'anonyme')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 20);
}

function calculerPartieId(pseudoA, pseudoB) {
    const a = normaliserPseudo(pseudoA);
    const b = normaliserPseudo(pseudoB);
    return 'p_' + [a, b].sort().join('_');
}

/* ---------- Initialisation ---------- */
function initFirebase() {
    if (typeof firebase === 'undefined') {
        const info = document.getElementById('multi-info');
        if (info) info.innerText = 'Firebase non chargé.';
        return;
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    fbDB = firebase.database();
    if (!firebaseConfig.databaseURL) { console.error('[Firebase] databaseURL manquant'); return; }

    monId = sessionStorage.getItem('familletcg_monId');
    if (!monId) {
        monId = 'j_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('familletcg_monId', monId);
    }
    monPseudo = normaliserPseudo(J.nom || 'anonyme');
    console.log('[Multi] init — monId =', monId, '— monPseudo =', monPseudo);

    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');

    fbUserRef.onDisconnect().remove();
    fbUserRef.set({
        pseudo: J.nom || 'Anonyme',
        pseudoNorm: monPseudo,
        etat: 'libre',
        dernierPing: Date.now()
    });

    fbJoueursRef.on('value', snap => afficherListeJoueurs(snap.val() || {}));

    // Défis
    fbDB.ref('defis').on('value', snap => {
        const tout = snap.val() || {};
        const monDefi = tout[monPseudo];
        if (monDefi && monDefi.de && monDefi.etat === 'en_attente') {
            afficherDefiRecu(monDefi);
        }
    });

    // Parties : notif d'acceptation + forfait
    fbDB.ref('parties').on('value', snap => {
        const tout = snap.val() || {};
        Object.entries(tout).forEach(([cle, p]) => {
            if (!p) return;
            const dansLaPartie = (p.de === monPseudo || p.adversaire === monPseudo ||
                                  p.joueur1 === monPseudo || p.joueur2 === monPseudo);
            if (!dansLaPartie) return;

            if (p.etat === 'en_cours' && p.partieId) {
                ecouterPartie(p.partieId);
            }

            if (p.etat === 'forfait' && p.forfaitPar && p.forfaitPar !== monPseudo) {
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
    });

    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Connecté à Firebase.';
}

/* ---------- Liste des joueurs ---------- */
function rafraichirJoueurs() { if (!fbDB) initFirebase(); }

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
        const ciblePseudo = j.pseudoNorm || normaliserPseudo(j.pseudo);
        const moiMeme = (ciblePseudo === monPseudo);
        div.innerHTML = `
            <div>
                <div class="mj-nom">${j.pseudo || 'Anonyme'}</div>
                <div class="mj-etat ${libre ? 'libre' : 'en-combat'}">
                    ${libre ? '● Disponible' : '⚔ En combat'}
                </div>
            </div>
            <button ${(libre && !moiMeme) ? '' : 'disabled'} onclick="defierJoueur('${ciblePseudo}')">
                ${moiMeme ? 'Toi' : (libre ? 'Défier' : 'Occupé')}
            </button>
        `;
        liste.appendChild(div);
    });

    if (count) count.innerText = `${joueurs.length} joueur(s) connecté(s)`;
    if (combatCount) combatCount.innerText = `${enCombat} en combat`;
}

/* ---------- Envoi / réception d'un défi ---------- */
function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo) return;
    const partieId = calculerPartieId(monPseudo, pseudoCible);
    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo,
        dePseudo: J.nom || 'Anonyme',
        deId: monId,
        partieId,
        etat: 'en_attente',
        timestamp: Date.now()
    });
    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Défi envoyé…';
}

function afficherDefiRecu(defi) {
    defiEnCours = defi;
    const texte = document.getElementById('defi-texte');
    if (texte) texte.innerText = `${defi.dePseudo} te défie en duel !`;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.add('open');
}

function accepterDefi() {
    if (!defiEnCours) return;
    const pseudoAdverse = defiEnCours.de;
    const partieId = defiEnCours.partieId || calculerPartieId(monPseudo, pseudoAdverse);
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');

    const pseudosTries = [monPseudo, pseudoAdverse].sort();
    monRole = (monPseudo === pseudosTries[0]) ? 'joueur1' : 'joueur2';

    const refPartieData = fbDB.ref('parties_data/' + partieId);
    refPartieData.update({
        joueurs: {
            [pseudosTries[0]]: true,
            [pseudosTries[1]]: true
        },
        roles: {
            [pseudosTries[0]]: 'joueur1',
            [pseudosTries[1]]: 'joueur2'
        },
        etat: 'init',
        timestamp: Date.now()
    });

    fbDB.ref('parties/' + partieId).update({
        partieId,
        de: pseudoAdverse,
        adversaire: monPseudo,
        joueur1: pseudosTries[0],
        joueur2: pseudosTries[1],
        etat: 'en_cours',
        timestamp: Date.now()
    });

    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
    fbDB.ref('joueurs').orderByChild('pseudoNorm').equalTo(pseudoAdverse).once('value').then(snap => {
        snap.forEach(child => child.ref.update({ etat: 'en_combat' }));
    });

    fbDB.ref('defis/' + monPseudo).remove();
    ecouterPartie(partieId);
}

function refuserDefi() {
    if (!defiEnCours) return;
    fbDB.ref('defis/' + monPseudo).remove();
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    defiEnCours = null;
}

/* ---------- Écoute de la partie_data ---------- */
function ecouterPartie(partieId) {
    if (_ecouteurActif === partieId) return;
    _ecouteurActif = partieId;
    console.log('[Multi] ecouterPartie(', partieId, ')');

    const refLocal = fbDB.ref('parties_data/' + partieId);
    refLocal.child('presence/' + monPseudo).set(true);
    refLocal.child('presence/' + monPseudo).onDisconnect().remove();

    refLocal.on('value', snap => {
        const p = snap.val();
        if (!p || !p.joueurs) return;

        const pseudosAttendus = Object.keys(p.joueurs);
        if (pseudosAttendus.length < 2) return;

        const roleLocal = p.roles[monPseudo] || ((monPseudo === pseudosAttendus[0]) ? 'joueur1' : 'joueur2');
        monRole = roleLocal;

        // -------- Étape 1 : lancement local --------
        if (!dejaLancee) {
            const pseudoAdverse = pseudosAttendus.find(id => id !== monPseudo);
            fbDB.ref('joueurs').orderByChild('pseudoNorm').equalTo(pseudoAdverse).once('value').then(snapJ => {
                let pseudoAffiche = pseudoAdverse;
                snapJ.forEach(child => {
                    const v = child.val();
                    if (v && v.pseudo) pseudoAffiche = v.pseudo;
                });

                dejaLancee = true;
                window.multiPartie = {
                    active: true,
                    adversaireId: pseudoAdverse,
                    partieId,
                    refPartieData: refLocal,
                    role: roleLocal,
                    jeCommence: (roleLocal === 'joueur1'),
                    demarrageTraite: false,
                    pseudosAttendus: pseudosAttendus.slice()
                };
                console.log('[Multi] Lancement local — rôle =', roleLocal);
                lancerPartieMultijoueur(pseudoAffiche);
            });
            return;
        }

        // -------- Étape 2 : le flag de démarrage --------
        if (window.multiPartie && !window.multiPartie.demarrageTraite && p.demarrage === true) {
            window.multiPartie.demarrageTraite = true;
            fermerAttente();
            console.log('[Multi] Flag demarrage reçu — je passe au tour');

            if (window.multiPartie.jeCommence) {
                tourActuel = 'joueur';
                modeAttente = false;
                debutTourJoueur();
                publierEtat();
            } else {
                modeAttente = true;
                tourActuel = 'attente';
                document.getElementById('tour-indicateur').innerText = 'Attente…';
                document.getElementById('btn-endturn').classList.add('inactif');
                afficherAttente("En attente de l'adversaire", "L'adversaire commence la partie…");
            }
        }

        // -------- Étape 3 : application de l'état adverse --------
        const etat = p.etat_data;
        if (etat && etat.par && etat.par !== monPseudo && window.multiPartie && window.multiPartie.active) {
            appliquerEtatAdverse(etat);
        }
    });
}

/* ---------- Déclenche le démarrage (appelé par joueur1) ---------- */
function declencherDemarrage() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    if (window.multiPartie.role !== 'joueur1') return;      // seul joueur1 déclenche
    if (window.multiPartie.demarrageEnvoye) return;
    window.multiPartie.demarrageEnvoye = true;
    console.log('[Multi] Je déclenche le démarrage');
    window.multiPartie.refPartieData.child('demarrage').set(true);
}

/* ---------- Mulligan ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    window.multiPartie.refPartieData.child('mulligan/' + monPseudo).set(true);
    console.log('[Multi] Mulligan validé pour', monPseudo);
}

/* ---------- Deck en ligne ---------- */
function piocherDeckEnLigne() {
    const sel = document.getElementById('deck-select');
    const idx = sel ? parseInt(sel.value) : 0;
    if (mesDecks[idx] && mesDecks[idx].cartes.length === 20) return mesDecks[idx].cartes.slice();
    return hasard(decksPreconstruits).cartes.slice();
}

/* ---------- Sérialisation ---------- */
function serialiserCote(side) {
    return {
        patience: side.patience, manaActuel: side.manaActuel, manaMax: side.manaMax,
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

/* ---------- Publication de l'état ---------- */
function publierEtat() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    if (typeof modeAttente !== 'undefined' && modeAttente) return;
    if (tourActuel === 'attente') return;

    const etat = {
        par: monPseudo,
        tourActuel,
        joueur1: serialiserCote(J),
        joueur2: serialiserCote(B),
        timestamp: Date.now()
    };
    window.multiPartie.refPartieData.child('etat_data').set(etat);
}

/* ---------- Application de l'état adverse ---------- */
function appliquerEtatAdverse(etat) {
    deserialiserCote(J, etat.joueur1);
    deserialiserCote(B, etat.joueur2);

    if (etat.tourActuel === 'bot') {
        modeAttente = false;
        tourActuel = 'joueur';
        fermerAttente();
        prochainManaMax(J);
        J.plateau.forEach(m => { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
        piocher(J, 1);
        document.getElementById('tour-indicateur').innerText = 'Ton tour';
        document.querySelector('.turn-pill').classList.remove('bot');
        document.getElementById('btn-endturn').classList.remove('inactif');
        banniere('À toi de jouer');
    } else {
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

/* ---------- Forfait ---------- */
function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    modeAttente = false;
    fbDB.ref('parties/' + window.multiPartie.partieId).update({
        etat: 'forfait',
        forfaitPar: monPseudo,
        timestamp: Date.now()
    });
    fbDB.ref('joueurs/' + monId).update({ etat: 'libre' });
    window.multiPartie.active = false;
}

/* ---------- Nettoyage ---------- */
window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});
