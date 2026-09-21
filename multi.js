/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v21 — actions replay)
   
   Principe :
   - Chaque client est maître de son tour (même moteur que le bot)
   - À la fin du tour, il envoie la LISTE DES ACTIONS jouées
   - L'autre client reçoit et REJOUE les actions localement
   - PV, morts, animations : tout est calculé localement
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
let _ecouteurSalle = null;
let _partieIdEnCours = null;
let _salleRef = null;
let _ecouteurDefiEnvoye = null;
let _pseudoCibleEnCours = null;

let _dernierTourTraite = -1;

function normaliserPseudo(p) {
    return (p || 'anonyme').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_').slice(0, 20);
}
function calculerPartieId(a, b) {
    const x = normaliserPseudo(a), y = normaliserPseudo(b);
    return 'p_' + [x, y].sort().join('_vs_');
}

function initFirebase() {
    if (typeof firebase === 'undefined') { console.error('[FB] SDK absent'); return; }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    fbDB = firebase.database();

    monId = sessionStorage.getItem('ftcg_monId');
    if (!monId) {
        monId = 'j_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('ftcg_monId', monId);
    }
    monPseudo = normaliserPseudo(J.nom || 'anonyme');

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

    fbDB.ref('defis/' + monPseudo).on('value', snap => {
        const d = snap.val();
        if (!d) return;
        if (d.de && d.de !== monPseudo && d.etat === 'en_attente') {
            afficherDefiRecu(d);
        }
        if (d.etat !== 'en_attente') {
            const ov = document.getElementById('defi-overlay');
            if (ov) ov.classList.remove('open');
        }
    });

    fbDB.ref('salles').on('value', snap => {
        const tout = snap.val() || {};
        Object.entries(tout).forEach(([partieId, s]) => {
            if (!s || !s.joueurs || !s.joueurs[monPseudo]) return;
            if (dejaLancee) return;
            if (_partieIdEnCours === partieId) return;
            _partieIdEnCours = partieId;
            monRole = s.roles ? s.roles[monPseudo] : null;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(partieId);
            const pseudoAdverse = Object.keys(s.joueurs).find(x => x !== monPseudo);
            ouvrirChoixDeckEnLigne(pseudoAdverse);
        });
    });
}

function rafraichirJoueurs() { if (!fbDB) initFirebase(); }

function afficherListeJoueurs(data) {
    const liste = document.getElementById('multi-liste');
    if (!liste) return;
    const joueurs = Object.entries(data).filter(([id]) => id !== monId);
    liste.innerHTML = joueurs.length ? '' : '<p class="hint">Aucun autre joueur connecté pour le moment.</p>';
    joueurs.forEach(([id, j]) => {
        const div = document.createElement('div');
        div.className = 'multi-joueur';
        const libre = j.etat === 'libre';
        const cible = j.pseudoNorm || normaliserPseudo(j.pseudo);
        const moiMeme = (cible === monPseudo);
        div.innerHTML = `
            <div>
                <div class="mj-nom">${j.pseudo || 'Anonyme'}</div>
                <div class="mj-etat ${libre ? 'libre' : 'en-combat'}">
                    ${libre ? '● Disponible' : '⚔ En combat'}
                </div>
            </div>
            <button ${(libre && !moiMeme) ? '' : 'disabled'} onclick="defierJoueur('${cible}')">
                ${moiMeme ? 'Toi' : (libre ? 'Défier' : 'Occupé')}
            </button>`;
        liste.appendChild(div);
    });
}

function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo || !pseudoCible || pseudoCible === monPseudo) return;
    _pseudoCibleEnCours = pseudoCible;
    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo, dePseudo: J.nom || 'Anonyme', deId: monId,
        etat: 'en_attente', timestamp: Date.now()
    });

    if (_ecouteurDefiEnvoye) _ecouteurDefiEnvoye.off();
    _ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    _ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d || d.de !== monPseudo) return;
        if (d.etat === 'accepte' && d.partieId) {
            if (_ecouteurDefiEnvoye) _ecouteurDefiEnvoye.off();
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);
            _partieIdEnCours = d.partieId;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(d.partieId);
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
        if (d.etat === 'refuse') {
            if (_ecouteurDefiEnvoye) _ecouteurDefiEnvoye.off();
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 1500);
        }
    });
}

