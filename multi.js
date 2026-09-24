/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v5 — Admin + Auth + MotD)
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
    const x = normaliserPseudo(a);
    const y = normaliserPseudo(b);
    return 'p_' + [x, y].sort().join('_vs_');
}

function cleEmail(email) {
    return (email || '').toLowerCase().replace(/\./g, '_');
}

/* ---------- Init Firebase ---------- */
function initFirebase() {
    if (typeof firebase === 'undefined') { 
        console.error('[FB] SDK absent'); 
        return; 
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    fbDB = firebase.database();

    // Identifiant unique de session (pour cette fenêtre)
    monId = sessionStorage.getItem('ftcg_monId');
    if (!monId) {
        monId = 'j_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('ftcg_monId', monId);
    }

    // Récupère le pseudo depuis le profil (auth simulée)
    if (typeof profil !== 'undefined' && profil && profil.pseudo) {
        monPseudo = normaliserPseudo(profil.pseudo);
        window.monPseudo = monPseudo;
    } else if (typeof window.monPseudo !== 'undefined') {
        monPseudo = normaliserPseudo(window.monPseudo);
    } else {
        monPseudo = normaliserPseudo(J?.nom || 'anonyme');
    }
    console.log('[Multi] init — monPseudo =', monPseudo);

    // Vérifie si le pseudo est bloqué
    fbDB.ref('bloques/' + monPseudo).once('value').then(snap => {
        if (snap.val()) {
            alert('Ce pseudo a été bloqué par un administrateur.');
            sessionStorage.clear();
            location.reload();
        }
    });

    // Écoute les kicks (déconnexion forcée)
    fbDB.ref('kicks/' + monPseudo).on('value', snap => {
        if (snap.val()) {
            alert('Tu as été déconnecté par un administrateur.');
            fbDB.ref('kicks/' + monPseudo).remove();
            sessionStorage.clear();
            location.reload();
        }
    });

    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');
    
    fbUserRef.onDisconnect().remove();
    fbUserRef.set({
        pseudo: (typeof profil !== 'undefined' && profil && profil.pseudo) ? profil.pseudo : (J?.nom || 'Anonyme'),
        pseudoNorm: monPseudo,
        email: (typeof profil !== 'undefined' && profil && profil.email) ? profil.email : null,
        etat: 'libre',
        dernierPing: Date.now()
    });

    fbJoueursRef.on('value', snap => afficherListeJoueurs(snap.val() || {}));

    // MotD (Porte-Voix)
    fbDB.ref('motd').on('value', snap => {
        const d = snap.val();
        if (d && d.texte && d.actif) afficherMotD(d.texte);
    });

    // Écoute des défis reçus
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

    // Écoute des salles
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

    // Charge l'équilibrage live (stats des cartes) si présent
    chargerEquilibrageLive();
}

/* ---------- MotD (Porte-Voix) ---------- */
function afficherMotD(texte) {
    const el = document.getElementById('motd-banniere');
    if (!el) return;
    el.innerText = texte;
    el.classList.add('open');
    // Disparaît après 12s
    setTimeout(() => el.classList.remove('open'), 12000);
}

/* ---------- Équilibrage live ---------- */
async function chargerEquilibrageLive() {
    if (!fbDB) return;
    try {
        const snap = await fbDB.ref('dbCartesLive').once('value');
        const data = snap.val();
        if (!data) return;
        // Applique les overrides sur dbCartes
        Object.entries(data).forEach(([id, overrides]) => {
            const carte = dbCartes.find(c => c.id === id);
            if (carte) Object.assign(carte, overrides);
        });
        console.log('[Multi] ⚖️ Équilibrage live appliqué');
    } catch (e) {
        console.warn('[Multi] Erreur chargement équilibrage', e);
    }
}

/* ---------- Liste joueurs ---------- */
function rafraichirJoueurs() { 
    if (!fbDB) initFirebase(); 
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
        de: monPseudo, 
        dePseudo: (typeof profil !== 'undefined' && profil && profil.pseudo) ? profil.pseudo : (J?.nom || 'Anonyme'), 
        deId: monId,
        etat: 'en_attente', 
        timestamp: Date.now()
    });

    if (_ecouteurDefiEnvoye) { 
        _ecouteurDefiEnvoye.off(); 
        _ecouteurDefiEnvoye = null; 
    }
    
    _ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    _ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d || d.de !== monPseudo) return;
        
        if (d.etat === 'accepte' && d.partieId) {
            console.log('[Multi] ✅ Défi accepté, partieId =', d.partieId);
            
            if (_ecouteurDefiEnvoye) { 
                _ecouteurDefiEnvoye.off(); 
                _ecouteurDefiEnvoye = null; 
            }
            
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);
            
            _partieIdEnCours = d.partieId;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            
            ecouterSalle(d.partieId);
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
        
        if (d.etat === 'refuse') {
            console.log('[Multi] ❌ Défi refusé');
            flashInfo(`${pseudoCible} a refusé le défi.`);
            
            if (_ecouteurDefiEnvoye) { 
                _ecouteurDefiEnvoye.off(); 
                _ecouteurDefiEnvoye = null; 
            }
            
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
    
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({ 
        pret: true, 
        deck: deckIds, 
        mulligan: false 
    });
}

