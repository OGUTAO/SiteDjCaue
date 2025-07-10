// public/js/main.js - VERSÃO FINAL, COMPLETA E CORRIGIDA

document.addEventListener('DOMContentLoaded', function () {
    // =========================================================================
    // FUNÇÕES DE AJUDA E CONFIGURAÇÃO
    // =========================================================================

    /**
     * Converte uma string em texto seguro para ser inserido como HTML, prevenindo ataques XSS.
     * @param {string} str A string para higienizar.
     * @returns {string} A string higienizada.
     */
    const sanitizeHTML = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    const showAlert = (message, type = 'danger') => {
        // Remove alerts antigos para não empilhar
        document.querySelectorAll('.alert').forEach(a => a.remove());
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 2000; min-width: 250px;">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        document.body.append(wrapper);
        setTimeout(() => wrapper.remove(), 5000);
    };

    const setupLogoutButtons = () => {
        document.querySelectorAll('.logout-link').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                showAlert('Você saiu com sucesso!', 'success');
                setTimeout(() => { window.location.href = 'index.html' }, 1500);
            });
        });
    };

    const atualizarNavbar = async () => {
        const navbarLinks = document.getElementById('navbar-links');
        if (!navbarLinks) return;
        const token = localStorage.getItem('token');
        let linksHtml = `
            <li class="nav-item"><a class="nav-link" href="index.html">INICIAL</a></li>
            <li class="nav-item"><a class="nav-link" href="sobre.html">SOBRE</a></li>
            <li class="nav-item"><a class="nav-link" href="servicos.html">SERVIÇOS</a></li>
            <li class="nav-item"><a class="nav-link" href="avaliacao.html">AVALIAÇÕES</a></li>`;
        if (token) {
            let userName = 'Usuário';
            try {
                const response = await fetch('/api/me', { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) {
                    const userData = await response.json();
                    userName = userData.name.split(' ')[0];
                } else {
                    localStorage.removeItem('token');
                    if (!window.location.pathname.endsWith('adm.html')) window.location.reload();
                    return;
                }
            } catch (error) {
                localStorage.removeItem('token');
                if (!window.location.pathname.endsWith('adm.html')) window.location.reload();
                return;
            }
            linksHtml += `
                <li class="nav-item d-flex align-items-center"><span class="nav-link navbar-text text-white-50 me-2">Olá, ${userName}</span></li>
                <li class="nav-item"><a class="nav-link fw-bold logout-link" href="#">SAIR</a></li>`;
        } else {
            linksHtml += `<li class="nav-item"><a class="nav-link" href="login.html">LOGIN</a></li>`;
        }
        navbarLinks.innerHTML = linksHtml;
        setupLogoutButtons();
    };

    // =========================================================================
    // LÓGICA ESPECÍFICA DAS PÁGINAS
    // =========================================================================
    const token = localStorage.getItem('token');

    // --- CARREGAR AVALIAÇÕES NA PÁGINA INICIAL ---
    const reviewsContainer = document.getElementById('reviews-container');
    if (reviewsContainer) {
        fetch('/api/reviews')
            .then(res => {
                if (!res.ok) throw new Error('Falha ao buscar avaliações');
                return res.json();
            })
            .then(reviews => {
                const carouselControls = document.querySelectorAll('#reviewsCarousel .carousel-control-prev, #reviewsCarousel .carousel-control-next');
                if (!reviews || reviews.length === 0) {
                    reviewsContainer.innerHTML = '<div class="carousel-item active"><p class="text-center fst-italic">Seja o primeiro a avaliar o meu trabalho!</p></div>';
                    carouselControls.forEach(control => control.style.display = 'none');
                    return;
                }
                let reviewsHtml = '';
                reviews.forEach((review, index) => {
                    let starsHtml = '';
                    for (let i = 0; i < 5; i++) {
                        starsHtml += `<i class="bi ${i < review.rating ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}"></i>`;
                    }
                    reviewsHtml += `
                        <div class="carousel-item ${index === 0 ? 'active' : ''}">
                            <div class="row justify-content-center">
                                <div class="col-lg-8 text-center">
                                    <p class="lead">"${sanitizeHTML(review.text)}"</p>
                                    <div class="my-3">${starsHtml}</div>
                                    <p class="fw-bold mb-0">${sanitizeHTML(review.name)}</p>
                                </div>
                            </div>
                        </div>`;
                });
                reviewsContainer.innerHTML = reviewsHtml;
                if (reviews.length > 1) {
                    carouselControls.forEach(control => control.style.display = 'block');
                } else {
                    carouselControls.forEach(control => control.style.display = 'none');
                }
            })
            .catch(error => {
                console.error("Erro ao carregar avaliações:", error);
                reviewsContainer.innerHTML = '<div class="carousel-item active"><p class="text-center text-danger">Não foi possível carregar as avaliações no momento.</p></div>';
            });
    }

    // --- Formulário de Login ---
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formLogin).entries());
            try {
                const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                localStorage.setItem('token', result.token);
                showAlert(result.message, 'success');
                if (result.role === 'admin') { setTimeout(() => window.location.href = 'adm.html', 1000); } 
                else { setTimeout(() => window.location.href = 'index.html', 1000); }
            } catch (error) { showAlert(error.message || "Erro desconhecido.", 'danger'); }
        });
    }

    // --- Formulário de Cadastro ---
    const formCadastro = document.getElementById('formCadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o recarregamento da página
            const data = Object.fromEntries(new FormData(formCadastro).entries());

            // Validações do frontend
            if (data.email !== data.confirmarEmail) return showAlert("Os e-mails não coincidem!", "warning");
            if (data.password.length < 6) return showAlert("A senha precisa ter no mínimo 6 caracteres.", "warning");
            
            try {
                // Remove o campo de confirmação antes de enviar para a API
                const payload = { ...data };
                delete payload.confirmarEmail;

                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                showAlert(result.message, 'success');
                setTimeout(() => window.location.href = 'login.html', 2000);

            } catch (error) {
                showAlert(error.message || "Erro ao tentar cadastrar.");
            }
        });
    }
    
    // --- Formulário Esqueci a Senha ---
    const formEsqueciSenha = document.getElementById('formEsqueciSenha');
    if (formEsqueciSenha) {
        formEsqueciSenha.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formEsqueciSenha).entries());
            try {
                const response = await fetch('/api/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                formEsqueciSenha.reset();
            } catch (error) { showAlert(error.message || "Erro ao solicitar recuperação."); }
        });
    }

    // --- Formulário Redefinir Senha ---
    const formResetPassword = document.getElementById('formResetPassword');
    if (formResetPassword) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
            document.getElementById('token').value = urlToken;
        } else {
            showAlert('Token de recuperação não encontrado na URL.', 'danger');
        }

        formResetPassword.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formResetPassword).entries());
            if (data.password.length < 6) return showAlert('A nova senha precisa ter no mínimo 6 caracteres.', 'warning');
            if (data.password !== data.confirmPassword) return showAlert('As senhas não coincidem!', 'warning');
            
            try {
                const payload = { token: data.token, password: data.password };
                const response = await fetch('/api/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } catch (error) { showAlert(error.message || "Erro ao redefinir a senha."); }
        });
    }

    // --- Formulário de Orçamento ---
    const formOrcamento = document.getElementById('formOrcamento');
    if (formOrcamento) {
        formOrcamento.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return showAlert("Você precisa estar logado para enviar um orçamento.", "warning");
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

    // --- Formulário de Avaliação ---
    const formAvaliacao = document.getElementById('formAvaliacao');
    if (formAvaliacao) {
        const stars = document.querySelectorAll('.star-rating i');
        const ratingInput = document.getElementById('rating');
        const resetStars = () => stars.forEach(star => star.classList.remove('selected'));
        stars.forEach(star => {
            star.addEventListener('mouseover', function () {
                resetStars();
                for (let i = 0; i < this.dataset.value; i++) stars[i].classList.add('selected');
            });
            star.addEventListener('mouseout', () => {
                resetStars();
                if (ratingInput.value > 0) for (let i = 0; i < ratingInput.value; i++) stars[i].classList.add('selected');
            });
            star.addEventListener('click', function () {
                ratingInput.value = this.dataset.value;
                for (let i = 0; i < ratingInput.value; i++) stars[i].classList.add('selected');
            });
        });
        formAvaliacao.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return showAlert("Você precisa estar logado para enviar uma avaliação.", "warning");
            const data = Object.fromEntries(new FormData(formAvaliacao).entries());
            if (!data.rating || data.rating === "0") return showAlert("Por favor, selecione uma nota de 1 a 5 estrelas.");
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

    // =========================================================================
    // PAINEL DE ADMINISTRAÇÃO (adm.html)
    // =========================================================================
    if (window.location.pathname.endsWith('adm.html')) {
        if (!token) { window.location.href = 'login.html'; return; }

        const fetchData = async (endpoint, options = {}) => {
            options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
            const response = await fetch(endpoint, options);
            const responseBody = await response.text();
            if (!response.ok) {
                let errorMsg = 'Erro desconhecido.';
                try { errorMsg = JSON.parse(responseBody).message; } catch(e) { errorMsg = `Erro ${response.status}: Falha ao comunicar com o servidor.`; }
                if (response.status === 401 || response.status === 403) {
                    showAlert(errorMsg || "Sessão expirada ou acesso negado. Redirecionando...", "warning");
                    localStorage.removeItem('token');
                    setTimeout(() => window.location.href = 'login.html', 2500);
                }
                throw new Error(errorMsg);
            }
            return responseBody ? JSON.parse(responseBody) : {};
        };

        const navLinks = { orcamentos: document.getElementById('nav-orcamentos'), clientes: document.getElementById('nav-clientes'), avaliacoes: document.getElementById('nav-avaliacoes') };
        const views = { orcamentos: document.getElementById('orcamentos-view'), clientes: document.getElementById('clientes-view'), avaliacoes: document.getElementById('avaliacoes-view') };
        const showView = (viewName) => {
            Object.values(views).forEach(view => view.classList.add('d-none'));
            Object.values(navLinks).forEach(link => link.classList.remove('active'));
            if (views[viewName]) views[viewName].classList.remove('d-none');
            if (navLinks[viewName]) navLinks[viewName].classList.add('active');
        };

        Object.keys(navLinks).forEach(key => {
            if (navLinks[key]) navLinks[key].addEventListener('click', (e) => { e.preventDefault(); showView(key); });
        });

        // --- LÓGICA DE ORÇAMENTOS E CLIENTES (COM AÇÕES) ---
        const orcamentosTbody = document.getElementById('orcamentos-tbody');
        const quoteDetailModal = new bootstrap.Modal(document.getElementById('quoteDetailModal'));
        
        const loadOrcamentos = async () => {
            try {
                const orcamentos = await fetchData('/api/admin-orcamentos');
                orcamentosTbody.innerHTML = '';
                if (!orcamentos || orcamentos.length === 0) {
                    orcamentosTbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum orçamento solicitado.</td></tr>';
                    return;
                }
                orcamentos.forEach(o => {
                    const row = document.createElement('tr');
                    const statusClass = `status-select-${o.status.toLowerCase()}`;
                    row.innerHTML = `
                        <td>${o.client_name}</td>
                        <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>${o.event_type}</td>
                        <td>
                            <select class="form-select form-select-sm bg-dark text-white select-status ${statusClass}" data-id="${o.id}">
                                <option value="Pendente" ${o.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="Concluido" ${o.status === 'Concluido' ? 'selected' : ''}>Concluído</option>
                                <option value="Cancelado" ${o.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                                <option value="Rejeitado" ${o.status === 'Rejeitado' ? 'selected' : ''}>Rejeitado</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary view-details" title="Ver Detalhes" data-orcamento='${JSON.stringify(o)}'><i class="bi bi-eye-fill"></i></button>
                            <button class="btn btn-sm btn-danger delete-orcamento" title="Excluir" data-id="${o.id}"><i class="bi bi-trash-fill"></i></button>
                        </td>`;
                    orcamentosTbody.appendChild(row);
                });
            } catch (error) { showAlert(error.message, 'danger'); }
        };

        const clientesTbody = document.getElementById('clientes-tbody');
        const loadClientes = async (searchTerm = '') => {
            try {
                const clientes = await fetchData(`/api/admin-clientes?search=${encodeURIComponent(searchTerm)}`);
                clientesTbody.innerHTML = '';
                if (clientes.length === 0) {
                    clientesTbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente encontrado.</td></tr>';
                    return;
                }
                clientes.forEach(c => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${c.name}</td>
                        <td>${c.email}</td>
                        <td>${c.phone || 'N/A'}</td>
                        <td>${c.birth_date ? new Date(c.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</td>
                        <td><button class="btn btn-sm btn-danger delete-cliente" data-id="${c.id}"><i class="bi bi-trash-fill"></i></button></td>`;
                    clientesTbody.appendChild(row);
                });
            } catch (error) { showAlert(error.message, 'danger'); }
        };

        // --- LÓGICA PARA AVALIAÇÕES (COM AÇÕES) ---
        const avaliacoesTbody = document.getElementById('avaliacoes-tbody');
        const loadAvaliacoes = async () => {
            try {
                const avaliacoes = await fetchData('/api/admin-avaliacoes');
                avaliacoesTbody.innerHTML = '';
                if (avaliacoes.length === 0) {
                    avaliacoesTbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma avaliação encontrada.</td></tr>';
                    return;
                }
                avaliacoes.forEach(a => {
                    const row = document.createElement('tr');
                    const statusBadge = a.status === 'Aprovada' ? 'bg-success' : a.status === 'Rejeitada' ? 'bg-danger' : 'bg-warning text-dark';
                    row.innerHTML = `
                        <td>${sanitizeHTML(a.name)}</td>
                        <td><div class="truncate-text" title="${sanitizeHTML(a.text)}">${sanitizeHTML(a.text)}</div></td>
                        <td><span class="badge ${statusBadge}">${a.status}</span></td>
                        <td>
                            ${a.status === 'Pendente' ? `<button class="btn btn-sm btn-success approve-review" title="Aprovar" data-id="${a.id}"><i class="bi bi-check-lg"></i></button> <button class="btn btn-sm btn-warning reject-review" title="Rejeitar" data-id="${a.id}"><i class="bi bi-x-lg"></i></button>` : ''}
                            <button class="btn btn-sm btn-danger delete-review" title="Excluir" data-id="${a.id}"><i class="bi bi-trash-fill"></i></button>
                        </td>`;
                    avaliacoesTbody.appendChild(row);
                });
            } catch (error) { showAlert(error.message, 'danger'); }
        };

        // --- ANEXAR OUVINTES DE EVENTOS (DELEGAÇÃO) ---
        const mainPanel = document.querySelector('.w-100.p-4');
        
        mainPanel.addEventListener('change', async (e) => {
            if (e.target.classList.contains('select-status')) {
                const id = e.target.dataset.id;
                const status = e.target.value;
                try {
                    const result = await fetchData(`/api/admin-orcamento-update-status?id=${id}`, {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ status })
                    });
                    showAlert(result.message, 'success');
                    loadOrcamentos();
                } catch (error) {
                    showAlert(error.message, 'danger');
                }
            }
        });

        mainPanel.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const id = button.dataset.id;
            try {
                let result;
                // Ações de Avaliações
                if (button.classList.contains('approve-review')) {
                    result = await fetchData(`/api/admin-avaliacao-approve?id=${id}`, { method: 'PUT' });
                } else if (button.classList.contains('reject-review')) {
                    result = await fetchData(`/api/admin-avaliacao-reject?id=${id}`, { method: 'PUT' });
                } else if (button.classList.contains('delete-review')) {
                    if (confirm('Tem certeza que deseja excluir esta avaliação?')) {
                        result = await fetchData(`/api/admin-avaliacao-delete?id=${id}`, { method: 'DELETE' });
                    }
                }
                // Ações de Orçamentos
                else if (button.classList.contains('view-details')) {
                    const data = JSON.parse(button.dataset.orcamento);
                    document.getElementById('modal-quote-client-name').textContent = data.client_name;
                    document.getElementById('modal-quote-client-email').textContent = data.client_email;
                    document.getElementById('modal-quote-client-phone').textContent = data.client_phone;
                    document.getElementById('modal-quote-event-type').textContent = data.event_type;
                    document.getElementById('modal-quote-event-date').textContent = new Date(data.event_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                    document.getElementById('modal-quote-event-time').textContent = `${data.start_time} - ${data.end_time}`;
                    document.getElementById('modal-quote-event-location').textContent = data.location;
                    document.getElementById('modal-quote-event-details').textContent = data.details || 'Nenhum detalhe adicional.';
                    document.getElementById('modal-quote-solicitation-date').textContent = new Date(data.created_at).toLocaleString('pt-BR');
                    quoteDetailModal.show();
                } else if (button.classList.contains('delete-orcamento')) {
                    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
                        result = await fetchData(`/api/admin-orcamento-delete?id=${id}`, { method: 'DELETE' });
                    }
                }
                    else if (button.classList.contains('delete-cliente')) {
                    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
                        result = await fetchData(`/api/admin-cliente-delete?id=${id}`, { method: 'DELETE' });
                    }
                }

                if (result) {
                    showAlert(result.message, 'success');
                    loadAvaliacoes();
                    loadOrcamentos();
                }
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        });
        
        // --- Anexar ouvintes para a navegação e carga inicial ---
        if (orcamentosTbody) document.getElementById('nav-orcamentos').addEventListener('click', loadOrcamentos);
        if (clientesTbody) {
            const searchInput = document.getElementById('search-cliente-input');
            document.getElementById('nav-clientes').addEventListener('click', () => loadClientes(searchInput.value));
            document.getElementById('search-cliente-button').addEventListener('click', () => loadClientes(searchInput.value));
            searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') loadClientes(searchInput.value); });
        }
        if (avaliacoesTbody) document.getElementById('nav-avaliacoes').addEventListener('click', loadAvaliacoes);
        
        loadOrcamentos();
        loadClientes();
        loadAvaliacoes();
        setupLogoutButtons();
    }
    
    // =========================================================================
    // LÓGICA DE CARREGAMENTO DA NAVBAR
    // =========================================================================
    
    // Se a página já tem a navbar (index.html), apenas atualiza os links.
    if (document.getElementById('navbar-links')) {
        atualizarNavbar();
    }
    
    // Se a página tem um nav vazio (páginas secundárias), carrega a estrutura do index.html.
    const navElement = document.querySelector('nav:not(:has(.container))');
    if (navElement) {
        fetch('index.html').then(res => res.text()).then(text => {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const sourceNav = doc.querySelector('nav');
            if (sourceNav) {
                navElement.innerHTML = sourceNav.innerHTML;
                atualizarNavbar();
            }
        });
    }
});