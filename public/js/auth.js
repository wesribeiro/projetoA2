import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Elementos da UI
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('btn-logout');
const userNameDisplay = document.getElementById('user-name-display');

// Listener de Autenticação Global
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('active');
        appScreen.classList.remove('hidden');
        appScreen.classList.add('active');
        
        userNameDisplay.textContent = user.email.split('@')[0]; // Temporário
        
        // Dispara evento para carregar dados do app.js
        window.dispatchEvent(new CustomEvent('user-logged-in', { detail: { uid: user.uid } }));
    } else {
        // Usuário deslogado
        appScreen.classList.add('hidden');
        appScreen.classList.remove('active');
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('active');
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');

    try {
        btn.textContent = 'Entrando...';
        btn.disabled = true;
        authError.classList.add('hidden');
        
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        authError.textContent = 'Erro ao logar: ' + error.message;
        authError.classList.remove('hidden');
    } finally {
        btn.textContent = 'Entrar';
        btn.disabled = false;
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Erro ao sair', error);
    }
});