function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    
    console.log('[Multi] ✅ Mulligan validé et envoyé');
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true });
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

        // ---- ÉTAPE 1 : Lancement de l'interface Mulligan ----
        if (decksPrets && !dejaLancee) {
            console.log('[Multi] ✅ Decks prêts — Ouverture du Mulligan');
            dejaLancee = true;
            
            window.multiPartie = {
                active: true, 
                adversaireId: pseudoAdverse, 
                partieId: partieId, 
                refSalle: refSalle,
                role: roleLocal, 
                jeCommence: (roleLocal === 'joueur1'),
                demarrageTraite: false
            };
            
            lancerPartieMultijoueur(pseudoAdverse, mesInfos.deck, infosAdv.deck);
        }
        
        if (!dejaLancee) return;

        // ---- ÉTAPE 2 : Début réel de la partie (après Mulligan) ----
        if (!window.multiPartie.demarrageTraite) {
            const mesMull = mesInfos.mulligan === true;
            const advMull = infosAdv.mulligan === true;
            
            if (mesMull && advMull) {
                console.log('[Multi] 🚀 Démarrage officiel. jeCommence =', window.multiPartie.jeCommence);
                window.multiPartie.demarrageTraite = true;
                fermerAttente();

                if (window.multiPartie.jeCommence) {
                    J.premier = true; 
                    B.premier = false;
                    
                    B.numTour = 0;
                    B.manaMax = 3;
                    B.manaActuel = 0;
                    
                    modeEnLigne = true;
                    modeAttente = false;
                    tourActuel = 'joueur';
                    
                    debutTourJoueur(); 
                } else {
                    J.premier = false; 
                    B.premier = true;
                    
                    J.numTour = 0;
                    J.manaMax = 3;
                    J.manaActuel = 0;
                    
                    modeEnLigne = true;
                    modeAttente = true;
                    tourActuel = 'attente';
                    
                    document.getElementById('tour-indicateur').innerText = 'Tour adverse';
                    document.querySelector('.turn-pill').classList.add('bot');
                    document.getElementById('btn-endturn').classList.add('inactif');
                    info('L\'adversaire commence la partie…');
                    
                    prochainManaMax(B);
                    piocher(B, 1);
                    rafraichirJeu();
                }
            }
        }

        // ---- ÉTAPE 3 : File d'attente d'actions en combat ----
        if (window.multiPartie.demarrageTraite) {
            const queue = s.queue || {};
            const entrees = Object.values(queue).sort((a, b) => (a.id || 0) - (b.id || 0));
            
            entrees.forEach(e => {
                if (!e || !e.action) return;
                if (e.par === monPseudo) return;
                if (e.id <= _dernierIdTraite) return;
                
                _dernierIdTraite = e.id;
                console.log('[Multi] 🎬 Action reçue :', e.action.type);
                traiterActionRecue(e.action);
            });
        }

        // ---- ÉTAPE 4 : Émotes reçues ----
        const emotes = s.emotes || {};
        Object.entries(emotes).forEach(([pseudo, e]) => {
            if (pseudo === monPseudo) return;
            if (!e || !e.ts) return;
            if (_dernieresEmotesVues[pseudo] === e.ts) return;
            _dernieresEmotesVues[pseudo] = e.ts;
            afficherBulleEmote(B, e.txt, e.emoji);
            logAction('emote', `${pseudo} : ${e.txt}`, e.emoji);
        });
    });
}

