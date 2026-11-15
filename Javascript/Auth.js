const Auth = {
    init(onAuthenticated, onUnauthenticated) {
        // Listen to auth state changes from Firebase
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                onAuthenticated(user.uid);
            } else {
                onUnauthenticated();
            }
        });

        this.setupModalListeners();
    },

    setupModalListeners() {
        const modal = document.getElementById('auth-modal');
        const openBtn = document.getElementById('open-auth-btn');
        const closeBtn = document.getElementById('close-modal-btn');
        const errorEl = document.getElementById('auth-error');
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');

        if (openBtn && modal) {
            openBtn.addEventListener('click', () => modal.style.display = 'flex');
        }
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
        }
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Modal Button Handlers
        const loginBtn = document.getElementById('modal-login-btn');
        const signupBtn = document.getElementById('modal-signup-btn');
        const guestBtn = document.getElementById('modal-guest-btn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.login(emailInput.value, passwordInput.value, (err) => {
                    if (err) errorEl.textContent = err.message;
                    else {
                        errorEl.textContent = '';
                        modal.style.display = 'none';
                    }
                });
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                this.signup(emailInput.value, passwordInput.value, (err) => {
                    if (err) errorEl.textContent = err.message;
                    else {
                        errorEl.textContent = '';
                        modal.style.display = 'none';
                    }
                });
            });
        }

        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                this.guestLogin(() => {
                    errorEl.textContent = '';
                    modal.style.display = 'none';
                });
            });
        }
    },

    signup(email, password, callback) {
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(res => callback(null, res.user.uid))
            .catch(err => callback(err));
    },

    login(email, password, callback) {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(res => callback(null, res.user.uid))
            .catch(err => callback(err));
    },

    guestLogin(callback) {
        firebase.auth().signInAnonymously()
            .then(res => callback && callback(res.user.uid))
            .catch(err => console.error("Guest login error:", err));
    },

    logout(callback) {
        firebase.auth().signOut().then(() => {
            if (callback) callback();
        });
    }
};