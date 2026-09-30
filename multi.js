/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v20)
   Correctif : Suppression de la race condition sur l'écran d'attente
   et réinitialisation propre de dejaLancee à chaque défi.
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

let fbDB = null, fbUserRef = null, fbJoueursRef = null, monId = null, monPseudo = null;
window.multiPartie = null;
let monRole = null, dejaLancee = false, _ecouteurSalle = null, _partieIdEnCours = null;
let _ecouteurDefiEnvoye = null, _salleRef = null, _ecouteurDemandesAmis = null;
let _ecouteurBonusTemporaire = null, _ecouteurMessagesPrives = null, _intervalPing = null;

function normaliserPseudo(p) {
    return (p || 'anonyme').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').slice(0, 20);
}
function calculerPartieId(a, b) {
    const norm = (s) => String(s || 'anon').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return 'p_' + [norm(a), norm(b)].sort().join('_vs_');
}
window.onAppPret = function() { initFirebase(); };

function initFirebase() {
    try {
        if (typeof firebase === 'undefined') return;
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        fbDB = firebase.database();
        firebase.auth().onAuthStateChanged(user => {
            if (user) { monId = user.uid; initApresAuth(user); }
        });
    } catch(e) { console.error("Firebase bloqué", e); }
    const elLogin = document.getElementById('auth-password-login');
    if (elLogin) elLogin.addEventListener('keydown', e => { if(e.key === 'Enter') connexionCompte(); });
    const elReg = document.getElementById('auth-password-reg');
    if (elReg) elReg.addEventListener('keydown', e => { if(e.key === 'Enter') creerCompte(); });
}

document.addEventListener("DOMContentLoaded", () => { if (window.appPret) initFirebase(); });

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
        setTimeout(() => lancerModeHorsLigne(pseudoForce, emailForce), 300); return;
    }
    J.nom = pseudoForce || "Joueur_" + Math.floor(Math.random() * 1000);
    monPseudo = normaliserPseudo(J.nom);
    const disp = document.getElementById('display-pseudo'); if (disp) disp.innerText = J.nom;
    const hero = document.getElementById('hero-name'); if (hero) hero.innerText = J.nom;
    const nav = document.getElementById('main-nav'); if (nav) nav.classList.remove('hidden');
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
        setTimeout(() => lancerModeHorsLigne(ident, ident), 800); return;
    }
    let timeout = setTimeout(() => {
        if (err.innerText === "Connexion en cours...") {
            err.innerText = "Le serveur ne répond pas. Passage hors ligne...";
            setTimeout(() => lancerModeHorsLigne(ident, ident), 1000);
        }
    }, 6000);
    try {
        if (ident.includes('@')) {
            firebase.auth().signInWithEmailAndPassword(ident, pwd).then(() => {
                clearTimeout(timeout); err.innerText = "Connecté !";
            }).catch(e => { clearTimeout(timeout); err.innerText = "Erreur : " + e.message; });
        } else {
            const pseudoNorm = normaliserPseudo(ident);
            fbDB.ref('pseudos_reserves/' + pseudoNorm).once('value').then(snap => {
                if (snap.exists() && snap.val().email) {
                    firebase.auth().signInWithEmailAndPassword(snap.val().email, pwd).then(() => {
                        clearTimeout(timeout); err.innerText = "Connecté !";
                    }).catch(() => { clearTimeout(timeout); err.innerText = "Mot de passe incorrect."; });
                } else { clearTimeout(timeout); err.innerText = "Pseudo introuvable."; }
            }).catch(() => {
                clearTimeout(timeout); err.innerText = "BDD bloquée. Hors ligne...";
                setTimeout(() => lancerModeHorsLigne(ident, null), 1000);
            });
        }
    } catch (e) {
        clearTimeout(timeout); err.innerText = "Erreur locale...";
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
    if (pwd.length < 6) { err.innerText = "Mot de passe : 6 caractères min."; return; }
    if (typeof firebase === 'undefined' || !fbDB) {
        err.innerText = "Firebase bloqué. Hors ligne...";
        setTimeout(() => lancerModeHorsLigne(pseudo, email), 800); return;
    }
    let timeout = setTimeout(() => {
        if(err.innerText === "Création du compte en cours...") {
            err.innerText = "Timeout. Passage hors ligne...";
            setTimeout(() => lancerModeHorsLigne(pseudo, email), 1000);
        }
    }, 6000);
    try {
        firebase.auth().createUserWithEmailAndPassword(email, pwd)
            .then(creds => {
                clearTimeout(timeout); err.innerText = "Compte créé !";
                if(fbDB) {
                    const pseudoNorm = normaliserPseudo(pseudo);
                    fbDB.ref('profils/' + creds.user.uid).set({ pseudo: pseudo, email: email }).catch(()=>{});
                    fbDB.ref('pseudos_reserves/' + pseudoNorm).set({ uid: creds.user.uid, email: email }).catch(()=>{});
                }
            })
            .catch(e => { clearTimeout(timeout); err.innerText = "Erreur : " + e.message; });
    } catch(e) {
        clearTimeout(timeout); err.innerText = "Erreur locale...";
        setTimeout(() => lancerModeHorsLigne(pseudo, email), 1000);
    }
}