function afficherDefiRecu(defi) {
    window._defiEnCours = defi;
    const t = document.getElementById('defi-texte');
    if (t) t.innerText = `${defi.dePseudo} te défie en duel !`;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.add('open');
}

function accepterDefi() {
    const defi = window._defiEnCours;
    if (!defi) return;
    const pseudoAdverse = defi.de;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;

    const partieId = calculerPartieId(monPseudo, pseudoAdverse);
    _partieIdEnCours = partieId;

    const roles = Math.random() < 0.5
        ? { [monPseudo]: 'joueur1', [pseudoAdverse]: 'joueur2' }
        : { [monPseudo]: 'joueur2', [pseudoAdverse]: 'joueur1' };
    monRole = roles[monPseudo];

    _salleRef = fbDB.ref('salles/' + partieId);
    _salleRef.set({
        roles,
        etat: 'attente_deck',
        timestamp: Date.now(),
        joueurs: {
            [monPseudo]:    { pret: false, deck: null, mulligan: false },
            [pseudoAdverse]:{ pret: false, deck: null, mulligan: false }
        }
    });

    fbDB.ref('defis/' + monPseudo).update({ etat: 'accepte', partieId, acceptePar: monPseudo });
    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 5000);

    ecouterSalle(partieId);
    ouvrirChoixDeckEnLigne(pseudoAdverse);
}

function refuserDefi() {
    const defi = window._defiEnCours;
    if (!defi) return;
    fbDB.ref('defis/' + monPseudo).update({ etat: 'refuse', refusePar: monPseudo });
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 3000);
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;
}

function annoncerDeckChoisi(pseudoAdverse, deckIds) {
    if (!fbDB || !monPseudo) return;
    const partieId = _partieIdEnCours || calculerPartieId(monPseudo, pseudoAdverse);
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({ pret: true, deck: deckIds, mulligan: false });
}

/* ---------- Écoute de la salle ---------- */
function ecouterSalle(partieId) {
    if (_ecouteurSalle === partieId) return;
    _ecouteurSalle = partieId;

    const refSalle = fbDB.ref('salles/' + partieId);

    refSalle.on('value', snap => {
        const s = snap.val();
        if (!s || !s.joueurs) return;
        const pseudos = Object.keys(s.joueurs);
        if (pseudos.length < 2 || !s.roles || !s.roles[monPseudo]) return;

        const roleLocal = s.roles[monPseudo];
        monRole = roleLocal;
        const roleAdverse = roleLocal === 'joueur1' ? 'joueur2' : 'joueur1';
        const pseudoAdverse = s.roles[roleAdverse] || pseudos.find(x => x !== monPseudo);

        const mesInfos = s.joueurs[monPseudo] || {};
        const infosAdv = s.joueurs[pseudoAdverse] || {};
        const decksPrets = Array.isArray(mesInfos.deck) && mesInfos.deck.length === 20 &&
                           Array.isArray(infosAdv.deck) && infosAdv.deck.length === 20;

        // ---- Étape 1 : lancement ----
        if (decksPrets && !dejaLancee) {
            dejaLancee = true;
            window.multiPartie = {
                active: true, adversaireId: pseudoAdverse, partieId, refSalle,
                role: roleLocal, jeCommence: (roleLocal === 'joueur1'),
                demarrageTraite: false
            };
            lancerPartieMultijoueur(pseudoAdverse, mesInfos.deck, infosAdv.deck);
            return;
        }
        if (!dejaLancee) return;

        // ---- Étape 2 : mulligans validés → 1er tour ----
        if (!window.multiPartie.demarrageTraite) {
            const mesMull = mesInfos.mulligan === true;
            const advMull = infosAdv.mulligan === true;
            if (mesMull && advMull) {
                window.multiPartie.demarrageTraite = true;
                _dernierTourTraite = -1;
                fermerAttente();

                // Le joueur1 démarre à 2 mana, le joueur2 attend
                // (les deux joueurs commencent avec manaMax = 0, le 1er tour
                //  du joueur1 lui donne 2 mana, celui du joueur2 donnera 3)
                if (window.multiPartie.jeCommence) {
                    modeEnLigne = true;
                    modeAttente = false;
                    tourActuel = 'joueur';
                    // On ne touche PAS à J.premier ici : prochainManaMax s'en sert
                    // pour savoir si c'est le 1er tour. Le joueur1 a premier = true.
                    J.premier = true;
                    B.premier = false;
                    debutTourJoueur();
                } else {
                    modeEnLigne = true;
                    modeAttente = true;
                    tourActuel = 'attente';
                    J.premier = false;
                    B.premier = true;
                    document.getElementById('tour-indicateur').innerText = 'Attente…';
                    document.getElementById('btn-endturn').classList.add('inactif');
                    // ⚠️ Pas d'overlay plein écran : on veut voir le plateau !
                    info('L\'adversaire commence la partie…');
                }
            }
            return;
        }

        // ---- Étape 3 : recevoir les actions de l'adversaire ----
        const actionData = s.actions && s.actions[roleAdverse];
        if (!actionData) return;

        const numTourAdv = actionData.tour || 0;
        if (numTourAdv === _dernierTourTraite) return;
        _dernierTourTraite = numTourAdv;

        // Ne pas rejouer mon propre tour
        if (actionData.par === monPseudo) return;

        console.log('[Multi] 🎬 Je rejoue les actions de', pseudoAdverse, '— tour', numTourAdv);
        rejouerActionsAdverses(actionData.actions || []);
    });
}

