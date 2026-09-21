/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v14 — corrigé)
   
   Flux corrigé :
   - Le CHALLENGER écrit defis/<pseudoCible>/ avec {de: monPseudo, etat:'en_attente'}
   - L'ACCEPTANT voit ce défi dans defis/<son pseudo>/, crée la salle,
     met à jour CE MÊME nœud avec {etat:'accepte', partieId}
   - Le CHALLENGER surveille defis/<pseudoCible>/ et voit l'acceptation
   - Les DEUX s'inscrivent dans salles/<partieId>/joueurs/<monPseudo>
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

    // ---- DÉFIS ENTRANTS (pour moi) ----
    // On écoute defis/<monPseudo> : c'est ici que les AUTRES m'écrivent un défi.
    // On filtre : si c'est un défi reçu (de != moi) et en_attente → afficher
    // Si c'est une acceptation de MON défi envoyé (de == moi) → c'est géré plus bas
    fbDB.ref('defis/' + monPseudo).on('value', snap => {
        const d = snap.val();
        if (!d) return;
        // Défi reçu
        if (d.de && d.de !== monPseudo && d.etat === 'en_attente') {
            afficherDefiRecu(d);
        }
    });

    // ---- MON DÉFI ENVOYÉ (surveillance de l'acceptation) ----
    // Le challenger écrit dans defis/<pseudoCible>. Il doit surveiller ce nœud.
    // Mais il ne connaît pas pseudoCible au moment de l'init...
    // Solution : window._pseudoCibleEnCours est stocké au moment du défi
    // et on met en place un listener dédié dans defierJoueur().
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
    console.log('[Multi] Envoi du défi à', pseudoCible);
    window._pseudoCibleEnCours = pseudoCible;

    // J'écris mon défi dans defis/<pseudoCible>/ (le nœud de la CIBLE)
    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo,
        dePseudo: J.nom || 'Anonyme',
        deId: monId,
        etat: 'en_attente',
        timestamp: Date.now()
    });

    // Je surveille ce nœud pour voir quand la cible accepte
    if (window._ecouteurDefiEnvoye) {
        window._ecouteurDefiEnvoye.off();
    }
    window._ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    window._ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d) return;
        // Si c'est notre défi et qu'il est accepté
        if (d.de === monPseudo && d.etat === 'accepte' && d.partieId) {
            console.log('[Multi] Mon défi a été accepté — partieId =', d.partieId);
            window._ecouteurDefiEnvoye.off();
            window._ecouteurDefiEnvoye = null;
            // Nettoyer le nœud de défi
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 1500);

            monRole = null; // sera lu depuis salles/<id>/roles
            _partieIdEnCours = d.partieId;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });

            // Je m'inscris dans la salle (l'acceptant l'a créée, mais je dois
            // ajouter mon entrée pour que les 2 joueurs soient vus)
            fbDB.ref('salles/' + d.partieId + '/joueurs/' + monPseudo).update({
                pret: true, deck: null, mulligan: false
            });

            ecouterSalle(d.partieId);
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
    });

    const info = document.getElementById('multi-info');
    if (info) info.innerText = 'Défi envoyé… en attente de réponse.';
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
    const pseudoAdverse = defi.de; // pseudo (normalisé) du challenger
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');

    const partieId = calculerPartieId(monPseudo, pseudoAdverse);
    _partieIdEnCours = partieId;
    console.log('[Multi] J\'accepte le défi. partieId =', partieId);

    // Tirage au sort des rôles : UNE SEULE FOIS, par l'acceptant
    const rolesAttribues = Math.random() < 0.5
        ? { [monPseudo]: 'joueur1', [pseudoAdverse]: 'joueur2' }
        : { [monPseudo]: 'joueur2', [pseudoAdverse]: 'joueur1' };
    monRole = rolesAttribues[monPseudo];

    // Créer la salle avec les rôles
    fbDB.ref('salles/' + partieId).update({
        roles: rolesAttribues,
        etat: 'init',
        timestamp: Date.now()
    });

    // Je m'inscris dans la salle
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).set({
        pret: true, deck: null, mulligan: false
    });

    // Mettre à jour LE NŒUD DU DÉFI REÇU (defis/<monPseudo>) pour prévenir
    // le challenger. C'est CE nœud que le challenger surveille.
    fbDB.ref('defis/' + monPseudo).update({
        etat: 'accepte',
        partieId,
        acceptePar: monPseudo
    });

    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });

    // Nettoyage différé : laisser le temps au challenger de lire
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 5000);

    ecouterSalle(partieId);
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
    const partieId = _partieIdEnCours || calculerPartieId(monPseudo, pseudoAdverse);
    console.log('[Multi] annoncerDeckChoisi — partieId =', partieId, '— cartes =', deckIds.length);
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({
        pret: true, deck: deckIds, mulligan: false
    });
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
        console.log('[Multi] Salle mise à jour — joueurs =', pseudos);
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
                    // J'attends que l'adversaire joue
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
