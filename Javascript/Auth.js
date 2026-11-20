const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_TIME_KEY = 'authSessionStartTime';
const DEFAULT_AVATAR_URL = '../Image/Default-user.jpg';
const AVATAR_PRESETS = [
    DEFAULT_AVATAR_URL,
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Finance1',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Finance2',
    'https://api.dicebear.com/9.x/thumbs/svg?seed=Finance3'
];
function getAvatarStorageKey(uid) {
    return `userAvatar_${uid}`;
}
function getSavedAvatar(uid) {
    if (!uid) return DEFAULT_AVATAR_URL;
    try {
        return localStorage.getItem(getAvatarStorageKey(uid)) || DEFAULT_AVATAR_URL;
    } catch (_) {
        return DEFAULT_AVATAR_URL;
    }
}
function saveAvatar(uid, url) {
    if (!uid || !url) return false;
    try {
        localStorage.setItem(getAvatarStorageKey(uid), url);
        return true;
    } catch (_) {
        return false;
    }
}
const Auth = {
    init() {
        const setup = () => {
            this.injectModal();
            this.setupListeners();
            this.initAuthState();
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setup);
        } else {
            setup();
        }
    },
    injectModal() {
        const existingModal = document.getElementById('auth-modal');
        if (existingModal) {
            existingModal.remove();
        }
        const modalHTML = `
        <div id="auth-modal" class="modal-overlay" style="display: none;">
            <div class="modal-card">
                <button id="close-modal-btn" class="close-modal">&times;</button>
                
                <!-- Sign In Panel -->
                <div id="signin-panel" class="auth-panel">
                    <h2>Sign In</h2>
                    <p>Welcome back! Please enter your details.</p>
                    <div class="auth-form-group">
                        <div class="input-wrapper">
                            <input type="email" id="signin-email" placeholder="Email address">
                            <span id="signin-status" class="validation-status" style="display: none;"></span>
                        </div>
                        <input type="password" id="signin-password" placeholder="Password">
                        <p id="signin-error" class="auth-error-text"></p>
                        <button id="modal-login-btn">Sign In</button>
                    </div>
                    <p class="auth-switch-text" style="margin-top: 35px">
                        Don't have an account? <a href="#" id="switch-to-signup">Sign Up</a>
                    </p>
                </div>

                <!-- Sign Up Panel -->
                <div id="signup-panel" class="auth-panel" style="display: none;">
                    <h2>Create Account</h2>
                    <p>Sign up to start tracking your finances.</p>
                    <div class="auth-form-group">
                        <div class="input-wrapper">
                            <input type="email" id="signup-email" placeholder="Email address">
                            <span id="signup-status" class="validation-status" style="display: none;"></span>
                        </div>
                        <input type="password" id="signup-password" placeholder="Password">
                        <p id="signup-error" class="auth-error-text"></p>
                        <button id="modal-signup-btn">Sign Up</button>
                    </div>
                    <p class="auth-switch-text" style="margin-top: 35px">
                        Already have an account? <a href="#" id="switch-to-signin">Sign In</a>
                    </p>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    pickDesktopAvatar(uid, avatarEl) {
        let fileInput = document.getElementById('desktop-avatar-file-input');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'desktop-avatar-file-input';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        fileInput.value = '';
        fileInput.onchange = () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please choose a valid image file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                if (typeof dataUrl !== 'string') return;
                const saved = saveAvatar(uid, dataUrl);
                if (!saved) {
                    alert('That image is too large to save in browser storage. Try a smaller image or use a preset.');
                    return;
                }
                avatarEl.src = dataUrl;
            };
            reader.readAsDataURL(file);
        };

        fileInput.click();
    },
    changeAvatar(uid, avatarEl) {
        if (!uid || !avatarEl) return;
        const currentUrl = getSavedAvatar(uid);
        const choice = prompt(
            'Choose an avatar option (1-5):\n' +
            '1: Default Avatar (../Image/Default-user.jpg)\n' +
            '2: Preset 2\n' +
            '3: Preset 3\n' +
            '4: Preset 4\n' +
            '5: Choose image from desktop',
            '1'
        );
        if (!choice) return;

        const trimmed = choice.trim();
        if (trimmed === '1') {
            saveAvatar(uid, DEFAULT_AVATAR_URL);
            avatarEl.src = DEFAULT_AVATAR_URL;
            return;
        }

        if (trimmed === '5') {
            this.pickDesktopAvatar(uid, avatarEl);
            return;
        }

        const presetIndex = Number(trimmed) - 1;
        if (presetIndex >= 1 && presetIndex < AVATAR_PRESETS.length) {
            const nextUrl = AVATAR_PRESETS[presetIndex];
            saveAvatar(uid, nextUrl);
            avatarEl.src = nextUrl;
            return;
        }

        if (trimmed) {
            saveAvatar(uid, trimmed);
            avatarEl.src = trimmed || currentUrl;
        }
    },
    async reauthenticateUser(user) {
        if (!user || !user.email) return false;
        const currentPassword = prompt('Please enter your current password to confirm:');
        if (!currentPassword) return false;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        return true;
    },
    async handleChangePassword(user) {
        if (!user) return;
        const newPassword = prompt('Enter your new password (at least 6 characters):');
        if (!newPassword) return;
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        try {
            await user.updatePassword(newPassword);
            alert('Password updated successfully!');
        } catch (err) {
            if (err && err.code === 'auth/requires-recent-login') {
                try {
                    const ok = await this.reauthenticateUser(user);
                    if (!ok) return;
                    await user.updatePassword(newPassword);
                    alert('Password updated successfully!');
                } catch (reauthErr) {
                    alert(reauthErr.message || 'Could not update password.');
                }
            } else {
                alert(err.message || 'Could not update password.');
            }
        }
    },
    async handleDeleteAccount(user) {
        if (!user) return;
        const confirmed = confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
        if (!confirmed) return;

        try {
            try { localStorage.removeItem(getAvatarStorageKey(user.uid)); } catch (_) {}
            try { localStorage.removeItem(SESSION_TIME_KEY); } catch (_) {}
            await user.delete();
            alert('Your account has been deleted.');
            window.location.reload();
        } catch (err) {
            if (err && err.code === 'auth/requires-recent-login') {
                try {
                    const ok = await this.reauthenticateUser(user);
                    if (!ok) return;
                    await user.delete();
                    alert('Your account has been deleted.');
                    window.location.reload();
                } catch (reauthErr) {
                    alert(reauthErr.message || 'Could not delete account.');
                }
            } else {
                alert(err.message || 'Could not delete account.');
            }
        }
    },
    openSettingsMenu(user, gearEl, avatarEl) {
        const existingMenu = document.getElementById('account-settings-menu');
        if (this._outsideMenuClick) {
            document.removeEventListener('click', this._outsideMenuClick);
            this._outsideMenuClick = null;
        }
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        const rect = gearEl.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.id = 'account-settings-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${Math.round(rect.bottom + 6)}px;
            right: ${Math.max(8, Math.round(window.innerWidth - rect.right))}px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.14);
            padding: 6px;
            z-index: 10000;
            min-width: 175px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-family: inherit;
        `;
        const closeMenu = () => {
            menu.remove();
            if (this._outsideMenuClick) {
                document.removeEventListener('click', this._outsideMenuClick);
                this._outsideMenuClick = null;
            }
        };
        const makeItem = (label, color, onClick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            btn.style.cssText = `
                background: transparent;
                border: none;
                border-radius: 7px;
                padding: 8px 12px;
                text-align: left;
                cursor: pointer;
                font-size: 14px;
                color: ${color};
                font-weight: 500;
            `;
            btn.onmouseenter = () => { btn.style.background = '#f3f4f6'; };
            btn.onmouseleave = () => { btn.style.background = 'transparent'; };
            btn.onclick = async () => {
                closeMenu();
                await onClick();
            };
            return btn;
        };
        menu.appendChild(makeItem('Change Avatar', '#111827', () => this.changeAvatar(user.uid, avatarEl)));
        menu.appendChild(makeItem('Change Password', '#111827', () => this.handleChangePassword(user)));
        menu.appendChild(makeItem('Delete Account', '#dc2626', () => this.handleDeleteAccount(user)));
        document.body.appendChild(menu);
        setTimeout(() => {
            this._outsideMenuClick = (e) => {
                if (!menu.contains(e.target) && e.target !== gearEl) {
                    closeMenu();
                }
            };
            document.addEventListener('click', this._outsideMenuClick);
        }, 0);
    },
    ensureAvatarUI(user) {
        const logoutBtn = document.getElementById('logout-btn');
        let avatarEl = document.getElementById('user-avatar-img');
        let gearEl = document.getElementById('account-settings-gear');
        const existingMenu = document.getElementById('account-settings-menu');
        if (!user) {
            if (avatarEl) avatarEl.style.display = 'none';
            if (gearEl) gearEl.style.display = 'none';
            if (existingMenu) existingMenu.remove();
            return;
        }
        const avatarUrl = getSavedAvatar(user.uid);
        if (!avatarEl) {
            avatarEl = document.createElement('img');
            avatarEl.id = 'user-avatar-img';
            avatarEl.alt = 'User Avatar';
            avatarEl.title = 'User Avatar';
            avatarEl.style.cssText = `
                width: 36px;
                height: 36px;
                border-radius: 50%;
                object-fit: cover;
                cursor: default;
                vertical-align: middle;
                margin-right: 6px;
                border: 2px solid #6366f1;
            `;
            if (logoutBtn && logoutBtn.parentNode) {
                logoutBtn.parentNode.insertBefore(avatarEl, logoutBtn);
            } else {
                document.body.appendChild(avatarEl);
            }
        }
        if (!gearEl) {
            gearEl = document.createElement('img');
            gearEl.id = 'account-settings-gear';
            gearEl.src = '../Image/Gear-Icon.png';
            gearEl.alt = 'Account Settings';
            gearEl.title = 'Account Settings';
            if (logoutBtn && logoutBtn.parentNode) {
                logoutBtn.insertAdjacentElement('afterend', gearEl);
            } else {
                document.body.appendChild(gearEl);
            }
        }
        avatarEl.src = avatarUrl;
        avatarEl.title = 'User Avatar';
        avatarEl.style.cursor = 'default';
        avatarEl.onclick = null;
        avatarEl.onerror = () => {
            avatarEl.onerror = null;
            avatarEl.src = DEFAULT_AVATAR_URL;
        };
        avatarEl.style.display = 'inline-block';
        gearEl.style.display = 'inline-block';
        gearEl.onclick = (e) => {
            e.stopPropagation();
            this.openSettingsMenu(user, gearEl, avatarEl);
        };
    },
    isSessionExpired() {
        try {
            const startRaw = localStorage.getItem(SESSION_TIME_KEY);
            if (!startRaw) return false;
            const startTime = Number(startRaw);
            if (!Number.isFinite(startTime)) return false;
            return (Date.now() - startTime) >= SESSION_DURATION_MS;
        } catch (_) {
            return false;
        }
    },
    initAuthState() {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

        firebase.auth().onAuthStateChanged(user => {
            const signinBtn = document.getElementById('open-signin-btn');
            const signupBtn = document.getElementById('open-signup-btn');
            const logoutBtn = document.getElementById('logout-btn');
            // Check if the user is currently on the About page
            const isAboutPage = window.location.pathname.includes('Abouts.html');

            if (user) {
                if (this.isSessionExpired()) {
                    this.logout();
                    return;
                }

                try {
                    if (!localStorage.getItem(SESSION_TIME_KEY)) {
                        localStorage.setItem(SESSION_TIME_KEY, String(Date.now()));
                    }
                } catch (_) {}

                currentUserUid = user.uid;
                this.ensureAvatarUI(user);

                if (signinBtn) signinBtn.style.display = 'none';
                if (signupBtn) signupBtn.style.display = 'none';
                if (logoutBtn) {
                    logoutBtn.style.display = 'inline-block';
                    logoutBtn.onclick = () => this.logout();
                }

                if (typeof DB !== 'undefined') {
                    DB.loadTransactions(user.uid, data => {
                        transactions = Array.isArray(data) ? data : (data ? Object.values(data) : []);
                        if (typeof updateUI === 'function') updateUI();
                    });
                    DB.loadGoals(user.uid, data => {
                        goals = Array.isArray(data) ? data : (data ? Object.values(data) : []);
                        if (typeof updateGoalsUI === 'function') updateGoalsUI();
                    });
                }
            } else {
                currentUserUid = null;
                this.ensureAvatarUI(null);

                if (logoutBtn) logoutBtn.style.display = 'none';
                if (signinBtn) {
                    signinBtn.style.display = 'inline-block';
                    signinBtn.onclick = () => this.openModal('signin');
                }
                if (signupBtn) {
                    signupBtn.style.display = 'inline-block';
                    signupBtn.onclick = () => this.openModal('signup');
                }
                transactions = [];
                goals = [];
                if (typeof updateUI === 'function') updateUI();
                if (typeof updateGoalsUI === 'function') updateGoalsUI();
                // Only prompt sign in automatically if NOT on the About page
                if (!isAboutPage) {
                    this.openModal('signin');
                }
            }
        });
    },
    showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (!errorEl) return;
        errorEl.textContent = message;
        if (errorEl.timeoutId) clearTimeout(errorEl.timeoutId);
        errorEl.timeoutId = setTimeout(() => { errorEl.textContent = ''; }, 7000);
    },
    openModal(panelName) {
        const modal = document.getElementById('auth-modal');
        const signinPanel = document.getElementById('signin-panel');
        const signupPanel = document.getElementById('signup-panel');
        if (!modal) return;
        modal.style.display = 'flex';
        ['signin-email', 'signin-password', 'signup-email', 'signup-password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['signin-status', 'signup-status'].forEach(id => {
            const status = document.getElementById(id);
            if (status) {
                status.style.display = 'none';
                status.textContent = '';
            }
        });
        ['signin-error', 'signup-error'].forEach(id => {
            const err = document.getElementById(id);
            if (err) err.textContent = '';
        });
        if (panelName === 'signup') {
            if (signinPanel) signinPanel.style.display = 'none';
            if (signupPanel) signupPanel.style.display = 'block';
        } else {
            if (signinPanel) signinPanel.style.display = 'block';
            if (signupPanel) signupPanel.style.display = 'none';
        }
    },
    validateEmailFormat(email) {
        const basicRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!basicRegex.test(email)) return false;
        const [localPart, domain] = email.split('@');
        if (/^\d+$/.test(localPart)) return false;
        if (localPart.length < 3) return false;
        const fakeDomains = ['test.com', 'example.com', 'fake.com', 'mailinator.com', '123.com'];
        if (fakeDomains.includes(domain.toLowerCase())) return false;
        return true;
    },
    async checkFirebaseEmail(email) {
        const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
        return Array.isArray(methods) && methods.length > 0;
    },
    attachEmailValidator(inputEl, statusEl, mode = 'signin') {
        if (!inputEl || !statusEl) return;
        let checkCounter = 0;
        inputEl.addEventListener('input', async () => {
            const currentCheck = ++checkCounter;
            const email = inputEl.value.trim();
            if (email === '') {
                statusEl.style.display = 'none';
                statusEl.textContent = '';
                return;
            }
            if (!this.validateEmailFormat(email)) {
                statusEl.style.display = 'inline-block';
                statusEl.textContent = '✖';
                statusEl.style.color = '#ef4444';
                return;
            }
            statusEl.style.display = 'inline-block';
            statusEl.textContent = '✓';
            statusEl.style.color = '#10b981';
            try {
                const existsInFirebase = await this.checkFirebaseEmail(email);
                if (currentCheck !== checkCounter) return;

                if (mode === 'signup' && existsInFirebase) {
                    statusEl.textContent = '✖';
                    statusEl.style.color = '#ef4444';
                }
            } catch (_) {
                // Keep format-valid indicator if lookup fails
            }
        });
    },
    setupListeners() {
        const modal = document.getElementById('auth-modal');
        const closeBtn = document.getElementById('close-modal-btn');
        // Sign In vaule taker
        const signinEmail = document.getElementById('signin-email');
        const signinPassword = document.getElementById('signin-password');
        const signinStatus = document.getElementById('signin-status');
        // Sign Up vaule taker
        const signupEmail = document.getElementById('signup-email');
        const signupPassword = document.getElementById('signup-password');
        const signupStatus = document.getElementById('signup-status');
        // Switch vaule taker
        const switchToSignup = document.getElementById('switch-to-signup');
        const switchToSignin = document.getElementById('switch-to-signin');
        if (switchToSignup) {
            switchToSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('signup');
            });
        }
        if (switchToSignin) {
            switchToSignin.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('signin');
            });
        }
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
        }
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        this.attachEmailValidator(signinEmail, signinStatus, 'signin');
        this.attachEmailValidator(signupEmail, signupStatus, 'signup');

        const loginBtn = document.getElementById('modal-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const email = signinEmail ? signinEmail.value.trim() : '';
                const password = signinPassword ? signinPassword.value.trim() : '';
                if (!email || !password) {
                    this.showError('signin-error', "Please enter both email and password.");
                    return;
                }
                if (!this.validateEmailFormat(email)) {
                    this.showError('signin-error', "Please enter a valid email address.");
                    return;
                }
                this.login(email, password, (err) => {
                    if (err) {
                        this.showError('signin-error', err.message);
                    } else {
                        modal.style.display = 'none';
                    }
                });
            });
        }
        const signupBtn = document.getElementById('modal-signup-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', async () => {
                const email = signupEmail ? signupEmail.value.trim() : '';
                const password = signupPassword ? signupPassword.value.trim() : '';
                if (!email || !password) {
                    this.showError('signup-error', "Please enter both email and password.");
                    return;
                }
                if (!this.validateEmailFormat(email)) {
                    this.showError('signup-error', "Invalid email address. Please use a real email.");
                    return;
                }

                signupBtn.disabled = true;
                try {
                    const existsInFirebase = await this.checkFirebaseEmail(email);
                    if (existsInFirebase) {
                        signupBtn.disabled = false;
                        this.showError('signup-error', "This email already has an account. Only one account is allowed per email.");
                        return;
                    }
                } catch (_) {
                    // If lookup fails, let createUserWithEmailAndPassword handle it
                }

                this.signup(email, password, (err) => {
                    signupBtn.disabled = false;
                    if (err) {
                        if (err.code === 'auth/email-already-in-use') {
                            this.showError('signup-error', "This email already has an account. Only one account is allowed per email.");
                        } else {
                            this.showError('signup-error', err.message);
                        }
                    } else {
                        modal.style.display = 'none';
                    }
                });
            });
        }
    },
    signup(email, password, callback) {
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(res => {
                try { localStorage.setItem(SESSION_TIME_KEY, String(Date.now())); } catch (_) {}
                callback(null, res.user);
            })
            .catch(err => callback(err));
    },
    login(email, password, callback) {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(res => {
                try { localStorage.setItem(SESSION_TIME_KEY, String(Date.now())); } catch (_) {}
                callback(null, res.user);
            })
            .catch(err => callback(err));
    },
    logout(callback) {
        try { localStorage.removeItem(SESSION_TIME_KEY); } catch (_) {}
        firebase.auth().signOut().then(() => {
            if (callback) callback();
            window.location.reload();
        });
    }
};
// Danger Zone: Remove this = Broken
Auth.init();