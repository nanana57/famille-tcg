/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v12 — salle unique)
   Un seul nœud : salles/<partieId>
   Chaque joueur y écrit : {pret, deck, mulligan}
   Chacun écoute et démarre quand :
     - les 2 ont annoncé leur deck → lance la partie locale
     - les 2 ont validé le mulligan → démarre son 1er tour
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

/* ---------- Utilitaires ---------- */
function normaliserPseudo(p) {
    return (p || 'anonyme').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_').slice(0, 20);
}
function calculerPartieId(a, b) {
    const x = normaliserPseudo(a), y = normaliserPseudo(b);
    return 'p_' + [x, y].sort().join('_');
}

/* ---------- Init Firebase ---------- */
function initFirebase() {
    if (typeof firebase === 'undefined') { console.error('[FB] SDK absent'); return; }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    fbDB = firebase.database();
    if (!firebaseConfig.databaseURL) { console.error('[FB] databaseURL manquant'); return; }

    monId = sessionStorage.getItem('ftcg_monId');
    if (!monId) {
        monId = 'j_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('ftcg_monId', monId);
    }
    monPseudo = normaliserPseudo(J.nom || 'anonyme');
    console.log('[Multi] init — monPseudo =', monPseudo);

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

    // Défis entrants
    fbDB.ref('defis').on('value', snap => {
        const tout = snap.val() || {};
        const d = tout[monPseudo];
        if (d && d.de && d.etat === 'en_attente') {
            afficherDefiRecu(d);
        }
    });

    // Défis que MOI j'ai envoyés et qui sont acceptés
    const _defisTraites = new Set();
    fbDB.ref('defis').on('value', snap => {
        const tout = snap.val() || {};
        Object.entries(tout).forEach(([cle, d]) => {
            if (!d) return;
            if (d.de === monPseudo && d.etat === 'accepte' && d.partieId) {
                if (_defisTraites.has(d.partieId)) return;   // déjà traité, on évite de rouvrir l'écran
                _defisTraites.add(d.partieId);
                console.log('[Multi] Mon défi a été accepté — partieId =', d.partieId);
                const pseudoAdverse = cle;
                monRole = null; // sera lu depuis salles/{id}/roles (tiré au hasard par l'acceptant)
                fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
                ecouterSalle(d.partieId);
                // On demande le choix du deck
                ouvrirChoixDeckEnLigne(pseudoAdverse);
            }
        });
    });

    // Salles : je surveille celles où je suis présent
    fbDB.ref('salles').on('value', snap => {
        const tout = snap.val() || {};
        Object.keys(tout).forEach(partieId => {
            const s = tout[partieId];
            if (s && s.joueurs && s.joueurs[monPseudo]) {
                if (_ecouteurSalle !== partieId) {
                    ecouterSalle(partieId);
                }
            }
        });
    });

    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Connecté à Firebase.';
}

/* ---------- Liste joueurs ---------- */
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
    if (count) count.innerText = `${joueurs.length} joueur(s) connecté(s)`;
    if (combatCount) combatCount.innerText = `${enCombat} en combat`;
}

/* ---------- Défis ---------- */
function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo) return;
    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo,
        dePseudo: J.nom || 'Anonyme',
        deId: monId,
        etat: 'en_attente',
        timestamp: Date.now()
    });
    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Défi envoyé…';
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
    const pseudoAdverse = defi.de;           // le pseudo du challenger
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');

    const partieId = calculerPartieId(monPseudo, pseudoAdverse);

    // Demande : le premier joueur est choisi au hasard (et non par ordre alphabétique)
    const rolesAttribues = Math.random() < 0.5
        ? { [monPseudo]: 'joueur1', [pseudoAdverse]: 'joueur2' }
        : { [monPseudo]: 'joueur2', [pseudoAdverse]: 'joueur1' };
    monRole = rolesAttribues[monPseudo];

    // Créer la salle (une seule fois, par celui qui accepte)
    fbDB.ref('salles/' + partieId).update({
        roles: rolesAttribues,
        etat: 'init',
        timestamp: Date.now()
    });
    // M'ajouter dedans
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).set({
        pret: true, deck: null, mulligan: false
    });

    // IMPORTANT : on met à jour LE MÊME nœud que celui d'où vient le défi
    // (defis/<mon propre pseudo>, celui que le challenger surveille), pour
    // que les deux clients calculent bien le même partieId. Écrire ailleurs
    // (comme sur defis/<pseudoAdverse>) créait une salle différente côté
    // challenger et bloquait la partie pour l'un des deux joueurs.
    fbDB.ref('defis/' + monPseudo).update({
        etat: 'accepte',
        partieId,
        acceptePar: monPseudo
    });

    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });

    // Nettoyage différé : on laisse le temps au challenger de lire l'état 'accepte'
    // avant de supprimer le défi (évite une course avec le listener Firebase).
    setTimeout(() => { fbDB.ref('defis/' + monPseudo).remove(); }, 4000);

    ecouterSalle(partieId);

    // Demander le choix du deck
    ouvrirChoixDeckEnLigne(pseudoAdverse);
}

function refuserDefi() {
    const defi = window._defiEnCours;
    if (!defi) return;
    fbDB.ref('defis/' + monPseudo).remove();
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;
}

