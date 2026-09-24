/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (Édition Ultime v3)
   =========================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyB7zw74kk9Xp1gF3OFpwnG1bJ3935yZMJY",
    authDomain: "famille-tcg.firebaseapp.com",
    databaseURL: "https://famille-tcg-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "famille-tcg",
    storageBucket: "famille-tcg.firebasestorage.app",
    messagingSenderId: "258877697356",
    appId: "1:258877697356:web:534d00175517add7f4b3e9"
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
let _ecouteurDefiEnvoye = null;
let _salleRef = null;

function normaliserPseudo(p) {
    return (p || 'anonyme').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').slice(0, 20);
}
function calculerPartieId(a, b) { return 'p_' + [normaliserPseudo(a), normaliserPseudo(b)].sort().join('_vs_'); }

// Init Firebase après que app.js soit prêt
window.onAppPret = function() {
    initFirebase();
};

function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn("Firebase non chargé");
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        fbDB = firebase.database();

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                monId = user.uid;
                initApresAuth(user);
            }
        });
    } catch(e) {
        console.error("Firebase a été bloqué par le navigateur.", e);
    }

    const elLogin = document.getElementById('auth-password-login');
    if (elLogin) elLogin.addEventListener('keydown', e => { if(e.key === 'Enter') connexionCompte(); });

    const elReg = document.getElementById('auth-password-reg');
    if (elReg) elReg.addEventListener('keydown', e => { if(e.key === 'Enter') creerCompte(); });
}

document.addEventListener("DOMContentLoaded", () => {
    // Si app.js est déjà prêt, on init
    if (window.appPret) initFirebase();
});

/* Authentification */
function toggleAuthMode(mode) {
    if (mode === 'register') {
        document.getElementById('box-login').classList.add('hidden');
        document.getElementById('box-register').classList.remove('hidden');
    } else {
        document.getElementById('box-register').classList.add('hidden');
        document.getElementById('box-login').classList.remove('hidden');
    }
}

function lancerModeHorsLigne(pseudoForce, emailForce) {
    if (typeof J === 'undefined' || typeof changerEcran !== 'function') {
        setTimeout(() => lancerModeHorsLigne(pseudoForce, emailForce), 300);
        return;
    }

    J.nom = pseudoForce || "Joueur_" + Math.floor(Math.random() * 1000);
    monPseudo = normaliserPseudo(J.nom);

    const disp = document.getElementById('display-pseudo');
    if (disp) disp.innerText = J.nom;

    const hero = document.getElementById('hero-name');
    if (hero) hero.innerText = J.nom;

    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.remove('hidden');

    if (typeof chargerProgression === 'function') chargerProgression(emailForce);
    if (typeof changerEcran === 'function') changerEcran('menu-screen');
}

function connexionCompte() {
    const err = document.getElementById('auth-error-login');
    const ident = document.getElementById('auth-ident-login').value.trim();
    const pwd = document.getElementById('auth-password-login').value;
    err.innerText = "Connexion en cours...";

    if(!ident || !pwd) { err.innerText = "Identifiant et mot de passe requis."; return; }

    if (typeof firebase === 'undefined' || !fbDB) {
        err.innerText = "Firebase bloqué. Lancement hors ligne...";
        setTimeout(() => lancerModeHorsLigne(ident, ident), 800);
        return;
    }

    let timeout = setTimeout(() => {
        if (err.innerText === "Connexion en cours...") {
            err.innerText = "Le serveur ne répond pas. Passage en mode hors ligne...";
            setTimeout(() => lancerModeHorsLigne(ident, ident), 1000);
        }
    }, 6000);

    try {
        if (ident.includes('@')) {
            firebase.auth().signInWithEmailAndPassword(ident, pwd).then(() => {
                clearTimeout(timeout);
                err.innerText = "Connecté !";
            }).catch(e => {
                clearTimeout(timeout);
                err.innerText = "Erreur : " + e.message;
            });
        } else {
            const pseudoNorm = normaliserPseudo(ident);
            fbDB.ref('pseudos_reserves/' + pseudoNorm).once('value').then(snap => {
                if (snap.exists() && snap.val().email) {
                    firebase.auth().signInWithEmailAndPassword(snap.val().email, pwd).then(() => {
                        clearTimeout(timeout);
                        err.innerText = "Connecté !";
                    }).catch(() => {
                        clearTimeout(timeout);
                        err.innerText = "Mot de passe incorrect.";
                    });
                } else {
                    clearTimeout(timeout);
                    err.innerText = "Pseudo introuvable. Inscris-toi !";
                }
            }).catch(() => {
                clearTimeout(timeout);
                err.innerText = "Base de données bloquée. Lancement hors ligne...";
                setTimeout(() => lancerModeHorsLigne(ident, null), 1000);
            });
        }
    } catch (e) {
        clearTimeout(timeout);
        err.innerText = "Erreur locale. Lancement hors ligne...";
        setTimeout(() => lancerModeHorsLigne(ident, null), 1000);
    }
}