function initApresAuth(user) {
    try {
        if (user && user.email === 'nassim57132@gmail.com') {
            const adminBtn = document.getElementById('nav-admin');
            if(adminBtn) adminBtn.classList.remove('hidden');
        }
        if(fbDB && user) {
            fbDB.ref('profils/' + user.uid).once('value').then(snap => {
                let p = snap.val();
                let pseudo = (p && p.pseudo) ? p.pseudo : "Joueur_" + Math.floor(Math.random()*1000);
                lancerModeHorsLigne(pseudo, user.email);
                setupFirebaseListeners();
                chargerCartesBannies();
                demarrerEcouteDemandesAmis();
                demarrerEcouteMessagesPrives();
                demarrerEcouteBonusTemporaire();
            }).catch(() => {
                lancerModeHorsLigne("Joueur_" + Math.floor(Math.random()*1000), user.email);
                setupFirebaseListeners();
            });
        } else {
            lancerModeHorsLigne("Joueur_" + Math.floor(Math.random()*1000), user ? user.email : null);
        }
    } catch (e) { lancerModeHorsLigne("Joueur_Erreur", null); }
}

let _bansEcoutes = false;
function chargerCartesBannies() {
    if (!fbDB || _bansEcoutes) return;
    _bansEcoutes = true;
    fbDB.ref('cartesBannies').on('value', snap => { window.cartesBannies = snap.val() || []; });
}

function demarrerEcouteBonusTemporaire() {
    if (!fbDB || !monId) return;
    if (_ecouteurBonusTemporaire) _ecouteurBonusTemporaire.off();
    _ecouteurBonusTemporaire = fbDB.ref('profils/' + monId + '/bonusTemporaire');
    _ecouteurBonusTemporaire.on('value', snap => {
        const bonus = snap.val();
        if (!bonus || bonus.expireAt <= Date.now()) {
            if (typeof profil !== 'undefined' && profil.bonusTemporaire) {
                profil.bonusTemporaire = null;
                if (typeof flashInfo === 'function') flashInfo('⏱️ Bonus temporaire expiré.');
            }
            return;
        }
        if (typeof profil !== 'undefined') {
            const wasActive = profil.bonusTemporaire && profil.bonusTemporaire.expireAt > Date.now();
            profil.bonusTemporaire = bonus;
            if (!wasActive && typeof flashInfo === 'function') {
                const reste = Math.ceil((bonus.expireAt - Date.now()) / 60000);
                flashInfo(`🎁 Bonus actif ! Toutes les cartes ×3 pendant ${reste} min.`);
            }
        }
    });
}

