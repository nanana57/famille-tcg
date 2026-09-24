/* ===========================================================
   FAMILLE TCG — Multijoueur Firebase (v28 — Auth & Admin)
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

function normaliserPseudo(p) { 
    return (p || 'anonyme').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').slice(0, 20); 
}

function calculerPartieId(a, b) { 
    const x = normaliserPseudo(a), y = normaliserPseudo(b); 
    return 'p_' + [x, y].sort().join('_vs_'); 
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        fbDB = firebase.database();
        
        // Ecouter l'état d'authentification
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                monId = user.uid;
                initApresAuth(user);
            }
        });
    }
});

/* ---------- Authentification par E-mail ---------- */
function connexionFirebase() {
    const err = document.getElementById('auth-error');
    const email = document.getElementById('auth-email').value.trim();
    const pwd = document.getElementById('auth-password').value;
    const pseudo = document.getElementById('auth-pseudo').value.trim();
    err.innerText = "";

    if(!email || !pwd) { 
        err.innerText = "Email et mot de passe requis."; 
        return; 
    }

    firebase.auth().signInWithEmailAndPassword(email, pwd)
        .then(creds => { 
            console.log("Connecté", creds.user.uid); 
        })
        .catch(error => {
            if(error.code === 'auth/user-not-found' || error.code === 'auth/invalid-login-credentials') {
                if(!pseudo) { 
                    err.innerText = "Nouveau compte : merci d'entrer un pseudo."; 
                    return; 
                }
                firebase.auth().createUserWithEmailAndPassword(email, pwd)
                    .then(creds => {
                        fbDB.ref('profils/' + creds.user.uid).set({ pseudo: pseudo });
                        console.log("Inscrit", creds.user.uid);
                    })
                    .catch(e => err.innerText = e.message);
            } else { 
                err.innerText = error.message; 
            }
        });
}

function initApresAuth(user) {
    // Vérification Admin
    if(user.email === 'nassim57132@gmail.com') {
        document.getElementById('nav-admin').classList.remove('hidden');
    }

    fbDB.ref('profils/' + user.uid).once('value').then(snap => {
        let p = snap.val();
        if(p && p.pseudo) J.nom = p.pseudo;
        else J.nom = "Joueur_" + Math.floor(Math.random()*1000);
        
        monPseudo = normaliserPseudo(J.nom);
        document.getElementById('display-pseudo').innerText = J.nom;
        document.getElementById('hero-name').innerText = J.nom;
        document.getElementById('main-nav').classList.remove('hidden');
        
        if (('ontouchstart' in window) && window.innerWidth <= 1366) {
            const el = document.documentElement; 
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); 
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
        
        changerEcran('menu-screen');
        setupFirebaseListeners();
    });
}

