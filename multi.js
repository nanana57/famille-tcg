/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (Correction des tableaux vides et UI)
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
            if (!s || !s.joueurs || !s.joueurs[monPseudo] || dejaLancee || _partieIdEnCours === partieId) return;

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

/* ---------- Défier : le challenger envoie une notification ---------- */
function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo || !pseudoCible || pseudoCible === monPseudo) return;

    _pseudoCibleEnCours = pseudoCible;
    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo,
        dePseudo: J.nom || 'Anonyme',
        deId: monId,
        etat: 'en_attente',
        timestamp: Date.now()
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

/* ---------- Refuser le défi ---------- */
function refuserDefi() {
    const defi = window._defiEnCours;
    if (!defi) return;
    fbDB.ref('defis/' + monPseudo).update({ etat: 'refuse', refusePar: monPseudo });
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 3000);
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;
}

/* ---------- Annonce du deck ---------- */
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
        const pseudoAdverse = pseudos.find(x => x !== monPseudo);

        const mesInfos = s.joueurs[monPseudo] || {};
        const infosAdv = s.joueurs[pseudoAdverse] || {};
        const monDeck = mesInfos.deck;
        const advDeck = infosAdv.deck;
        const decksPrets = Array.isArray(monDeck) && monDeck.length === 20 && Array.isArray(advDeck) && advDeck.length === 20;

        if (decksPrets && !dejaLancee) {
            dejaLancee = true;
            window.multiPartie = {
                active: true, adversaireId: pseudoAdverse, partieId, refSalle, role: roleLocal,
                jeCommence: (roleLocal === 'joueur1'), mulliganEnvoye: false, demarrageTraite: false
            };
            lancerPartieMultijoueur(pseudoAdverse, monDeck, advDeck);
            return;
        }
        if (!dejaLancee) return;

        if (!window.multiPartie.demarrageTraite) {
            const mesMull = mesInfos.mulligan === true;
            const advMull = infosAdv.mulligan === true;
            if (mesMull && advMull) {
                window.multiPartie.demarrageTraite = true;
                
                J.premier = window.multiPartie.jeCommence;
                B.premier = !window.multiPartie.jeCommence;

                if (window.multiPartie.jeCommence) {
                    tourActuel = 'joueur';
                    modeAttente = false;
                    fermerAttente();
                    info('À toi de jouer. Choisis une action.');
                    debutTourJoueur();
                    publierEtat();
                } else {
                    modeAttente = true;
                    tourActuel = 'bot';
                    document.getElementById('tour-indicateur').innerText = 'Tour adverse';
                    document.querySelector('.turn-pill').classList.add('bot');
                    document.getElementById('btn-endturn').classList.add('inactif');
                    info('L\'adversaire réfléchit...');
                    fermerAttente(); 
                }
            }
        }

        const etat = s.etat_data;
        if (etat && etat.par && etat.par !== monPseudo && window.multiPartie && window.multiPartie.active) {
            appliquerEtatAdverse(etat);
        }
    });
}

/* ---------- Mulligan ---------- */
function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true });
}

/* ---------- Publication état ---------- */
function publierEtat() {
    if (!window.multiPartie || !window.multiPartie.active) return;
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
    
    // CORRECTION MAJEURE: Le "|| []" protège contre le fait que Firebase supprime les tableaux vides
    side.deck = (data.deckIds || []).map(id => instancier(defCarte(id), side.cle));
    side.main = (data.main || []).map(o => {
        const inst = instancier(defCarte(o.id), side.cle);
        inst.uid = o.uid;
        return inst;
    });
    side.plateau = (data.plateau || []).map(o => {
        const def = defCarte(o.id);
        return {
            uid:o.uid, id:o.id, prenom:o.prenom, emoji:o.emoji,
            famille: def ? def.famille : 'Neutre',
            cout: def ? def.cout : 0,
            rarete: def ? def.rarete : 'commune',
            desc: def ? def.desc : '',
            atk:o.atk, vie:o.vie, vieMax:o.vieMax,
            auraAtk:o.auraAtk || 0, auraVieAppliquee:o.auraVieAppliquee || 0,
            motsCles:o.motsCles || [],
            aAttaque:!!o.aAttaque, malade:!!o.malade,
            gele:o.gele || 0, silence:!!o.silence, jeton:!!o.jeton,
            cote: side.cle
        };
    });
    
    if (data.terrain) {
        const inst = instancier(defCarte(data.terrain.id), side.cle);
        inst.uid = data.terrain.uid;
        side.terrain = inst;
    } else {
        side.terrain = null;
    }
}

/* ---------- Application état adverse ---------- */
function appliquerEtatAdverse(etat) {
    if (!monRole) return;
    const roleAdverse = monRole === 'joueur1' ? 'joueur2' : 'joueur1';
    
    deserialiserCote(J, etat[monRole]);
    deserialiserCote(B, etat[roleAdverse]);

    let debutDeMonTour = false;

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
        info('À toi de jouer. Choisis une action.');
        
        debutDeMonTour = true;
    } else {
        modeAttente = true;
        tourActuel = 'bot';
        document.getElementById('tour-indicateur').innerText = 'Tour adverse';
        document.querySelector('.turn-pill').classList.add('bot');
        document.getElementById('btn-endturn').classList.add('inactif');
        info('L\'adversaire réfléchit...');
        fermerAttente();
    }
    
    rafraichirJeu();
    verifierFin();
    
    // Si c'est mon tour, j'envoie mon état pour actualiser mon mana et mes cartes chez l'adversaire
    if (debutDeMonTour) {
        publierEtat();
    }
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