function demarrerEcouteDemandesAmis() {
    if (!fbDB || !monId) return;
    if (_ecouteurDemandesAmis) _ecouteurDemandesAmis.off();
    _ecouteurDemandesAmis = fbDB.ref('demandesAmis/' + monId);
    _ecouteurDemandesAmis.on('value', snap => {
        const data = snap.val() || {};
        const arr = Object.entries(data).map(([k, v]) => ({ id: k, code: v.deCode, pseudo: v.dePseudo, deUid: v.deUid }));
        if (typeof profil !== 'undefined') {
            profil.demandesAmisRecues = arr;
            if (typeof afficherDemandesAmis === 'function') afficherDemandesAmis();
        }
        if (arr.length > 0 && !document.getElementById('profil-screen').classList.contains('active')) {
            if (typeof flashInfo === 'function') flashInfo(`👋 ${arr.length} demande(s) d'ami !`);
        }
    });
}

function demarrerEcouteMessagesPrives() {
    if (!fbDB || !monId) return;
    fbDB.ref('profils/' + monId + '/public').once('value').then(snap => {
        const pub = snap.val() || {};
        const monCode = pub.codeAmi || (typeof profil !== 'undefined' ? profil.codeAmi : null);
        if (!monCode) return;
        if (_ecouteurMessagesPrives) _ecouteurMessagesPrives.off();
        _ecouteurMessagesPrives = fbDB.ref('messagesPrives');
        _ecouteurMessagesPrives.on('child_added', child => {
            const cle = child.key;
            if (!cle.includes(monCode)) return;
            const msg = child.val();
            if (!msg) return;
            if (Date.now() - (msg.ts || 0) > 10000) return;
            if (msg.de === monCode) return;
            const autreCode = cle.split('_').find(c => c !== monCode);
            if (!autreCode) return;
            if (typeof flashInfo === 'function') flashInfo(`💬 Nouveau message de ${autreCode} !`);
        });
    });
}

function setupFirebaseListeners() {
    if (!fbDB || !monId) return;
    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');
    fbUserRef.onDisconnect().remove();
    fbUserRef.set({
        pseudo: J.nom, pseudoNorm: monPseudo, etat: 'libre', dernierPing: Date.now(),
        codeAmi: profil.codeAmi || null, avatar: profil.avatar || '🧑', niveau: profil.niveau || 1
    });
    if (_intervalPing) clearInterval(_intervalPing);
    _intervalPing = setInterval(() => { if (fbDB && monId) fbUserRef.update({ dernierPing: Date.now(), niveau: profil.niveau || 1 }); }, 30000);
    fbJoueursRef.on('value', snap => afficherListeJoueurs(snap.val() || {}));
    fbDB.ref('motd').on('value', snap => {
        const msg = snap.val();
        const banner = document.getElementById('motd-banner');
        if (banner) { if(msg) { banner.innerText = msg; banner.classList.remove('hidden'); } else banner.classList.add('hidden'); }
    });
    chargerCartesBannies();
    fbDB.ref('defis/' + monPseudo).on('value', snap => {
        const d = snap.val();
        if (!d) return;
        if (d.de && d.de !== monPseudo && d.etat === 'en_attente') afficherDefiRecu(d);
        if (d.etat !== 'en_attente') { const ov = document.getElementById('defi-overlay'); if (ov) ov.classList.remove('open'); }
    });
}

