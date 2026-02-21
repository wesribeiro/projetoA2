import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getAllUsersForAdmin } from './firebase-services.js?v=1.1';

// Elementos da UI
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('btn-logout');
const userNameDisplay = document.getElementById('user-name-display');
const adminPanel = document.getElementById('admin-panel');
const adminButtonsContainer = document.getElementById('admin-buttons-container');

// Listener de Autenticação Global
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuário logado
        loginScreen.classList.add('hidden');
        loginScreen.classList.remove('active');
        appScreen.classList.remove('hidden');
        appScreen.classList.add('active');
        
        userNameDisplay.textContent = user.email.split('@')[0]; // Temporário
        
        if (user.email === 'admin@casamento.com') {
            adminPanel.classList.remove('hidden');
            userNameDisplay.textContent = 'Admin Mode';
            try {
                const users = await getAllUsersForAdmin();
                let html = '';
                
                // Mostrar apenas os botões pro Wesley e pra Larissa conforme pedido
                users.forEach(u => {
                    const firstName = (u.name || u.id).split(' ')[0];
                    if(firstName.toLowerCase() === 'wesley' || firstName.toLowerCase() === 'larissa') {
                        const btnColor = firstName.toLowerCase() === 'larissa' ? '#bc86d6' : '#2ecc71';
                        html += `<button class="btn-primary" style="padding: 6px 14px; font-weight: bold; font-size: 0.85rem; background-color: ${btnColor}; color: white; border: none; cursor: pointer; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);" data-uid="${u.id}">${firstName}</button>`;
                    }
                });
                adminButtonsContainer.innerHTML = html || '<span style="color:white; font-size: 0.8rem;">Nenhum usuário principal encontrado.</span>';
                
                adminButtonsContainer.querySelectorAll('button').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const selId = e.currentTarget.getAttribute('data-uid');
                        const firstName = e.currentTarget.textContent;
                        window.dispatchEvent(new CustomEvent('user-logged-in', { detail: { uid: selId, email: `admin-switch-${firstName.toLowerCase()}@casamento.com` } }));
                    });
                });
                
                // Pré-selecionar Wesley como solicitado
                const wesleyBtn = Array.from(adminButtonsContainer.querySelectorAll('button')).find(b => b.textContent.toLowerCase() === 'wesley');
                if (wesleyBtn) wesleyBtn.click();
            } catch (err) {
                console.error("Erro ao carregar lista de usuários (Admin):", err);
                adminButtonsContainer.innerHTML = '<span style="color:white; font-size: 0.8rem;">Erro de permissão.</span>';
            }
        } else {
            // Usuário comum
            if(adminPanel) adminPanel.classList.add('hidden');
            // Dispara evento para carregar dados do app.js
            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: { uid: user.uid, email: user.email } }));
        }
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