/* ---------- Annonce du deck ---------- */
function annoncerDeckChoisi(pseudoAdverse, deckIds) {
    if (!fbDB || !monPseudo) return;
    const partieId = calculerPartieId(monPseudo, pseudoAdverse);
    console.log('[Multi] annoncerDeckChoisi — partieId =', partieId);
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({
        pret: true, deck: deckIds, mulligan: false
    });
    // Les rôles (qui commence) sont déjà tirés au hasard et écrits une seule
    // fois par celui qui a créé la salle (accepterDefi) : on ne les touche
    // plus ici pour ne pas écraser ce tirage aléatoire.
}

/* ---------- Écoute de la salle ---------- */
function ecouterSalle(partieId) {
    if (_ecouteurSalle === partieId) return;
    _ecouteurSalle = partieId;
    console.log('[Multi] ecouterSalle(', partieId, ')');

    const refSalle = fbDB.ref('salles/' + partieId);

    refSalle.on('value', snap => {
        const s = snap.val();
        if (!s || !s.joueurs) return;
        const pseudos = Object.keys(s.joueurs);
        if (pseudos.length < 2) {
            console.log('[Multi] En attente du 2e joueur. Présents =', pseudos);
            return;
        }

        const roleLocal = (s.roles && s.roles[monPseudo]) || ((monPseudo === pseudos[0]) ? 'joueur1' : 'joueur2');
        monRole = roleLocal;
        const pseudoAdverse = pseudos.find(x => x !== monPseudo);

        const mesInfos = s.joueurs[monPseudo] || {};
        const infosAdv = s.joueurs[pseudoAdverse] || {};
        const monDeck = mesInfos.deck;
        const advDeck = infosAdv.deck;
        const decksPrets = Array.isArray(monDeck) && monDeck.length === 20 &&
                           Array.isArray(advDeck) && advDeck.length === 20;

        // Étape 1 : les 2 decks annoncés → lancement local
        if (decksPrets && !dejaLancee) {
            console.log('[Multi] Les deux decks sont prêts — lancement de la partie');
            dejaLancee = true;
            window.multiPartie = {
                active: true,
                adversaireId: pseudoAdverse,
                partieId,
                refSalle,
                role: roleLocal,
                jeCommence: (roleLocal === 'joueur1'),
                mulliganEnvoye: false,
                demarrageTraite: false
            };
            lancerPartieMultijoueur(pseudoAdverse, monDeck, advDeck);
            return;
        }
        if (!dejaLancee) return;

        // Étape 2 : les 2 mulligans validés → 1er tour
        if (!window.multiPartie.demarrageTraite) {
            const mesMull = mesInfos.mulligan === true;
            const advMull = infosAdv.mulligan === true;
            console.log('[Multi] Mulligan — moi =', mesMull, ', adverse =', advMull);
            if (mesMull && advMull) {
                window.multiPartie.demarrageTraite = true;
                fermerAttente();
                console.log('[Multi] Les 2 mulligans validés — démarrage du tour');

                if (window.multiPartie.jeCommence) {
                    // Je commence
                    tourActuel = 'joueur';
                    modeAttente = false;
                    debutTourJoueur();
                    publierEtat();
                } else {
                    // J'attends
                    modeAttente = true;
                    tourActuel = 'attente';
                    document.getElementById('tour-indicateur').innerText = 'Attente…';
                    document.getElementById('btn-endturn').classList.add('inactif');
                    afficherAttente("En attente de l'adversaire", "L'adversaire commence la partie…");
                }
            }
        }

        // Étape 3 : état adverse
        const etat = s.etat_data;
        if (etat && etat.par && etat.par !== monPseudo && window.multiPartie && window.multiPartie.active) {
            appliquerEtatAdverse(etat);
        }
    });
}

/* ---------- Mulligan ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    console.log('[Multi] Mulligan validé');
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true });
}

/* ---------- Publication état ---------- */
function publierEtat() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    if (typeof modeAttente !== 'undefined' && modeAttente) return;
    if (tourActuel === 'attente') return;
    if (!monRole) return;
    // On publie TOUJOURS sous la clé de rôle stable de chacun (et non "qui vient
    // d'agir"), sinon le joueur1/joueur2 change de sens selon qui a joué en
    // dernier et les deux clients finissent par mélanger leurs plateaux.
    const roleAdverse = monRole === 'joueur1' ? 'joueur2' : 'joueur1';
    const donnees = {
        par: monPseudo,
        tourActuel,
        timestamp: Date.now()
    };
    donnees[monRole] = serialiserCote(J);
    donnees[roleAdverse] = serialiserCote(B);
    window.multiPartie.refSalle.child('etat_data').set(donnees);
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

/* ---------- Application état adverse ---------- */
function appliquerEtatAdverse(etat) {
    if (!monRole) return;
    const roleAdverse = monRole === 'joueur1' ? 'joueur2' : 'joueur1';
    // etat[monRole] = mes propres données telles que vues/relayées par l'adversaire,
    // etat[roleAdverse] = les données de l'adversaire. On applique donc chacune
    // à la bonne variable locale (J = toujours moi, B = toujours l'adversaire).
    deserialiserCote(J, etat[monRole]);
    deserialiserCote(B, etat[roleAdverse]);

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

/* ---------- Forfait en ligne ---------- */
function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    modeAttente = false;
    fbDB.ref('salles/' + window.multiPartie.partieId).update({
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