function rafraichirJoueurs() { if (!fbDB) { if (window.appPret) initFirebase(); } else setupFirebaseListeners(); }

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
        const avatar = j.avatar || '🧑';
        const codeAmi = j.codeAmi || '';
        const dejaAmi = (profil.amis || []).includes(codeAmi);
        const niv = j.niveau || 1;
        div.innerHTML = `<div><div class="mj-nom">${esc(avatar)} ${esc(j.pseudo || 'Anonyme')} <span style="color:var(--laiton);font-size:11px;">Niv.${niv}</span></div><div class="mj-etat ${libre ? 'libre' : 'en-combat'}">${libre ? '● Disponible' : '⚔ En combat'}</div></div>
            <div class="mj-actions">
                <button ${(libre && !moiMeme) ? '' : 'disabled'} onclick="defierJoueur('${cible}')">${moiMeme ? 'Toi' : (libre ? 'Défier' : 'Occupé')}</button>
                ${(!moiMeme && codeAmi && !dejaAmi) ? `<button class="sec" onclick="demanderAmi('${codeAmi}')">➕ Ami</button>` : ''}
            </div>`;
        liste.appendChild(div);
    });
    if (count) count.innerText = `${joueurs.length} joueur(s) connecté(s)`;
    if (combatCount) combatCount.innerText = `${enCombat} en combat`;
}

function demanderAmi(codeCible) {
    if (!fbDB || !profil.codeAmi || !codeCible) return;
    if (codeCible === profil.codeAmi) return flashInfo('C\'est ton propre code !');
    if ((profil.amis || []).includes(codeCible)) return flashInfo('Déjà ami.');
    fbDB.ref('profils').orderByChild('public/codeAmi').equalTo(codeCible).once('value').then(snap => {
        const data = snap.val();
        if (!data) return flashInfo('Joueur introuvable.');
        const uid = Object.keys(data)[0];
        fbDB.ref('demandesAmis/' + uid).push({ deCode: profil.codeAmi, dePseudo: J.nom, deUid: monId, ts: Date.now() });
        flashInfo(`Demande envoyée !`);
    }).catch(() => flashInfo('Erreur d\'envoi.'));
}

/* ===========================================================
   DÉFI
   =========================================================== */