/* ---------- Rejouer les actions de l'adversaire ---------- */
async function rejouerActionsAdverses(actions) {
    if (!actions.length) {
        // L'adversaire a passé son tour sans rien faire
        passerMonTourApresAdversaire();
        return;
    }

    // Le joueur adverse a agi. On rejoue chaque action sur SON côté (B).
    // On simule exactement comme jouerTourBot, mais avec les actions reçues.
    for (const a of actions) {
        await executerActionAdverse(a);
        await pause(350);
        rafraichirJeu();
    }

    await pause(300);
    passerMonTourApresAdversaire();
}

function passerMonTourApresAdversaire() {
    // Appliquer la fin de tour de l'adversaire (effets finTour)
    appliquerFinDeTour(B);
    B.surcout = 0;
    if (B.voitMainAdverse > 0) B.voitMainAdverse--;
    rafraichirJeu();
    verifierFin();
    if (partieFinie) return;

    // Démarrage de mon tour
    modeAttente = false;
    tourActuel = 'joueur';
    J.premier = false; B.premier = true;
    debutTourJoueur();
}

async function executerActionAdverse(a) {
    const p = POUVOIRS[a.id];
    switch (a.type) {
        case 'jouer': {
            // Trouver la carte dans la main de B
            const idx = B.main.findIndex(c => c.id === a.id);
            if (idx >= 0) {
                const carte = B.main[idx];
                // Appliquer les dégâts / effets
                let cible = null;
                if (a.cibleUid) {
                    cible = [...J.plateau, ...B.plateau].find(m => m.uid === a.cibleUid) || null;
                    if (a.cibleHero) cible = a.cibleHero === 'J' ? J : B;
                }
                // Sacrifier les composants de fusion si nécessaire
                if (carte.rarete === 'fusion') {
                    sacrifierPourFusion(B, carte.id);
                }
                jouerCarte(B, idx, cible);
            }
            break;
        }
        case 'attaque': {
            const attaquant = B.plateau.find(m => m.uid === a.uid);
            if (!attaquant) return;
            let cible = null;
            if (a.cibleUid) cible = J.plateau.find(m => m.uid === a.cibleUid);
            else if (a.cibleHero) cible = J;
            if (cible) await attaquer(attaquant, cible);
            break;
        }
        case 'fin': {
            // Fin du tour adverse
            break;
        }
    }
}

/* ---------- Envoyer mes actions à la fin de mon tour ---------- */
function envoyerMesActions() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    if (!monRole) return;
    const tour = (J.numTour || 1);
    // On incrémente un compteur pour distinguer les tours
    const donnees = {
        par: monPseudo,
        role: monRole,
        tour: Date.now(),      // utiliser le timestamp comme identifiant unique
        actions: J._actionsTour || []
    };
    window.multiPartie.refSalle.child('actions/' + monRole).set(donnees);
    J._actionsTour = [];       // reset pour le prochain tour
}

/* ---------- Forfait en ligne ---------- */
function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    modeAttente = false;
    fbDB.ref('salles/' + window.multiPartie.partieId).update({
        etat: 'forfait', forfaitPar: monPseudo, timestamp: Date.now()
    });
    fbDB.ref('joueurs/' + monId).update({ etat: 'libre' });
    window.multiPartie.active = false;
}

/* ---------- Mulligan ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true });
}

/* ---------- Nettoyage ---------- */
window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});
