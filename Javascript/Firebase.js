// Firebase config
const firebaseConfig = {
	apiKey: "AIzaSyAYgvgdgKFWsibe9z5gzdSNlFv7caU49Cw",
	authDomain: "moneymate-b69f9.firebaseapp.com",
	projectId: "moneymate-b69f9",
	storageBucket: "moneymate-b69f9.firebasestorage.app",
	messagingSenderId: "715773439417",
	appId: "1:715773439417:web:5fcb5cc196e69c18951a68",
	measurementId: "G-PN4VGQNNP4"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();
const DB = {
    initAuth(callback) {
        auth.signInAnonymously()
            .then(res => callback && callback(res.user.uid))
            .catch(err => console.error(err));
    },
    saveTransactions(uid, transactions, callback) {
        database.ref(`users/${uid}/transactions`).set(transactions, callback);
    },
    loadTransactions(uid, callback) {
        database.ref(`users/${uid}/transactions`).on('value', snapshot => {
            callback(snapshot.val() || []);
        });
    },
    saveGoals(uid, goals, callback) {
        database.ref(`users/${uid}/goals`).set(goals, callback);
    },
    loadGoals(uid, callback) {
        database.ref(`users/${uid}/goals`).on('value', snapshot => {
            callback(snapshot.val() || []);
        });
    }
};