/* ---------- Setup de la Base de Données ---------- */
function setupFirebaseListeners() {
    fbUserRef = fbDB.ref('joueurs/' + monId);
    fbJoueursRef = fbDB.ref('joueurs');
    
    fbUserRef.onDisconnect().remove();
    fbUserRef.set({ pseudo: J.nom, pseudoNorm: monPseudo, etat: 'libre', dernierPing: Date.now() });
    
    fbJoueursRef.on('value', snap => afficherListeJoueurs(snap.val() || {}));

    // Message of the Day (MotD) Global
    fbDB.ref('motd').on('value', snap => {
        const msg = snap.val();
        const banner = document.getElementById('motd-banner');
        if(msg) { 
            banner.innerText = msg; 
            banner.classList.remove('hidden'); 
        } else { 
            banner.classList.add('hidden'); 
        }
    });

    fbDB.ref('defis/' + monPseudo).on('value', snap => {
        const d = snap.val(); 
        if (!d) return;
        if (d.de && d.de !== monPseudo && d.etat === 'en_attente') afficherDefiRecu(d);
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

/* ---------- Liste joueurs ---------- */
function rafraichirJoueurs() { 
    if (!fbDB) setupFirebaseListeners(); 
}

function afficherListeJoueurs(data) {
    const liste = document.getElementById('multi-liste');
    const count = document.getElementById('multi-count');
    const combatCount = document.getElementById('multi-combat-count');
    
    if (!liste) return; 
    
    const joueurs = Object.entries(data).filter(([id]) => id !== monId); 
    let enCombat = 0; 
    liste.innerHTML = '';
    
    if (joueurs.length === 0) liste.innerHTML = '<p class="hint">Aucun autre joueur connecté pour le moment.</p>';
    
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
    
    _pseudoCibleEnCours = pseudoCible;
    fbDB.ref('defis/' + pseudoCible).set({ 
        de: monPseudo, 
        dePseudo: J.nom || 'Anonyme', 
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
            if (_ecouteurDefiEnvoye) { _ecouteurDefiEnvoye.off(); _ecouteurDefiEnvoye = null; }
            setTimeout(() => { try { fbDB.ref('defis/' + pseudoCible).remove(); } catch(e){} }, 2000);
            
            _partieIdEnCours = d.partieId; 
            fbDB.ref('joueurs/' + monId).update({ etat: 'en_combat' });
            
            ecouterSalle(d.partieId); 
            ouvrirChoixDeckEnLigne(pseudoCible);
        }
        
        if (d.etat === 'refuse') {
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
    
    const roles = Math.random() < 0.5 ? { [monPseudo]: 'joueur1', [pseudoAdverse]: 'joueur2' } : { [monPseudo]: 'joueur2', [pseudoAdverse]: 'joueur1' }; 
    monRole = roles[monPseudo];
    
    _salleRef = fbDB.ref('salles/' + partieId);
    _salleRef.set({ 
        roles, 
        etat: 'attente_deck', 
        timestamp: Date.now(), 
        joueurs: { 
            [monPseudo]: { pret: false, deck: null, mulligan: false }, 
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

function signalerMulliganPret() { 
    if (!window.multiPartie || !window.multiPartie.active) return; 
    window.multiPartie.refSalle.child('joueurs/' + monPseudo).update({ mulligan: true }); 
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
        const decksPrets = Array.isArray(mesInfos.deck) && mesInfos.deck.length === 20 && Array.isArray(infosAdv.deck) && infosAdv.deck.length === 20;

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
            const mesMull = mesInfos.mulligan === true, advMull = infosAdv.mulligan === true;
            if (mesMull && advMull) {
                window.multiPartie.demarrageTraite = true; 
                fermerAttente();
                
                if (window.multiPartie.jeCommence) { 
                    J.premier = true; 
                    B.premier = false; 
                    B.manaMax = 3; 
                    B.manaActuel = 0; 
                    modeEnLigne = true; 
                    modeAttente = false; 
                    tourActuel = 'joueur'; 
                    debutTourJoueur(); 
                } else { 
                    J.premier = false; 
                    B.premier = true; 
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

/* ---------- Traiter une action reçue ---------- */
async function traiterActionRecue(a) {
    switch (a.type) {
        case 'emote': {
            afficherEmote(B, a.text);
            break;
        }
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

/* ---------- Forfait et Nettoyage ---------- */
function signalerForfaitEnLigne() {
    if (!window.multiPartie || !window.multiPartie.active) return;
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

/* ===========================================================
   FONCTIONS ADMIN
   =========================================================== */

function adminToutDebloquer() {
    dbCartes.forEach(c => collectionJoueur[c.id] = 10);
    alert("C'est fait, tu as 10 exemplaires de chaque carte.");
    // Met à jour l'interface si l'utilisateur ouvre sa collection ensuite
}

function adminNettoyerSalles() {
    fbDB.ref('salles').once('value').then(snap => {
        const salles = snap.val();
        if(!salles) { 
            alert("Aucune salle trouvée."); 
            return; 
        }
        
        let count = 0;
        Object.keys(salles).forEach(id => {
            fbDB.ref('salles/' + id).remove();
            count++;
        });
        alert(count + " salle(s) nettoyée(s).");
    });
}

function adminEnvoyerMotd() {
    const msg = document.getElementById('admin-motd').value.trim();
    if(msg === "") { 
        fbDB.ref('motd').remove(); 
        alert("Message effacé"); 
    } else { 
        fbDB.ref('motd').set(msg); 
        alert("Message diffusé !"); 
    }
}
