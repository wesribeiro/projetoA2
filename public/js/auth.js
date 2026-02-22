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
            userNameDisplay.textContent = 'Admin Mode';
            const switchContainer = document.getElementById('admin-switch-container');
            const btnSwitch = document.getElementById('btn-admin-switch');
            const adminList = document.getElementById('admin-profiles-list');
            
            if (switchContainer) switchContainer.style.display = 'flex';
            
            if (btnSwitch) {
                btnSwitch.addEventListener('click', () => {
                    document.getElementById('modal-switch-profile').classList.remove('hidden');
                    document.getElementById('avatar-dropdown-menu').style.display = 'none';
                });
            }

            try {
                const users = await getAllUsersForAdmin();
                let html = '';
                
                users.forEach(u => {
                    const firstName = (u.name || u.id).split(' ')[0];
                    if(firstName.toLowerCase() === 'wesley' || firstName.toLowerCase() === 'larissa') {
                        html += `<button class="btn-secondary" style="width: 100%; text-align: left; padding: 0.75rem; border: 1.5px solid #e2e8f0; background: var(--card-bg); font-weight: 600; cursor: pointer; border-radius: var(--radius-sm);" data-uid="${u.id}"><i class="ph ph-user"></i> ${firstName}</button>`;
                    }
                });
                if (adminList) adminList.innerHTML = html || '<span style="color:var(--text-muted); font-size: 0.8rem;">Nenhum usuário principal encontrado.</span>';
                
                if (adminList) {
                    adminList.querySelectorAll('button').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const selId = e.currentTarget.getAttribute('data-uid');
                            const firstName = e.currentTarget.textContent.trim();
                            document.getElementById('modal-switch-profile').classList.add('hidden');
                            window.dispatchEvent(new CustomEvent('user-logged-in', { detail: { uid: selId, email: `admin-switch-${firstName.toLowerCase()}@casamento.com` } }));
                        });
                    });
                    
                    // Pré-selecionar Wesley como solicitado
                    const wesleyBtn = Array.from(adminList.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('wesley'));
                    if (wesleyBtn) wesleyBtn.click();
                }
            } catch (err) {
                console.error("Erro ao carregar lista de usuários (Admin):", err);
                if (adminList) adminList.innerHTML = '<span style="color:var(--text-muted); font-size: 0.8rem;">Erro de permissão.</span>';
            }
        } else {
            // Usuário comum
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
