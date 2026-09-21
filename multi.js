/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v22 — temps réel)
   
   Chaque action est poussée IMMÉDIATEMENT dans salles/<id>/queue
   L'autre client écoute la queue et rejoue chaque action en direct
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

    // Défi reçu
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

    // Salles
    fbDB.ref('salles').on('value', snap => {
        const tout = snap.val() || {};
        Object.entries(tout).forEach(([partieId, s]) => {
            if (!s || !s.joueurs || !s.joueurs[monPseudo]) return;
            if (dejaLancee) return;
            if (_partieIdEnCours === partieId) return;
            console.log('[Multi] 🔔 Salle détectée :', partieId);
            _partieIdEnCours = partieId;
            monRole = s.roles ? s.roles[monPseudo] : null;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(partieId);
            const pseudoAdverse = Object.keys(s.joueurs).find(x => x !== monPseudo);
            ouvrirChoixDeckEnLigne(pseudoAdverse);
        });
    });
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

/* ---------- Défier ---------- */
function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo || !pseudoCible || pseudoCible === monPseudo) return;
    console.log('[Multi] ⚔️ Défi à', pseudoCible);
    _pseudoCibleEnCours = pseudoCible;

    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo, dePseudo: J.nom || 'Anonyme', deId: monId,
        etat: 'en_attente', timestamp: Date.now()
    });

    if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
    _ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    _ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d || d.de !== monPseudo) return;
        if (d.etat === 'accepte' && d.partieId) {
            console.log('[Multi] ✅ Défi accepté, partieId =', d.partieId);
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);
            _partieIdEnCours = d.partieId;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(d.partieId);
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
        if (d.etat === 'refuse') {
            console.log('[Multi] ❌ Défi refusé');
            flashInfo(`${pseudoCible} a refusé le défi.`);
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
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
    console.log('[Multi] ✅ J\'accepte, partieId =', partieId);

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
    console.log('[Multi] 📤 Deck annoncé :', deckIds.length, 'cartes');
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({ pret: true, deck: deckIds, mulligan: false });
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
            console.log('[Multi] ✅ Les deux decks sont prêts — lancement !');
            console.log('[Multi]    mon rôle =', roleLocal, '— je commence =', roleLocal === 'joueur1');
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
                fermerAttente();
                console.log('[Multi] ✅ Démarrage. jeCommence =', window.multiPartie.jeCommence);

                if (window.multiPartie.jeCommence) {
                    modeEnLigne = true;
                    modeAttente = false;
                    tourActuel = 'joueur';
                    J.premier = true; B.premier = false;
                    debutTourJoueur();
                } else {
                    modeEnLigne = true;
                    modeAttente = true;
                    tourActuel = 'attente';
                    J.premier = false; B.premier = true;
                    document.getElementById('tour-indicateur').innerText = 'Tour adverse';
                    document.querySelector('.turn-pill').classList.add('bot');
                    document.getElementById('btn-endturn').classList.add('inactif');
                    info('L\'adversaire commence la partie…');

                    // Simuler le 1er tour adverse pour le mana
                    prochainManaMax(B);
                    B.plateau.forEach(m => { m.aAttaque = false; m.malade = false; if (m.gele > 0) m.gele--; });
                    piocher(B, 1);
                    rafraichirJeu();
                }
            }
            return;
        }

        // ---- Étape 3 : traiter la queue d'actions ----
        const queue = s.queue || {};
        const entrees = Object.values(queue).sort((a, b) => (a.id || 0) - (b.id || 0));
        entrees.forEach(e => {
            if (!e || !e.action) return;
            if (e.par === monPseudo) return;
            if (e.id <= _dernierIdTraite) return;
            _dernierIdTraite = e.id;
            console.log('[Multi] 🎬 Action reçue :', e.action.type, 'de', e.par);
            traiterActionRecue(e.action);
        });
    });
}

/* ---------- Traiter une action reçue ---------- */
async function traiterActionRecue(a) {
    switch (a.type) {
        case 'jouer': {
            const idx = B.main.findIndex(c => c.id === a.id);
            if (idx < 0) {
                console.warn('[Multi] ⚠️ Carte', a.id, 'introuvable dans la main adverse');
                return;
            }
            const carte = B.main[idx];
            let cible = null;
            if (a.cibleUid) cible = [...J.plateau, ...B.plateau].find(m => m.uid === a.cibleUid) || null;
            else if (a.cibleHero) cible = (a.cibleHero === 'J') ? J : B;

            if (carte.rarete === 'fusion') sacrifierPourFusion(B, carte.id);
            jouerCarte(B, idx, cible);
            break;
        }
        case 'attaque': {
            const attaquant = B.plateau.find(m => m.uid === a.uid);
            if (!attaquant) {
                console.warn('[Multi] ⚠️ Attaquant introuvable :', a.uid);
                return;
            }
            let cible = null;
            if (a.cibleUid) cible = J.plateau.find(m => m.uid === a.cibleUid);
            else if (a.cibleHero) cible = (a.cibleHero === 'J') ? J : B;
            if (!cible) {
                console.warn('[Multi] ⚠️ Cible introuvable');
                return;
            }
            attaquant._replay = true;
            await attaquer(attaquant, cible);
            attaquant._replay = false;
            break;
        }
        case 'fin': {
            console.log('[Multi] 🔵 Fin du tour adverse → à moi !');
            await pause(400);
            appliquerFinDeTour(B);
            B.surcout = 0;
            if (B.voitMainAdverse > 0) B.voitMainAdverse--;
            rafraichirJeu();
            verifierFin();
            if (partieFinie) return;
            modeAttente = false;
            tourActuel = 'joueur';
            debutTourJoueur();
            break;
        }
        default:
            console.warn('[Multi] Type d\'action inconnu :', a.type);
    }
}

/* ---------- Mulligan ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    console.log('[Multi] ✅ Mulligan validé');
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true });
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

/* ---------- Nettoyage ---------- */
window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});