function defierJoueur(pseudoCible) {
    if (!fbDB || !monPseudo || !pseudoCible || pseudoCible === monPseudo) return;

    dejaLancee = false;
    const idPotentiel = calculerPartieId(monId, pseudoCible);
    fbDB.ref('salles/' + idPotentiel).remove();

    fbDB.ref('defis/' + pseudoCible).set({
        de: monPseudo,
        dePseudo: J.nom,
        deId: monId,
        deCle: monId,
        etat: 'en_attente',
        timestamp: Date.now()
    });
    if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
    _ecouteurDefiEnvoye = fbDB.ref('defis/' + pseudoCible);
    _ecouteurDefiEnvoye.on('value', snap => {
        const d = snap.val();
        if (!d || d.de !== monPseudo) return;
        if (d.etat === 'accepte' && d.partieId) {
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);
            _partieIdEnCours = d.partieId;
            dejaLancee = false;
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
    const idAdverse = defi.deId || defi.deCle || defi.de;
    const ov = document.getElementById('defi-overlay');
    if (ov) ov.classList.remove('open');
    window._defiEnCours = null;

    dejaLancee = false;
    const partieId = calculerPartieId(monId, idAdverse);
    _partieIdEnCours = partieId;
    const roles = { [monId]: 'joueur2', [idAdverse]: 'joueur1' };
    monRole = 'joueur2';

    _salleRef = fbDB.ref('salles/' + partieId);
    _salleRef.set({
        roles,
        pseudos: { [monId]: monPseudo, [idAdverse]: pseudoAdverse },
        etat: 'attente_deck', timestamp: Date.now(),
        joueurs: {
            [monId]:     { pret: false, deck: null, mulligan: false },
            [idAdverse]: { pret: false, deck: null, mulligan: false }
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
    const ov = document.getElementById('defi-overlay'); if (ov) ov.classList.remove('open');
    window._defiEnCours = null;
}

/* ===========================================================
   CHOIX DU DECK
   =========================================================== */
function ouvrirChoixDeckEnLigne(pseudoAdversaire) {
    const sel = document.getElementById('deck-choix-select');
    if (!sel) return;
    sel.innerHTML = '';
    let indexDefaut = -1;
    mesDecks.forEach((d, i) => {
        const owned = calculerCartesPossedeesPourDeck(d.cartes);
        const o = document.createElement('option');
        o.value = i;
        o.innerText = d.nom + (owned !== 20 ? ` — (Incomplet ${owned}/20)` : '');
        if (owned !== 20) o.disabled = true;
        else if (d.nom === profil.deckParDefaut) indexDefaut = i;
        sel.appendChild(o);
    });
    if (indexDefaut >= 0) sel.value = indexDefaut;
    window._pseudoAdverseDeck = pseudoAdversaire;
    const ov = document.getElementById('deck-choix-overlay');
    if (ov) ov.classList.add('open');
}

function validerChoixDeckEnLigne() {
    if (!fbDB) { alert('Firebase non connecté.'); return; }
    if (!monId) { alert('Utilisateur non connecté.'); return; }

    const sel = document.getElementById('deck-choix-select');
    if (!sel) return;
    const i = sel.value;
    const deck = mesDecks[i];
    if (!deck) { alert('Deck introuvable.'); return; }
    if (calculerCartesPossedeesPourDeck(deck.cartes) !== 20) { alert("Ce deck est incomplet."); return; }

    window._deckMultiEnCours = deck.nom;
    const deckIds = deck.cartes.map(c => typeof c === 'string' ? c : c.id);

    const ov = document.getElementById('deck-choix-overlay');
    if (ov) ov.classList.remove('open');

    const ecrire = (partieId) => {
        if (!partieId) { alert('Aucune salle active. Relance un défi.'); return; }
        _partieIdEnCours = partieId;
        ecouterSalle(partieId);

        // AFFICHE L'ATTENTE IMMÉDIATEMENT (sauf si la partie est déjà lancée)
        if (!dejaLancee) {
            afficherAttente('En attente de l\'adversaire…');
        }

        fbDB.ref('salles/' + partieId + '/joueurs/' + monId)
            .update({ pret: true, deck: deckIds, mulligan: false })
            .then(() => {
                // Si la partie s'est lancée entre temps (par ecouterSalle), on s'assure de fermer l'overlay
                if (dejaLancee) {
                    fermerAttente();
                }
            })
            .catch(err => {
                fermerAttente();
                alert('Erreur d\'écriture Firebase : ' + err.message);
            });
    };

    if (_partieIdEnCours) { ecrire(_partieIdEnCours); return; }

    fbDB.ref('salles').once('value').then(snap => {
        const toutes = snap.val() || {};
        const trouvee = Object.entries(toutes).find(([id, s]) =>
            s && s.joueurs && s.etat !== 'forfait' && s.joueurs[monId]
        );
        if (trouvee) {
            if (trouvee[1].roles) monRole = trouvee[1].roles[monId] || monRole;
            ecrire(trouvee[0]);
        } else {
            const pseudoAdv = window._pseudoAdverseDeck;
            if (pseudoAdv) {
                fbDB.ref('joueurs').once('value').then(snapJ => {
                    const tousJ = snapJ.val() || {};
                    const adv = Object.entries(tousJ).find(([uid, j]) => j && j.pseudoNorm === pseudoAdv);
                    if (adv) {
                        ecrire(calculerPartieId(monId, adv[0]));
                    } else {
                        alert('Impossible de retrouver la salle. Relance un défi.');
                    }
                });
            } else {
                alert('Aucune salle active. Relance un défi.');
            }
        }
    }).catch(() => alert('Erreur Firebase.'));
}

function annoncerDeckChoisi(pseudoAdverse, deckIds) {
    if (!fbDB || !monId) return;
    const partieId = _partieIdEnCours || calculerPartieId(monId, window._idAdverseDeck || pseudoAdverse);
    _partieIdEnCours = partieId;
    ecouterSalle(partieId);
    fbDB.ref('salles/' + partieId + '/joueurs/' + monId)
        .update({ pret: true, deck: deckIds, mulligan: false });
}

function signalerMulliganPret() {
    if (!window.multiPartie || !fbDB) return;
    const ref = fbDB.ref('salles/' + window.multiPartie.partieId);
    ref.child('joueurs/' + monId).update({ mulligan: true });
}

/* ===========================================================
   ÉCOUTE DE LA SALLE
   =========================================================== */
function ecouterSalle(partieId) {
    if (!fbDB || !partieId) return;
    if (_ecouteurSalle === partieId) return;
    if (_ecouteurSalle && _ecouteurSalle !== partieId) {
        try { fbDB.ref('salles/' + _ecouteurSalle).off(); } catch(e) {}
    }
    _ecouteurSalle = partieId;

    const refSalle = fbDB.ref('salles/' + partieId);
    refSalle.on('value', snap => {
        try {
            const s = snap.val();
            if (!s || !s.joueurs) return;

            const maCle = s.joueurs[monId] ? monId : (s.joueurs[monPseudo] ? monPseudo : null);
            if (!maCle) return;

            const cles = Object.keys(s.joueurs);
            if (cles.length < 2) return;

            let roleLocal = null;
            if (s.roles) roleLocal = s.roles[monId] || s.roles[monPseudo] || null;
            if (!roleLocal) roleLocal = (cles[0] === maCle) ? 'joueur1' : 'joueur2';
            monRole = roleLocal;

            const roleAdverse = roleLocal === 'joueur1' ? 'joueur2' : 'joueur1';
            const cleAdverse = cles.find(k => k !== maCle);
            const pseudoAdverse = (s.pseudos && (s.pseudos[cleAdverse] || s.pseudos[monId]))
                                || (s.roles && Object.keys(s.roles).find(k => s.roles[k] === roleAdverse))
                                || cleAdverse;

            const mesInfos = s.joueurs[maCle] || {};
            const infosAdv = s.joueurs[cleAdverse] || {};

            // Forfait adverse
            if (s.etat === 'forfait' && s.forfaitPar && s.forfaitPar !== monPseudo && s.forfaitParId !== monId && !dejaLancee) {
                dejaLancee = true;
                _partieIdEnCours = null;
                _ecouteurSalle = null;
                try { fbDB.ref('salles/' + partieId).remove(); } catch(e) {}
                if (monId) try { fbDB.ref('joueurs/' + monId).update({ etat: 'libre' }); } catch(e) {}
                fermerAttente();
                const ovDeck = document.getElementById('deck-choix-overlay'); if (ovDeck) ovDeck.classList.remove('open');
                if (typeof partieFinie !== 'undefined') partieFinie = true;
                if (typeof banniere === 'function') banniere('🏆 Victoire par forfait !');
                if (typeof profil !== 'undefined') {
                    profil.coins += 100;
                    if (typeof sauvegarderProgression === 'function') sauvegarderProgression();
                    if (typeof majTopBarCoins === 'function') majTopBarCoins();
                }
                setTimeout(() => { if (typeof changerEcran === 'function') changerEcran('menu-screen'); }, 1800);
                return;
            }

            const decksPrets = Array.isArray(mesInfos.deck) && mesInfos.deck.length === 20
                            && Array.isArray(infosAdv.deck) && infosAdv.deck.length === 20;

            if (decksPrets && !dejaLancee) {
                dejaLancee = true;
                fermerAttente();
                const ovDeck = document.getElementById('deck-choix-overlay'); if (ovDeck) ovDeck.classList.remove('open');

                window.multiPartie = {
                    active: true,
                    adversaireId: pseudoAdverse,
                    partieId, refSalle,
                    role: roleLocal,
                    jeCommence: (roleLocal === 'joueur1'),
                    demarrageTraite: false,
                    timestamp: s.timestamp,
                    maCle,
                    cleAdverse
                };

                if (typeof lancerPartieMultijoueur === 'function') {
                    lancerPartieMultijoueur(pseudoAdverse, mesInfos.deck, infosAdv.deck, s.timestamp);
                }
                return;
            }
            if (!dejaLancee) return;

            // Mulligan
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
                        if (typeof debutTourJoueur === 'function') debutTourJoueur();
                    } else {
                        J.premier = false; B.premier = true;
                        J.manaMax = 3; J.manaActuel = 0;
                        modeEnLigne = true; modeAttente = true;
                        tourActuel = 'attente';
                        const ti = document.getElementById('tour-indicateur'); if (ti) ti.innerText = 'Tour adverse';
                        const tp = document.querySelector('.turn-pill'); if (tp) tp.classList.add('bot');
                        const be = document.getElementById('btn-endturn'); if (be) be.classList.add('inactif');
                        if (typeof prochainManaMax === 'function') prochainManaMax(B);
                        if (typeof piocher === 'function') piocher(B, 1);
                        if (typeof rafraichirJeu === 'function') rafraichirJeu();
                    }
                }
                return;
            }

            // File d'attente des actions
            const queue = s.queue || {};
            const entrees = Object.values(queue).sort((a, b) => (a.id || 0) - (b.id || 0));
            entrees.forEach(e => {
                if (!e || !e.action) return;
                if (e.par === monPseudo || e.par === monId) return;
                if (e.id <= _dernierIdTraite) return;
                _dernierIdTraite = e.id;
                traiterActionRecue(e.action);
            });
        } catch (err) {
            console.error('[SALLE] Exception :', err);
        }
    });
}

async function traiterActionRecue(a) {
    switch (a.type) {
        case 'emote': { afficherEmote(B, a.text); break; }
        case 'chat': { afficherMsgIngame(a.text, false); break; }
        case 'retourner': { const carte = B.plateau[a.idx]; if (carte) retournerBluff(carte, B); break; }
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
            if (carte.motsCles.includes('Fusion')) sacrifierPourFusion(B, carte.id);
            if (carte.motsCles.includes('Bluff') && carte.famille !== 'Sort' && carte.famille !== 'Terrain') {
                if (a.bluffVisible === true) {
                    carte.bluffVisible = true;
                    carte.revele = true;
                    carte.silence = true;
                    if (!carte.desc.includes('(posée visible')) carte.desc = carte.desc + " (posée visible : pas d'effet)";
                } else {
                    carte.bluffVisible = false;
                    carte.revele = false;
                }
            }
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
            decrementerTerrains();
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
    fbDB.ref('salles/' + window.multiPartie.partieId).update({
        etat: 'forfait', forfaitPar: monPseudo, forfaitParId: monId, timestamp: Date.now()
    });
    fbDB.ref('joueurs/' + monId).update({ etat: 'libre' });
    window.multiPartie.active = false;
}

window.addEventListener('beforeunload', () => {
    if (fbDB && monId) {
        fbDB.ref('joueurs/' + monId).remove();
        if (window.multiPartie && window.multiPartie.active && window.multiPartie.demarrageTraite) {
            signalerForfaitEnLigne();
        } else if (window.multiPartie && window.multiPartie.partieId && fbDB) {
            try { fbDB.ref('salles/' + window.multiPartie.partieId).remove(); } catch(e) {}
        }
    }
});

(function surveillerSortieEcran() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#main-nav button[data-screen]');
        if (!btn) return;
        const id = btn.dataset.screen;
        if (id === 'game-screen') return;
        if (window.multiPartie && window.multiPartie.partieId && !window.multiPartie.demarrageTraite && fbDB) {
            try { fbDB.ref('salles/' + window.multiPartie.partieId).remove(); } catch(err) {}
            window.multiPartie = null;
            _partieIdEnCours = null;
            _ecouteurSalle = null;
            dejaLancee = false;
        }
    }, true);
})();

/* ===========================================================
   ADMIN Firebase
   =========================================================== */
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
