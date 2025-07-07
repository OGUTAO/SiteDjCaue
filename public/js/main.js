// =============== INÍCIO DO CÓDIGO CORRIGIDO PARA main.js ===============

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');

    // Função para mostrar alertas na tela
    const showAlert = (message, type = 'danger') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 2000;">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        document.body.append(wrapper);
        setTimeout(() => wrapper.remove(), 4000);
    };

    // Função para configurar os botões de logout
    const setupLogoutButtons = () => {
        const logoutButtons = document.querySelectorAll('.logout-link');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                showAlert('Você saiu com sucesso!', 'success');
                setTimeout(() => { window.location.href = 'index.html' }, 1500);
            });
        });
    };

    // Função PRINCIPAL que atualiza o menu de navegação
    const atualizarNavbar = async () => {
        const navbarLinks = document.getElementById('navbar-links');
        if (!navbarLinks) return; // Se não encontrar o menu, não faz nada

        const token = localStorage.getItem('token');

        // HTML base com os links que aparecem para todos
        let linksHtml = `
            <li class="nav-item"><a class="nav-link" href="index.html">INICIAL</a></li>
            <li class="nav-item"><a class="nav-link" href="sobre.html">SOBRE</a></li>
            <li class="nav-item"><a class="nav-link" href="servicos.html">SERVIÇOS</a></li>
            <li class="nav-item"><a class="nav-link" href="avaliacao.html">AVALIAÇÕES</a></li>
        `;

        if (token) {
            // Se o usuário TEM um token (está logado)
            let userName = '';
            try {
                // Busca o nome do usuário na API
                const response = await fetch('/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const userData = await response.json();
                    userName = userData.name;
                } else {
                    // Se o token for inválido, limpa e recarrega
                    console.error('Token inválido ou expirado. Deslogando...');
                    localStorage.removeItem('token');
                    window.location.reload();
                    return;
                }
            } catch (error) {
                console.error('Erro de rede ao buscar dados do usuário:', error);
                localStorage.removeItem('token');
                window.location.reload();
                return;
            }

            // Adiciona o "Olá, Nome" e o botão "SAIR"
            linksHtml += `
                <li class="nav-item d-flex align-items-center">
                    <span class="nav-link navbar-text text-white-50 me-2">Olá, ${userName}</span>
                </li>
                <li class="nav-item">
                    <a class="nav-link fw-bold logout-link" href="#">SAIR</a>
                </li>
            `;

        } else {
            // Se NÃO tem token, mostra o botão "LOGIN"
            linksHtml += `<li class="nav-item"><a class="nav-link" href="login.html">LOGIN</a></li>`;
        }

        navbarLinks.innerHTML = linksHtml;
        setupLogoutButtons(); // Reconfigura o botão de logout que foi recriado
    };
    
    // =========================================================================
    // LÓGICA DE EXECUÇÃO
    // =========================================================================
    
    // 1. CHAMA a função para atualizar o menu apenas na PÁGINA INICIAL.
    // Nas outras páginas, o próprio HTML fará essa chamada.
    if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
        atualizarNavbar();
    }
    
    // 2. Lógica para o ícone de mostrar/esconder senha
    const setupPasswordToggle = () => {
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function () {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.classList.toggle('bi-eye-fill');
                this.classList.toggle('bi-eye-slash-fill');
            });
        }
    };
    setupPasswordToggle();

    // 3. Lógica para o formulário de login
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formLogin).entries());
            try {
                const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                localStorage.setItem('token', result.token);
                if (result.role === 'admin') { setTimeout(() => window.location.href = 'adm.html', 1000); } 
                else { setTimeout(() => window.location.href = 'index.html', 1000); }
            } catch (error) { showAlert(error.message || "Erro desconhecido.", 'danger'); }
        });
    }

    // 4. Lógica para o formulário de orçamento (agora verificará o token na hora do envio)
    const formOrcamento = document.getElementById('formOrcamento');
    if (formOrcamento) {
        formOrcamento.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentToken = localStorage.getItem('token'); // Pega o token na hora do clique
            if (!currentToken) {
                return showAlert("Você precisa estar logado para enviar um orçamento. Por favor, faça o login.", "warning");
            }
            const data = Object.fromEntries(new FormData(formOrcamento).entries());
            try {
                const response = await fetch('/api/orcamento', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                formOrcamento.reset();
            } catch (error) { showAlert(error.message || "Erro ao enviar solicitação."); }
        });
    }

    // 5. Lógica para o formulário de avaliação (também verificará o token)
    const formAvaliacao = document.getElementById('formAvaliacao');
    if (formAvaliacao) {
        // ... (todo o código das estrelas que você já tem) ...
        const stars = document.querySelectorAll('.star-rating i');
        const ratingInput = document.getElementById('rating');
        function resetStars() {
            stars.forEach(star => star.classList.remove('selected'));
        }
        stars.forEach(star => {
            star.addEventListener('mouseover', function () {
                resetStars();
                const currentValue = this.dataset.value;
                for (let i = 0; i < currentValue; i++) { stars[i].classList.add('selected'); }
            });
            star.addEventListener('mouseout', function () {
                resetStars();
                const selectedRating = ratingInput.value;
                if (selectedRating > 0) {
                    for (let i = 0; i < selectedRating; i++) { stars[i].classList.add('selected'); }
                }
            });
            star.addEventListener('click', function () {
                ratingInput.value = this.dataset.value;
                const selectedRating = ratingInput.value;
                resetStars();
                 for (let i = 0; i < selectedRating; i++) {
                    stars[i].classList.add('selected');
                }
            });
        });

        formAvaliacao.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentToken = localStorage.getItem('token'); // Pega o token na hora do clique
            if (!currentToken) {
                return showAlert("Você precisa estar logado para enviar uma avaliação. Por favor, faça o login.", "warning");
            }
            const data = Object.fromEntries(new FormData(formAvaliacao).entries());
            if (data.rating === "0" || !data.rating) {
                return showAlert("Por favor, selecione uma nota de 1 a 5 estrelas.");
            }
            try {
                const response = await fetch('/api/avaliacao', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                formAvaliacao.reset();
                ratingInput.value = 0;
                resetStars();
            } catch (error) { showAlert(error.message || "Erro ao enviar avaliação."); }
        });
    }

    // O restante do seu código (cadastro, admin, etc.) continua aqui...
    // ... (formCadastro, adm.html, etc.) ...
});

// Nota: O código completo de cadastro e admin não foi incluído aqui para focar na solução,
// mas você deve manter o restante do seu código original que lida com essas partes.