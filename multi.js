/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v10)
   - UN SEUL écouteur sur parties_data/<id>
   - Le joueur1 est chef : il écrit `demarrage = true`
   - Les deux écoutent `demarrage` pour passer en jeu
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

/* ---------- Utilitaires ---------- */
function normaliserPseudo(p) {
    return (p || 'anonyme')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 20);
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
        const d = tout[monPseudo];
        if (d && d.de && d.etat === 'en_attente') afficherDefiRecu(d);
    });

    // Notif de partie (acceptée ou forfait)
    fbDB.ref('parties').on('value', snap => {
        const tout = snap.val() || {};
        Object.entries(tout).forEach(([cle, p]) => {
            if (!p) return;
            const dedans = (p.de === monPseudo || p.adversaire === monPseudo ||
                            p.joueur1 === monPseudo || p.joueur2 === monPseudo);
            if (!dedans) return;
            if (p.etat === 'en_cours' && p.partieId) {
                ecouterPartie(p.partieId);
            }
            if (p.etat === 'forfait' && p.forfaitPar && p.forfaitPar !== monPseudo) {
                if (!partieFinie) {
                    partieFinie = true;
                    clearInterval(timer);
                    enregistrerResultat(true);
                    banniere('Victoire par forfait !');
                    const a = document.getElementById('attente-overlay');
                    if (a) a.classList.remove('open');
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
    const t = document.getElementById('defi-texte');
    if (t) t.innerText = `${defi.dePseudo} te défie en duel !`;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.add('open');
}

function accepterDefi() {
    if (!defiEnCours) return;
    const pseudoAdverse = defiEnCours.de;
    const partieId = defiEnCours.partieId || calculerPartieId(monPseudo, pseudoAdverse);
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');

    const tries = [monPseudo, pseudoAdverse].sort();
    monRole = (monPseudo === tries[0]) ? 'joueur1' : 'joueur2';

    fbDB.ref('parties_data/' + partieId).update({
        joueurs: { [tries[0]]: true, [tries[1]]: true },
        roles: { [tries[0]]: 'joueur1', [tries[1]]: 'joueur2' },
        etat: 'init',
        timestamp: Date.now()
    });

    fbDB.ref('parties/' + partieId).update({
        partieId,
        de: pseudoAdverse,
        adversaire: monPseudo,
        joueur1: tries[0],
        joueur2: tries[1],
        etat: 'en_cours',
        timestamp: Date.now()
    });

    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
    fbDB.ref('joueurs').orderByChild('pseudoNorm').equalTo(pseudoAdverse).once('value')
        .then(s => s.forEach(c => c.ref.update({ etat: 'en_combat' })));

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

/* ---------- Écoute centrale ---------- */
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
        const ids = Object.keys(p.joueurs);
        if (ids.length < 2) return;

        const roleLocal = p.roles[monPseudo] || ((monPseudo === ids[0]) ? 'joueur1' : 'joueur2');
        monRole = roleLocal;

        // Étape 1 : lancement local une fois
        if (!dejaLancee) {
            const pseudoAdverse = ids.find(x => x !== monPseudo);
            fbDB.ref('joueurs').orderByChild('pseudoNorm').equalTo(pseudoAdverse).once('value').then(s => {
                let pseudoAffiche = pseudoAdverse;
                s.forEach(c => { const v = c.val(); if (v && v.pseudo) pseudoAffiche = v.pseudo; });

                dejaLancee = true;
                window.multiPartie = {
                    active: true,
                    adversaireId: pseudoAdverse,
                    partieId,
                    refPartieData: refLocal,
                    role: roleLocal,
                    jeCommence: (roleLocal === 'joueur1'),
                    demarrageTraite: false,
                    pseudosAttendus: ids.slice()
                };
                console.log('[Multi] Lancement local — rôle =', roleLocal);
                lancerPartieMultijoueur(pseudoAffiche);
            });
            return;
        }

        // Étape 2 : mulligan (seul joueur1 surveille et écrit `demarrage`)
        if (window.multiPartie.role === 'joueur1' && !window.multiPartie.demarrageEnvoye) {
            const mull = p.mulligan || {};
            const attendus = window.multiPartie.pseudosAttendus;
            const tousPrets = attendus.length === 2 && attendus.every(x => mull[x] === true);
            if (tousPrets) {
                console.log('[Multi] Chef : 2 mulligans OK → demarrage');
                window.multiPartie.demarrageEnvoye = true;
                refLocal.child('demarrage').set(true);
            }
        }

        // Étape 3 : le flag demarrage
        if (!window.multiPartie.demarrageTraite && p.demarrage === true) {
            window.multiPartie.demarrageTraite = true;
            fermerAttente();
            console.log('[Multi] Flag demarrage reçu');

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

        // Étape 4 : état adverse
        const etat = p.etat_data;
        if (etat && etat.par && etat.par !== monPseudo && window.multiPartie.active) {
            appliquerEtatAdverse(etat);
        }
    });
}

/* ---------- Mulligan : signaler + sécurité chef ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    console.log('[Multi] Mulligan validé pour', monPseudo);
    window.multiPartie.refPartieData.child('mulligan/' + monPseudo).set(true);

    // Si je suis joueur1, je peux aussi déclencher en direct (au cas où l'écouteur tarde)
    if (window.multiPartie.role === 'joueur1') {
        setTimeout(() => {
            if (!window.multiPartie || window.multiPartie.demarrageEnvoye) return;
            window.multiPartie.refPartieData.child('mulligan').once('value').then(s => {
                const mull = s.val() || {};
                const attendus = window.multiPartie.pseudosAttendus;
                const tousPrets = attendus.length === 2 && attendus.every(x => mull[x] === true);
                if (tousPrets) {
                    console.log('[Multi] Chef (check direct) : demarrage');
                    window.multiPartie.demarrageEnvoye = true;
                    window.multiPartie.refPartieData.child('demarrage').set(true);
                }
            });
        }, 300);
    }
}

/* ---------- Sécurité 8 s côté chef ---------- */
function activerSecuriteChef() {
    if (!window.multiPartie || window.multiPartie.role !== 'joueur1') return;
    setTimeout(() => {
        if (!window.multiPartie || !window.multiPartie.active) return;
        if (window.multiPartie.demarrageEnvoye) return;
        console.log('[Multi] Sécurité 8 s : je force le demarrage');
        window.multiPartie.demarrageEnvoye = true;
        window.multiPartie.refPartieData.child('demarrage').set(true);
    }, 8000);
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

/* ---------- Publication état ---------- */
function publierEtat() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    if (typeof modeAttente !== 'undefined' && modeAttente) return;
    if (tourActuel === 'attente') return;
    window.multiPartie.refPartieData.child('etat_data').set({
        par: monPseudo,
        tourActuel,
        joueur1: serialiserCote(J),
        joueur2: serialiserCote(B),
        timestamp: Date.now()
    });
}

/* ---------- Application état adverse ---------- */
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

window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});