function creerCompte() {
    const err = document.getElementById('auth-error-reg');
    const pseudo = document.getElementById('auth-pseudo-reg').value.trim();
    const email = document.getElementById('auth-email-reg').value.trim().toLowerCase();
    const pwd = document.getElementById('auth-password-reg').value;

    err.innerText = "Création du compte en cours...";

    if(!pseudo || !email || !pwd) { err.innerText = "Tous les champs sont requis."; return; }
    if (pwd.length < 6) { err.innerText = "Le mot de passe doit faire au moins 6 caractères."; return; }

    if (typeof firebase === 'undefined' || !fbDB) {
        err.innerText = "Firebase bloqué. Lancement hors ligne...";
        setTimeout(() => lancerModeHorsLigne(pseudo, email), 800);
        return;
    }

    let timeout = setTimeout(() => {
        if(err.innerText === "Création du compte en cours...") {
            err.innerText = "Le serveur ne répond pas. Passage en mode hors ligne...";
            setTimeout(() => lancerModeHorsLigne(pseudo, email), 1000);
        }
    }, 6000);

    try {
        firebase.auth().createUserWithEmailAndPassword(email, pwd)
            .then(creds => {
                clearTimeout(timeout);
                err.innerText = "Compte créé avec succès !";
                if(fbDB) {
                    const pseudoNorm = normaliserPseudo(pseudo);
                    fbDB.ref('profils/' + creds.user.uid).set({ pseudo: pseudo, email: email }).catch(()=>{});
                    fbDB.ref('pseudos_reserves/' + pseudoNorm).set({ uid: creds.user.uid, email: email }).catch(()=>{});
                }
            })
            .catch(e => {
                clearTimeout(timeout);
                err.innerText = "Erreur : " + e.message;
            });
    } catch(e) {
        clearTimeout(timeout);
        err.innerText = "Erreur locale. Lancement hors ligne...";
        setTimeout(() => lancerModeHorsLigne(pseudo, email), 1000);
    }
}

function initApresAuth(user) {
    try {
        if (user && user.email === 'nassim57132@gmail.com') {
            const adminBtn = document.getElementById('nav-admin');
            if(adminBtn) adminBtn.classList.remove('hidden');
        }

        if (('ontouchstart' in window) && window.innerWidth <= 1366) {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }

        if(fbDB && user) {
            fbDB.ref('profils/' + user.uid).once('value').then(snap => {
                let p = snap.val();
                let pseudo = (p && p.pseudo) ? p.pseudo : "Joueur_" + Math.floor(Math.random()*1000);
                lancerModeHorsLigne(pseudo, user.email);
                setupFirebaseListeners();
            }).catch(() => {
                lancerModeHorsLigne("Joueur_" + Math.floor(Math.random()*1000), user.email);
                setupFirebaseListeners();
            });
        } else {
            lancerModeHorsLigne("Joueur_" + Math.floor(Math.random()*1000), user ? user.email : null);
        }
    } catch (e) {
        console.error(e);
        lancerModeHorsLigne("Joueur_Erreur", null);
    }
}

