// public/js/main.js - VERSÃO FINAL, COMPLETA E CORRIGIDA

document.addEventListener('DOMContentLoaded', function () {
    // =========================================================================
    // FUNÇÕES DE AJUDA E CONFIGURAÇÃO
    // =========================================================================
    const showAlert = (message, type = 'danger') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 2000;">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        document.body.append(wrapper);
        setTimeout(() => wrapper.remove(), 4000);
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
                    localStorage.removeItem('token'); window.location.reload(); return;
                }
            } catch (error) {
                localStorage.removeItem('token'); window.location.reload(); return;
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
    // EVENTOS GERAIS
    // =========================================================================
    if (document.getElementById('navbar-links')) {
        atualizarNavbar();
    }
    const token = localStorage.getItem('token');

    // Formulário de Login com CORREÇÃO
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o recarregamento padrão da página
            const data = Object.fromEntries(new FormData(formLogin).entries());
            try {
                const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                // Salva o token e redireciona
                localStorage.setItem('token', result.token);
                showAlert(result.message, 'success');
                
                if (result.role === 'admin') { 
                    setTimeout(() => window.location.href = 'adm.html', 1000); 
                } else { 
                    setTimeout(() => window.location.href = 'index.html', 1000); 
                }
            } catch (error) { 
                showAlert(error.message || "Erro desconhecido.", 'danger'); 
            }
        });
    }

    // Lógica Formulário de Avaliação (STARS)
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
                formAvaliaco.reset();
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
            if (!response.ok) {
                if (response.status === 401 || response.status === 403 || response.status === 502) {
                    showAlert("Sessão expirada ou acesso negado. Redirecionando...", "warning");
                    localStorage.removeItem('token');
                    setTimeout(() => window.location.href = 'login.html', 2500);
                }
                const errorResult = await response.json().catch(() => ({ message: 'Falha ao comunicar com o servidor.' }));
                throw new Error(errorResult.message);
            }
            const text = await response.text();
            return text ? JSON.parse(text) : {};
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

        const loadAndAttachAdminListeners = () => {
            // --- ORÇAMENTOS ---
            const orcamentosTbody = document.getElementById('orcamentos-tbody');
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
                        row.innerHTML = `
                            <td>${o.client_name}</td>
                            <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                            <td>${o.event_type}</td>
                            <td><span class="badge bg-info">${o.status}</span></td>
                            <td><button class="btn btn-sm btn-primary view-details" data-orcamento='${JSON.stringify(o)}'><i class="bi bi-eye-fill"></i></button></td>`;
                        orcamentosTbody.appendChild(row);
                    });
                } catch (error) { showAlert(error.message, 'danger'); }
            };

            // --- CLIENTES ---
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

            // --- AVALIAÇÕES ---
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
                        const statusBadge = a.status === 'Aprovada' ? 'bg-success' : a.status === 'Rejeitada' ? 'bg-danger' : 'bg-warning';
                        row.innerHTML = `
                            <td>${a.name}</td>
                            <td><div class="truncate-text" title="${a.text}">${a.text}</div></td>
                            <td><span class="badge ${statusBadge}">${a.status}</span></td>
                            <td>
                                ${a.status === 'Pendente' ? `<button class="btn btn-sm btn-success approve-review" title="Aprovar" data-id="${a.id}"><i class="bi bi-check-lg"></i></button> <button class="btn btn-sm btn-warning reject-review" title="Rejeitar" data-id="${a.id}"><i class="bi bi-x-lg"></i></button>` : ''}
                                <button class="btn btn-sm btn-danger delete-review" title="Excluir" data-id="${a.id}"><i class="bi bi-trash-fill"></i></button>
                            </td>`;
                        avaliacoesTbody.appendChild(row);
                    });
                } catch (error) { showAlert(error.message, 'danger'); }
            };

            // Anexar ouvintes
            if (orcamentosTbody) document.getElementById('nav-orcamentos').addEventListener('click', loadOrcamentos);
            if (clientesTbody) {
                const searchInput = document.getElementById('search-cliente-input');
                document.getElementById('nav-clientes').addEventListener('click', () => loadClientes(searchInput.value));
                document.getElementById('search-cliente-button').addEventListener('click', () => loadClientes(searchInput.value));
                searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') loadClientes(searchInput.value); });
            }
            if (avaliacoesTbody) document.getElementById('nav-avaliacoes').addEventListener('click', loadAvaliacoes);
            
            // Carga inicial
            loadOrcamentos();
            loadClientes();
            loadAvaliacoes();
        };

        setupLogoutButtons();
        loadAndAttachAdminListeners();
    }

    // Carregamento dinâmico de navbar
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