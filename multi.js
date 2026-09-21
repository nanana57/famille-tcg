/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v18 — défi + salle)
   
   Combine :
   - Système de défi avec Accepter / Refuser (notif visuelle)
   - Salle directe avec rôles fiables (source unique : s.roles)
   
   Flux :
   1. A défie B        → A écrit defis/b/
   2. B voit la notif  → Accepter / Refuser
   3. B accepte        → B crée la salle + écrit defis/b/ (accepte)
   4. A voit l'accept  → A rejoint la salle
   5. Les 2 choisissent leur deck
   6. Les 2 valident le mulligan
   7. La partie commence
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
let _ecouteurDefiEnvoye = null;   // listener sur defis/<pseudoCible>
let _pseudoCibleEnCours = null;

/* ---------- Utilitaires ---------- */
function normaliserPseudo(p) {
    return (p || 'anonyme').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_').slice(0, 20);
}
function calculerPartieId(a, b) {
    const x = normaliserPseudo(a), y = normaliserPseudo(b);
    return 'p_' + [x, y].sort().join('_vs_');
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

    // ---- Défis entrants (notif Accepter / Refuser) ----
    fbDB.ref('defis/' + monPseudo).on('value', snap => {
        const d = snap.val();
        if (!d) return;
        // Défi reçu, en attente
        if (d.de && d.de !== monPseudo && d.etat === 'en_attente') {
            afficherDefiRecu(d);
        }
        // Si l'état devient 'accepte' ou 'refuse', on cache la notif
        if (d.etat !== 'en_attente') {
            const ov = document.getElementById('defi-overlay');
            if (ov) ov.classList.remove('open');
        }
    });

    // ---- Salles où je suis présent (fallback pour rejoindre) ----
    // Sert si je recharge la page pendant qu'une salle m'attend.
    fbDB.ref('salles').on('value', snap => {
        const tout = snap.val() || {};
        Object.entries(tout).forEach(([partieId, s]) => {
            if (!s || !s.joueurs) return;
            if (!s.joueurs[monPseudo]) return;
            if (dejaLancee) return;
            if (_partieIdEnCours === partieId) return;   // déjà traité

            console.log('[Multi] 🔔 Salle existante détectée :', partieId);
            _partieIdEnCours = partieId;
            monRole = s.roles ? s.roles[monPseudo] : null;

            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(partieId);

            const pseudoAdverse = Object.keys(s.joueurs).find(x => x !== monPseudo);
            ouvrirChoixDeckEnLigne(pseudoAdverse);
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

/* ---------- Défier : le challenger envoie une notification ---------- */
function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo) return;
    if (!pseudoCible || pseudoCible === monPseudo) return;
    console.log('[Multi] ⚔️ J\'envoie un défi à', pseudoCible);

    _pseudoCibleEnCours = pseudoCible;

    // J'écris mon défi dans defis/<pseudoCible>/
    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo,
        dePseudo: J.nom || 'Anonyme',
        deId: monId,
        etat: 'en_attente',
        timestamp: Date.now()
    });

    // Je surveille ce même nœud pour voir quand la cible accepte
    if (_ecouteurDefiEnvoye) {
        _ecouteurDefiEnvoye.off();
        _ecouteurDefiEnvoye = null;
    }
    _ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    _ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d) return;
        if (d.de !== monPseudo) return;   // pas mon défi

        if (d.etat === 'accepte' && d.partieId) {
            console.log('[Multi] ✅ Mon défi a été accepté — partieId =', d.partieId);
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);

            _partieIdEnCours = d.partieId;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(d.partieId);
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
        if (d.etat === 'refuse') {
            console.log('[Multi] ❌ Mon défi a été refusé');
            flashInfo(`${pseudoCible} a refusé le défi.`);
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 1500);
            const info = document.getElementById('multi-info');
            if (info) info.innerText = 'Défi refusé.';
        }
    });

    const info = document.getElementById('multi-info');
    if (info) info.innerText = `Défi envoyé à ${pseudoCible}… en attente de réponse.`;
}

/* ---------- Défi reçu : afficher la notification ---------- */
function afficherDefiRecu(defi) {
    window._defiEnCours = defi;
    const t = document.getElementById('defi-texte');
    if (t) t.innerText = `${defi.dePseudo} te défie en duel !`;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.add('open');
}

/* ---------- Accepter le défi : je crée la salle ---------- */
function accepterDefi() {
    const defi = window._defiEnCours;
    if (!defi) return;
    const pseudoAdverse = defi.de;  // pseudo (normalisé) du challenger
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;

    const partieId = calculerPartieId(monPseudo, pseudoAdverse);
    _partieIdEnCours = partieId;
    console.log('[Multi] ✅ J\'accepte le défi. partieId =', partieId);

    // Tirage au sort des rôles : par celui qui accepte (une seule fois)
    const roles = Math.random() < 0.5
        ? { [monPseudo]: 'joueur1', [pseudoAdverse]: 'joueur2' }
        : { [monPseudo]: 'joueur2', [pseudoAdverse]: 'joueur1' };
    monRole = roles[monPseudo];
    console.log('[Multi] Rôles tirés au sort :', roles);

    // Créer la salle avec LES DEUX joueurs + les rôles
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

    // Mettre à jour le nœud defis/<monPseudo> (celui où le défi a été reçu)
    // pour que le challenger sache que c'est accepté.
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

/* ---------- Refuser le défi ---------- */
function refuserDefi() {
    const defi = window._defiEnCours;
    if (!defi) return;
    console.log('[Multi] ❌ Je refuse le défi de', defi.de);
    // Mettre à jour le nœud pour prévenir le challenger
    fbDB.ref('defis/' + monPseudo).update({
        etat: 'refuse',
        refusePar: monPseudo
    });
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 3000);
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;
}

/* ---------- Annonce du deck ---------- */
function annoncerDeckChoisi(pseudoAdverse, deckIds) {
    if (!fbDB || !monPseudo) return;
    const partieId = _partieIdEnCours || calculerPartieId(monPseudo, pseudoAdverse);
    console.log('[Multi] 📤 annoncerDeckChoisi — partieId =', partieId, '— cartes =', deckIds.length);

    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({
        pret: true, deck: deckIds, mulligan: false
    });
}

/* ---------- Écoute de la salle ---------- */
function ecouterSalle(partieId) {
    if (_ecouteurSalle === partieId) return;
    _ecouteurSalle = partieId;
    console.log('[Multi] 👂 ecouterSalle(', partieId, ')');

    const refSalle = fbDB.ref('salles/' + partieId);

    refSalle.on('value', snap => {
        const s = snap.val();
        if (!s || !s.joueurs) return;
        const pseudos = Object.keys(s.joueurs);
        console.log('[Multi] Salle — joueurs =', pseudos, '— roles =', s.roles);

        if (pseudos.length < 2) {
            console.log('[Multi] En attente du 2e joueur…');
            return;
        }

        // On exige que s.roles existe ET contienne mon pseudo
        if (!s.roles || !s.roles[monPseudo]) {
            console.log('[Multi] ⏳ En attente des rôles attribués…');
            return;
        }

        const roleLocal = s.roles[monPseudo];   // source unique de vérité
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
            console.log('[Multi] ✅ Les deux decks sont prêts — lancement de la partie');
            console.log('[Multi]    mon rôle =', roleLocal, '— je commence =', roleLocal === 'joueur1');
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
                console.log('[Multi] ✅ Les 2 mulligans validés — démarrage du tour');
                console.log('[Multi]    jeCommence =', window.multiPartie.jeCommence);

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
    console.log('[Multi] ✅ Mulligan validé');
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