let _dernieresEmotesVues = {};

/* ---------- Traiter une action reçue ---------- */
async function traiterActionRecue(a) {
    switch (a.type) {
        case 'jouer': {
            let idx = B.main.findIndex(c => c.id === a.id);
            
            if (idx < 0) {
                const fausseCarte = instancier(defCarte(a.id), 'B');
                B.main.push(fausseCarte);
                idx = B.main.length - 1;
            }
            
            const carte = B.main[idx];
            let cible = null;
            
            if (a.idxCible !== null && a.campCible !== null) {
                const targetSide = (a.campCible === 'J') ? B : J;
                cible = targetSide.plateau[a.idxCible];
            } else if (a.cibleHero) {
                cible = (a.cibleHero === 'J') ? B : J;
            }

            if (carte.rarete === 'fusion') sacrifierPourFusion(B, carte.id);
            jouerCarte(B, idx, cible);
            break;
        }
        
        case 'attaque': {
            const attaquant = B.plateau[a.idxAttaquant];
            let cible = null;
            
            if (a.idxCible !== null && a.campCible !== null) {
                const targetSide = (a.campCible === 'J') ? B : J;
                cible = targetSide.plateau[a.idxCible];
            } else if (a.cibleHero) {
                cible = (a.cibleHero === 'J') ? B : J;
            }
            
            if (!attaquant || !cible) {
                console.warn('[Multi] ⚠️ Attaquant ou cible introuvable', a);
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

/* ===========================================================
   PANNEAU ADMIN
   =========================================================== */

let _adminListeners = [];

function initAdminPanel() {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    
    // Nettoie les anciens listeners
    _adminListeners.forEach(l => { try { l.off(); } catch(e){} });
    _adminListeners = [];
    
    // --- BANQUE : liste joueurs pour cibler ---
    const refJoueursAdmin = fbDB.ref('joueurs');
    const cbJoueurs = refJoueursAdmin.on('value', snap => {
        const data = snap.val() || {};
        const sel = document.getElementById('admin-banque-joueur');
        if (!sel) return;
        sel.innerHTML = '';
        Object.entries(data).forEach(([id, j]) => {
            const o = document.createElement('option');
            o.value = id;
            o.innerText = j.pseudo || j.email || id;
            sel.appendChild(o);
        });
    });
    _adminListeners.push({ off: () => refJoueursAdmin.off('value', cbJoueurs) });

    // --- CONCIERGE : liste des salles ---
    const refSalles = fbDB.ref('salles');
    const cbSalles = refSalles.on('value', snap => {
        const data = snap.val() || {};
        const contenu = document.getElementById('admin-concierge-liste');
        if (!contenu) return;
        contenu.innerHTML = '';
        const salles = Object.entries(data);
        if (!salles.length) {
            contenu.innerHTML = '<p class="hint">Aucune salle active.</p>';
            return;
        }
        salles.forEach(([id, s]) => {
            const div = document.createElement('div');
            div.className = 'admin-ligne';
            const joueurs = s.joueurs ? Object.keys(s.joueurs).join(', ') : '—';
            const etat = s.etat || '?';
            const age = s.timestamp ? Math.round((Date.now() - s.timestamp) / 1000) + 's' : '?';
            div.innerHTML = `
                <div>
                    <strong>${id}</strong><br>
                    <small>${etat} — ${joueurs} — ${age}</small>
                </div>
                <button class="btn-action" onclick="adminFermerSalle('${id}')">Fermer</button>
            `;
            contenu.appendChild(div);
        });
    });
    _adminListeners.push({ off: () => refSalles.off('value', cbSalles) });

    // --- TRIBUNAL : liste joueurs connectés ---
    const refTribunal = fbDB.ref('joueurs');
    const cbTribunal = refTribunal.on('value', snap => {
        const data = snap.val() || {};
        const contenu = document.getElementById('admin-tribunal-liste');
        if (!contenu) return;
        contenu.innerHTML = '';
        const joueurs = Object.entries(data);
        if (!joueurs.length) {
            contenu.innerHTML = '<p class="hint">Aucun joueur connecté.</p>';
            return;
        }
        joueurs.forEach(([id, j]) => {
            const div = document.createElement('div');
            div.className = 'admin-ligne';
            div.innerHTML = `
                <div>
                    <strong>${j.pseudo || 'Anonyme'}</strong><br>
                    <small>${j.email || '—'} — ${j.etat || '?'}</small>
                </div>
                <div class="admin-actions">
                    <button class="btn-action" onclick="adminKick('${j.pseudoNorm || ''}')">Kick</button>
                    <button class="btn-action danger" onclick="adminBloquer('${j.pseudoNorm || ''}')">Bloquer</button>
                </div>
            `;
            contenu.appendChild(div);
        });
    });
    _adminListeners.push({ off: () => refTribunal.off('value', cbTribunal) });

    // --- PORTE-VOIX : MotD actuel ---
    fbDB.ref('motd').once('value').then(snap => {
        const d = snap.val();
        const zone = document.getElementById('admin-motd-texte');
        const actif = document.getElementById('admin-motd-actif');
        if (d) {
            if (zone) zone.value = d.texte || '';
            if (actif) actif.checked = !!d.actif;
        }
    });

    // --- ÉQUILIBRAGE : liste cartes ---
    afficherAdminEquilibrage();
}

/* ---------- Banque admin ---------- */
async function adminDebloquerToutPourCible() {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    const sel = document.getElementById('admin-banque-joueur');
    if (!sel || !sel.value) return flashInfo('Choisis un joueur.');
    
    const snap = await fbDB.ref('joueurs/' + sel.value).once('value');
    const j = snap.val();
    if (!j || !j.email) return flashInfo('Email du joueur introuvable.');
    
    if (!confirm(`Débloquer TOUTES les cartes (5x) pour ${j.pseudo} ?`)) return;
    
    const refCompte = fbDB.ref('comptes/' + cleEmail(j.email));
    const snapC = await refCompte.once('value');
    const compte = snapC.val() || {};
    compte.collection = compte.collection || {};
    dbCartes.forEach(c => compte.collection[c.id] = 5);
    await refCompte.update({ collection: compte.collection });
    flashInfo('Cartes débloquées pour ' + j.pseudo);
}

async function adminDonner100Boosters() {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    const sel = document.getElementById('admin-banque-joueur');
    if (!sel || !sel.value) return flashInfo('Choisis un joueur.');
    
    const snap = await fbDB.ref('joueurs/' + sel.value).once('value');
    const j = snap.val();
    if (!j || !j.email) return flashInfo('Email du joueur introuvable.');
    
    if (!confirm(`Donner 100 boosters (=500 cartes) à ${j.pseudo} ?`)) return;
    
    const refCompte = fbDB.ref('comptes/' + cleEmail(j.email));
    const snapC = await refCompte.once('value');
    const compte = snapC.val() || {};
    compte.collection = compte.collection || {};
    for (let i = 0; i < 500; i++) {
        const r = Math.random();
        let rarete = r > 0.98 ? 'fusion' : r > 0.93 ? 'legendaire' : r > 0.82 ? 'epique' : r > 0.58 ? 'rare' : 'commune';
        const pool = dbCartes.filter(c => c.rarete === rarete);
        const carte = pool[Math.floor(Math.random() * pool.length)];
        compte.collection[carte.id] = (compte.collection[carte.id] || 0) + 1;
    }
    await refCompte.update({ collection: compte.collection });
    flashInfo('100 boosters donnés à ' + j.pseudo);
}

async function adminDonnerCoins() {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    const sel = document.getElementById('admin-banque-joueur');
    const montant = parseInt(document.getElementById('admin-banque-coins').value) || 0;
    if (!sel || !sel.value || !montant) return flashInfo('Choisis un joueur et un montant.');
    
    const snap = await fbDB.ref('joueurs/' + sel.value).once('value');
    const j = snap.val();
    if (!j || !j.email) return flashInfo('Email du joueur introuvable.');
    
    const refCompte = fbDB.ref('comptes/' + cleEmail(j.email));
    const snapC = await refCompte.once('value');
    const compte = snapC.val() || {};
    compte.coins = (compte.coins || 0) + montant;
    await refCompte.update({ coins: compte.coins });
    flashInfo(`+${montant} coins à ${j.pseudo}`);
}

/* ---------- Concierge admin ---------- */
function adminFermerSalle(id) {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    if (!confirm(`Fermer/nettoyer la salle ${id} ?`)) return;
    fbDB.ref('salles/' + id).remove();
    flashInfo('Salle fermée.');
}

/* ---------- Porte-Voix admin ---------- */
function adminPublierMotD() {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    const texte = document.getElementById('admin-motd-texte').value.trim();
    const actif = document.getElementById('admin-motd-actif').checked;
    fbDB.ref('motd').set({ texte, actif, ts: Date.now() });
    flashInfo('MotD publié.');
}

function adminEffacerMotD() {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    fbDB.ref('motd').remove();
    document.getElementById('admin-motd-texte').value = '';
    document.getElementById('admin-motd-actif').checked = false;
    flashInfo('MotD effacé.');
}

/* ---------- Tribunal admin ---------- */
function adminKick(pseudoNorm) {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    if (!pseudoNorm) return;
    if (!confirm(`Déconnecter de force ${pseudoNorm} ?`)) return;
    fbDB.ref('kicks/' + pseudoNorm).set({ ts: Date.now() });
    flashInfo('Kick envoyé.');
}

function adminBloquer(pseudoNorm) {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    if (!pseudoNorm) return;
    if (!confirm(`Bloquer le pseudo ${pseudoNorm} ?`)) return;
    fbDB.ref('bloques/' + pseudoNorm).set({ ts: Date.now() });
    flashInfo('Pseudo bloqué.');
}

function adminDebloquer(pseudoNorm) {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    if (!pseudoNorm) return;
    fbDB.ref('bloques/' + pseudoNorm).remove();
    flashInfo('Pseudo débloqué.');
}

/* ---------- Équilibrage admin ---------- */
function afficherAdminEquilibrage() {
    const contenu = document.getElementById('admin-equilibrage-liste');
    if (!contenu) return;
    contenu.innerHTML = '';
    
    const filtre = (document.getElementById('admin-equilibrage-filtre')?.value || '').toLowerCase();
    const liste = dbCartes.filter(c => !filtre || c.prenom.toLowerCase().includes(filtre));
    
    liste.forEach(c => {
        const div = document.createElement('div');
        div.className = 'admin-ligne';
        div.innerHTML = `
            <div>
                <strong>${c.emoji || ''} ${c.prenom}</strong><br>
                <small>${c.rarete} — ${c.famille}</small>
            </div>
            <div class="admin-stats">
                <label>Coût <input type="number" id="eq-cout-${c.id}" value="${c.cout}" min="0" max="10"></label>
                <label>ATK <input type="number" id="eq-atk-${c.id}" value="${c.atk}" min="0" max="20"></label>
                <label>PV <input type="number" id="eq-vie-${c.id}" value="${c.vie}" min="0" max="20"></label>
                <button class="btn-action" onclick="adminSauverCarte('${c.id}')">💾</button>
            </div>
        `;
        contenu.appendChild(div);
    });
}

function adminSauverCarte(id) {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    const cout = parseInt(document.getElementById('eq-cout-' + id).value);
    const atk = parseInt(document.getElementById('eq-atk-' + id).value);
    const vie = parseInt(document.getElementById('eq-vie-' + id).value);
    
    fbDB.ref('dbCartesLive/' + id).set({ cout, atk, vie });
    
    // Applique en local
    const carte = dbCartes.find(c => c.id === id);
    if (carte) { carte.cout = cout; carte.atk = atk; carte.vie = vie; }
    
    flashInfo('Carte ' + id + ' mise à jour.');
}

function adminReinitialiserCarte(id) {
    if (typeof estAdmin !== 'function' || !estAdmin()) return;
    fbDB.ref('dbCartesLive/' + id).remove();
    flashInfo('Carte ' + id + ' réinitialisée (recharge la page).');
}