function setupFirebaseListeners() {
    if (!fbDB || !monId) return;
    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');

    fbUserRef.onDisconnect().remove();
    fbUserRef.set({ pseudo: J.nom, pseudoNorm: monPseudo, etat: 'libre', dernierPing: Date.now() });

    fbJoueursRef.on('value', snap => afficherListeJoueurs(snap.val() || {}));

    fbDB.ref('motd').on('value', snap => {
        const msg = snap.val();
        const banner = document.getElementById('motd-banner');
        if (banner) {
            if(msg) { banner.innerText = msg; banner.classList.remove('hidden'); }
            else { banner.classList.add('hidden'); }
        }
    });

    fbDB.ref('defis/' + monPseudo).on('value', snap => {
        const d = snap.val();
        if (!d) return;
        if (d.de && d.de !== monPseudo && d.etat === 'en_attente') afficherDefiRecu(d);
        if (d.etat !== 'en_attente') { const ov = document.getElementById('defi-overlay'); if (ov) ov.classList.remove('open'); }
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

function rafraichirJoueurs() {
    if (!fbDB) {
        if (window.appPret) initFirebase();
    } else {
        setupFirebaseListeners();
    }
}

function afficherListeJoueurs(data) {
    const liste = document.getElementById('multi-liste');
    const count = document.getElementById('multi-count');
    const combatCount = document.getElementById('multi-combat-count');
    if (!liste) return;
    const joueurs = Object.entries(data).filter(([id]) => id !== monId);
    let enCombat = 0;
    liste.innerHTML = '';
    if (joueurs.length === 0) liste.innerHTML = '<p class="hint">Aucun autre joueur connecté.</p>';
    joueurs.forEach(([id, j]) => {
        if (j.etat === 'en_combat') enCombat++;
        const div = document.createElement('div');
        div.className = 'multi-joueur';
        const libre = j.etat === 'libre';
        const cible = j.pseudoNorm || normaliserPseudo(j.pseudo);
        const moiMeme = (cible === monPseudo);
        div.innerHTML = `<div><div class="mj-nom">${j.pseudo || 'Anonyme'}</div><div class="mj-etat ${libre ? 'libre' : 'en-combat'}">${libre ? '● Disponible' : '⚔ En combat'}</div></div><button ${(libre && !moiMeme) ? '' : 'disabled'} onclick="defierJoueur('${cible}')">${moiMeme ? 'Toi' : (libre ? 'Défier' : 'Occupé')}</button>`;
        liste.appendChild(div);
    });
    if (count) count.innerText = `${joueurs.length} joueur(s) connecté(s)`;
    if (combatCount) combatCount.innerText = `${enCombat} en combat`;
}

function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo || !pseudoCible || pseudoCible === monPseudo) return;
    fbDB.ref('defis/' + pseudoCible).set({ de: monPseudo, dePseudo: J.nom, deId: monId, etat: 'en_attente', timestamp: Date.now() });
    if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
    _ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    _ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d || d.de !== monPseudo) return;
        if (d.etat === 'accepte' && d.partieId) {
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);
            _partieIdEnCours = d.partieId;
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            ecouterSalle(d.partieId);
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
        if (d.etat === 'refuse') {
            alert(`${pseudoCible} a refusé le défi.`);
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 1500);
        }
    });
}

function afficherDefiRecu(defi) {
    window._defiEnCours = defi;
    const txt = document.getElementById('defi-texte');
    if (txt) txt.innerText = `${defi.dePseudo} te défie en duel !`;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.add('open');
}

function accepterDefi() {
    const defi = window._defiEnCours;
    if (!defi || !fbDB) return;
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
            [monPseudo]: { pret: false, deck: null, mulligan: false },
            [pseudoAdverse]: { pret: false, deck: null, mulligan: false }
        }
    });
    fbDB.ref('defis/' + monPseudo).update({ etat: 'accepte', partieId, acceptePar: monPseudo });
    fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 5000);
    ecouterSalle(partieId);
    ouvrirChoixDeckEnLigne(pseudoAdverse);
}

function refuserDefi() {
    if (!fbDB) return;
    fbDB.ref('defis/' + monPseudo).update({ etat: 'refuse', refusePar: monPseudo });
    setTimeout(() => { try { fbDB.ref('defis/' + monPseudo).remove(); } catch(e){} }, 3000);
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;
}

function ouvrirChoixDeckEnLigne(pseudoAdversaire) {
    const sel = document.getElementById('deck-choix-select');
    if (!sel) return;
    sel.innerHTML = '';
    let completTrouve = false;
    mesDecks.forEach((d, i) => {
        const owned = calculerCartesPossedeesPourDeck(d.cartes);
        const o = document.createElement('option');
        o.value = i;
        o.innerText = d.nom + (owned !== 20 ? ` — (Incomplet ${owned}/20)` : '');
        if (owned !== 20) o.disabled = true;
        else completTrouve = true;
        sel.appendChild(o);
    });
    window._pseudoAdverseDeck = pseudoAdversaire;
    const ov = document.getElementById('deck-choix-overlay');
    if (ov) ov.classList.add('open');
}

function validerChoixDeckEnLigne() {
    const sel = document.getElementById('deck-choix-select');
    if (!sel) return;
    const i = sel.value;
    const deck = mesDecks[i];
    if (!deck) return;
    if (calculerCartesPossedeesPourDeck(deck.cartes) !== 20) {
        alert("Ce deck est incomplet (il faut 20 cartes possédées).");
        return;
    }
    const deckIds = deck.cartes.map(c => typeof c === 'string' ? c : c.id);
    annoncerDeckChoisi(window._pseudoAdverseDeck, deckIds);
    const ov = document.getElementById('deck-choix-overlay');
    if (ov) ov.classList.remove('open');
    afficherAttente('En attente de l\'adversaire…', 'L\'adversaire choisit son deck.');
}

function annoncerDeckChoisi(pseudoAdverse, deckIds) {
    if (!fbDB || !monPseudo) return;
    const partieId = _partieIdEnCours || calculerPartieId(monPseudo, pseudoAdverse);
    fbDB.ref('salles/' + partieId + '/joueurs/' + monPseudo).update({ pret: true, deck: deckIds, mulligan: false });
}

function signalerMulliganPret() {
    if (!window.multiPartie || !window.multiPartie.active) return;
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true });
}

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
        const decksPrets = Array.isArray(mesInfos.deck) && mesInfos.deck.length === 20
                        && Array.isArray(infosAdv.deck) && infosAdv.deck.length === 20;

        if (decksPrets && !dejaLancee) {
            dejaLancee = true;
            window.multiPartie = {
                active: true,
                adversaireId: pseudoAdverse,
                partieId,
                refSalle,
                role: roleLocal,
                jeCommence: (roleLocal === 'joueur1'),
                demarrageTraite: false,
                timestamp: s.timestamp
            };
            lancerPartieMultijoueur(pseudoAdverse, mesInfos.deck, infosAdv.deck, s.timestamp);
            return;
        }
        if (!dejaLancee) return;

        if (!window.multiPartie.demarrageTraite) {
            const mesMull = mesInfos.mulligan === true;
            const advMull = infosAdv.mulligan === true;
            if (mesMull && advMull) {
                window.multiPartie.demarrageTraite = true;
                fermerAttente();
                if (window.multiPartie.jeCommence) {
                    J.premier = true; B.premier = false;
                    B.manaMax = 3; B.manaActuel = 0;
                    modeEnLigne = true; modeAttente = false;
                    tourActuel = 'joueur';
                    debutTourJoueur();
                } else {
                    J.premier = false; B.premier = true;
                    J.manaMax = 3; J.manaActuel = 0;
                    modeEnLigne = true; modeAttente = true;
                    tourActuel = 'attente';
                    const ti = document.getElementById('tour-indicateur');
                    if (ti) ti.innerText = 'Tour adverse';
                    const tp = document.querySelector('.turn-pill');
                    if (tp) tp.classList.add('bot');
                    const be = document.getElementById('btn-endturn');
                    if (be) be.classList.add('inactif');
                    prochainManaMax(B);
                    piocher(B, 1);
                    rafraichirJeu();
                }
            }
            return;
        }

        const queue = s.queue || {};
        const entrees = Object.values(queue).sort((a, b) => (a.id || 0) - (b.id || 0));
        entrees.forEach(e => {
            if (!e || !e.action) return;
            if (e.par === monPseudo) return;
            if (e.id <= _dernierIdTraite) return;
            _dernierIdTraite = e.id;
            traiterActionRecue(e.action);
        });
    });
}

async function traiterActionRecue(a) {
    switch (a.type) {
        case 'emote': { afficherEmote(B, a.text); break; }
        case 'jouer': {
            let idx = B.main.findIndex(c => c.id === a.id);
            if (idx < 0) {
                const fausseCarte = instancier(defCarte(a.id), 'B');
                if (fausseCarte) { B.main.push(fausseCarte); idx = B.main.length - 1; }
            }
            if (idx < 0) return;
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
            if (!attaquant || !cible) return;
            attaquant._replay = true;
            await attaquer(attaquant, cible);
            attaquant._replay = false;
            break;
        }
        case 'fin': {
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

function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active || !fbDB) return;
    modeAttente = false;
    fbDB.ref('salles/' + window.multiPartie.partieId).update({ etat: 'forfait', forfaitPar: monPseudo, timestamp: Date.now() });
    fbDB.ref('joueurs/' + monId).update({ etat: 'libre' });
    window.multiPartie.active = false;
}

window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active) signalerForfaitEnLigne();
    }
});

/* ADMIN Firebase */
function adminNettoyerSalles() {
    if (!fbDB) return alert("Firebase non connecté.");
    fbDB.ref('salles').once('value').then(snap => {
        const salles = snap.val();
        if(!salles) { alert("Aucune salle trouvée."); return; }
        let count = 0;
        Object.keys(salles).forEach(id => { fbDB.ref('salles/' + id).remove(); count++; });
        alert(count + " salle(s) nettoyée(s).");
    });
}

function adminEnvoyerMotd() {
    if (!fbDB) return alert("Firebase non connecté.");
    const el = document.getElementById('admin-motd');
    if (!el) return;
    const msg = el.value.trim();
    if(msg === "") { fbDB.ref('motd').remove(); alert("Message effacé"); }
    else { fbDB.ref('motd').set(msg); alert("Message diffusé !"); }
}
