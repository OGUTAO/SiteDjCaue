document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');

    const showAlert = (message, type = 'danger') => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 2000;">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        document.body.append(wrapper);
        setTimeout(() => wrapper.remove(), 4000);
    };

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

    // =========================================================================
    // ===          INÍCIO DO CÓDIGO MODIFICADO (FUNÇÃO ATUALIZADA)          ===
    // =========================================================================
    const atualizarNavbar = async () => {
        const navbarLinks = document.getElementById('navbar-links');
        if (!navbarLinks) return;

        const token = localStorage.getItem('token');

        // HTML base com os links que aparecem sempre
        let linksHtml = `
            <li class="nav-item"><a class="nav-link" href="index.html">INICIAL</a></li>
            <li class="nav-item"><a class="nav-link" href="sobre.html">SOBRE</a></li>
            <li class="nav-item"><a class="nav-link" href="servicos.html">SERVIÇOS</a></li>
            <li class="nav-item"><a class="nav-link" href="avaliacao.html">AVALIAÇÕES</a></li>
        `;

        if (token) {
            // Se o usuário está logado (possui token)
            let userName = ''; // Variável para guardar o nome

            try {
                // Chama a nova rota /api/users/me para pegar o nome
                const response = await fetch('/api/users/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    userName = userData.name; // Armazena o nome retornado pela API
                } else {
                    // Se a resposta não for OK (ex: token expirado), o usuário será deslogado
                    console.error('Token inválido ou expirado. Deslogando...');
                    localStorage.removeItem('token');
                    window.location.reload(); // Recarrega a página para atualizar o menu para o modo "deslogado"
                    return;
                }
            } catch (error) {
                console.error('Erro de rede ao buscar dados do usuário:', error);
                localStorage.removeItem('token');
                window.location.reload();
                return;
            }

            // Constrói a parte final do menu com o nome do usuário e o botão SAIR
            linksHtml += `
                <li class="nav-item d-flex align-items-center">
                    <span class="nav-link navbar-text text-white-50 me-2">Olá, ${userName}</span>
                </li>
                <li class="nav-item">
                    <a class="nav-link fw-bold logout-link" href="#">SAIR</a>
                </li>
            `;

        } else {
            // Se não há token, mostra o botão de LOGIN
            linksHtml += `<li class="nav-item"><a class="nav-link" href="login.html">LOGIN</a></li>`;
        }

        // Insere o HTML final no menu
        navbarLinks.innerHTML = linksHtml;
        
        // Reconfigura o listener do botão de logout, pois ele foi recriado
        setupLogoutButtons();
    };
    
        // CHAMA A FUNÇÃO PARA ATUALIZAR O NAVBAR APENAS UMA VEZ NA PÁGINA INICIAL
        // NAS OUTRAS PÁGINAS, O CÓDIGO HTML VAI CHAMAR ESSA FUNÇÃO
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
            atualizarNavbar();
        } else {
            setupLogoutButtons(); // Configura o logout para o caso de o menu já estar no cache
        }
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

    const paginaAtual = window.location.pathname;
    if (paginaAtual.endsWith('servicos.html') || paginaAtual.endsWith('avaliacao.html') || paginaAtual.endsWith('adm.html')) {
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

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

    const formCadastro = document.getElementById('formCadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formCadastro).entries());

            // --- INÍCIO DAS NOVAS VALIDAÇÕES ---

            // 1. Validação do formato do e-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                return showAlert("Por favor, insira um formato de e-mail válido (ex: seuemail@dominio.com).", "warning");
            }

            if (data.email !== data.confirmarEmail) {
                return showAlert("Os e-mails digitados não coincidem!", "warning");
            }
            
            // 2. Validação da data de nascimento
            const birthDate = new Date(data.birth_date);
            const today = new Date();
            const minBirthYear = 1920; // Define o ano mínimo aceitável
            const eighteenYearsAgo = new Date(new Date().setFullYear(today.getFullYear() - 18)); // Data exata de 18 anos atrás

            if (!data.birth_date) return showAlert("A data de nascimento é obrigatória.", "warning");
            if (birthDate > today) return showAlert("A data de nascimento não pode ser uma data futura.", "warning");
            if (birthDate.getFullYear() < minBirthYear) return showAlert(`Data de nascimento inválida. Por favor, insira um ano a partir de ${minBirthYear}.`, "warning");
            if (birthDate > eighteenYearsAgo) return showAlert("Você precisa ter pelo menos 18 anos para se cadastrar.", "warning");
            
            // --- FIM DAS NOVAS VALIDAÇÕES ---
            
            try {
                const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                setTimeout(() => window.location.href = 'login.html', 1500);
            } catch (error) { showAlert(error.message || "Erro ao cadastrar."); }
        });
    }
    
    const formOrcamento = document.getElementById('formOrcamento');
    if (formOrcamento) {
        formOrcamento.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formOrcamento).entries());
            try {
                const response = await fetch('/api/orcamento', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                formOrcamento.reset();
            } catch (error) { showAlert(error.message || "Erro ao enviar solicitação."); }
        });
    }

    const formAvaliacao = document.getElementById('formAvaliacao');
    if (formAvaliacao) {
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
            const data = Object.fromEntries(new FormData(formAvaliacao).entries());
            if (data.rating === "0" || !data.rating) {
                return showAlert("Por favor, selecione uma nota de 1 a 5 estrelas.");
            }
            try {
                const response = await fetch('/api/avaliacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                formAvaliacao.reset();
                ratingInput.value = 0;
                resetStars();
            } catch (error) { showAlert(error.message || "Erro ao enviar avaliação."); }
        });
    }

    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const reviewsContainer = document.getElementById('reviews-container');
        const carouselElement = document.getElementById('reviewsCarousel');
        if (reviewsContainer && carouselElement) {
            fetch('/api/reviews').then(res => res.json()).then(reviews => {
                reviewsContainer.innerHTML = ''; 
                if (!reviews || reviews.length === 0) {
                    reviewsContainer.innerHTML = '<div class="carousel-item active"><div class="row justify-content-center"><div class="col-12 text-center"><p>Ainda não há avaliações de clientes.</p></div></div></div>';
                    return;
                }
                if (reviews.length <= 3) {
                    const staticItem = document.createElement('div');
                    staticItem.className = 'carousel-item active';
                    const row = document.createElement('div');
                    row.className = 'row justify-content-center';
                    reviews.forEach(review => {
                        const col = document.createElement('div');
                        col.className = 'col-md-4 mb-3 text-center';
                        col.innerHTML = `<p class="fst-italic">"${'⭐️'.repeat(review.rating)} - ${review.text}"</p><small>- ${review.name}</small>`;
                        row.appendChild(col);
                    });
                    staticItem.appendChild(row);
                    reviewsContainer.appendChild(staticItem);
                } else {
                    reviews.forEach((review, index) => {
                        const carouselItem = document.createElement('div');
                        carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                        carouselItem.innerHTML = `<div class="row justify-content-center"><div class="col-md-8 col-lg-6 text-center"><p class="fst-italic fs-5">"${'⭐️'.repeat(review.rating)} - ${review.text}"</p><small>- ${review.name}</small></div></div>`;
                        reviewsContainer.appendChild(carouselItem);
                    });
                    document.querySelector('.carousel-control-prev').style.display = 'block';
                    document.querySelector('.carousel-control-next').style.display = 'block';
                    new bootstrap.Carousel(carouselElement, {
                        interval: 5000,
                        wrap: true,
                        ride: 'carousel'
                    });
                }
            }).catch(err => {
                console.error("Erro ao carregar avaliações", err);
                reviewsContainer.innerHTML = '<div class="carousel-item active"><div class="row justify-content-center"><div class="col-12 text-center"><p>Não foi possível carregar as avaliações.</p></div></div></div>';
            });
        }
    }

    if (window.location.pathname.endsWith('adm.html')) {
        const fetchData = async (endpoint) => { const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } }); if (!response.ok) { if (response.status === 401 || response.status === 403) { showAlert("Sessão expirada ou acesso negado."); localStorage.removeItem('token'); setTimeout(() => window.location.href = 'login.html', 2000); } throw new Error('Falha ao buscar dados'); } return response.json(); };
        const navLinks = { orcamentos: document.getElementById('nav-orcamentos'), clientes: document.getElementById('nav-clientes'), avaliacoes: document.getElementById('nav-avaliacoes') };
        const views = { orcamentos: document.getElementById('orcamentos-view'), clientes: document.getElementById('clientes-view'), avaliacoes: document.getElementById('avaliacoes-view') };
        const showView = (viewName) => { Object.values(views).forEach(view => view.classList.add('d-none')); Object.values(navLinks).forEach(link => link.classList.remove('active')); views[viewName].classList.remove('d-none'); navLinks[viewName].classList.add('active'); };
        navLinks.orcamentos.addEventListener('click', (e) => { e.preventDefault(); showView('orcamentos'); });
        navLinks.clientes.addEventListener('click', (e) => { e.preventDefault(); showView('clientes'); });
        navLinks.avaliacoes.addEventListener('click', (e) => { e.preventDefault(); showView('avaliacoes'); });
        
        const quoteDetailModal = new bootstrap.Modal(document.getElementById('quoteDetailModal'));
        const orcamentosTbody = document.getElementById('orcamentos-tbody');

        const loadOrcamentos = () => {
            fetchData('/api/admin/orcamentos').then(orcamentos => {
                orcamentosTbody.innerHTML = '';
                if (orcamentos.length === 0) { orcamentosTbody.innerHTML = '<tr><td colspan="5">Nenhum orçamento encontrado.</td></tr>'; return; }
                orcamentos.forEach(o => {
                    const statusOptions = ['Pendente', 'Concluido', 'Cancelado', 'Rejeitado'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('');
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${o.client_name}</td>
                        <td>${new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>${o.event_type}</td>
                        <td><select class="form-select form-select-sm bg-dark text-white select-status status-select-${o.status.toLowerCase()}" data-id="${o.id}">${statusOptions}</select></td>
                        <td class="text-nowrap">
                            <button class="btn btn-sm btn-primary view-quote-details me-2" data-client-name="${o.client_name}" data-client-email="${o.client_email}" data-client-phone="${o.client_phone || 'N/A'}" data-solicitation-date="${new Date(o.created_at).toLocaleString('pt-BR')}" data-event-type="${o.event_type}" data-event-date="${new Date(o.event_date).toLocaleDateString('pt-BR')}" data-event-time="${o.start_time || '--:--'} - ${o.end_time || '--:--'}" data-event-location="${o.location || 'Não informado'}" data-event-details="${o.details || 'Nenhum detalhe adicional.'}">Ver Detalhes</button>
                            <button class="btn btn-sm btn-danger delete-quote-btn" data-id="${o.id}">Excluir</button>
                        </td>
                    `;
                    orcamentosTbody.appendChild(row);
                });
            }).catch(err => console.error(err));
        };
        loadOrcamentos();

        orcamentosTbody.addEventListener('click', async (event) => {
            const button = event.target;
            if (button.classList.contains('view-quote-details')) {
                const data = button.dataset;
                document.getElementById('modal-quote-client-name').textContent = data.clientName;
                document.getElementById('modal-quote-client-email').textContent = data.clientEmail;
                document.getElementById('modal-quote-client-phone').textContent = data.clientPhone;
                document.getElementById('modal-quote-solicitation-date').textContent = data.solicitationDate;
                document.getElementById('modal-quote-event-type').textContent = data.eventType;
                document.getElementById('modal-quote-event-date').textContent = data.eventDate;
                document.getElementById('modal-quote-event-time').textContent = data.eventTime;
                document.getElementById('modal-quote-event-location').textContent = data.eventLocation;
                document.getElementById('modal-quote-event-details').textContent = data.eventDetails;
                quoteDetailModal.show();
            } else if (button.classList.contains('delete-quote-btn')) {
                const quoteId = button.dataset.id;
                if (confirm('Você deseja mesmo excluir este orçamento? Esta ação não pode ser desfeita.')) {
                    try {
                        const response = await fetch(`/api/admin/orcamentos/${quoteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        showAlert(result.message, 'success');
                        loadOrcamentos();
                    } catch (error) { showAlert(error.message || "Erro ao excluir orçamento.", 'danger'); }
                }
            }
        });
        orcamentosTbody.addEventListener('change', async (event) => { if (event.target.classList.contains('select-status')) { const select = event.target; select.className = `form-select form-select-sm bg-dark text-white select-status status-select-${select.value.toLowerCase()}`; try { await fetch(`/api/admin/orcamentos/${select.dataset.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: select.value }) }); showAlert('Status atualizado!', 'success'); } catch (error) { showAlert("Erro ao atualizar."); } } });
        
        const searchInput = document.getElementById('search-cliente-input');
        const searchButton = document.getElementById('search-cliente-button');
        const clientesTbody = document.getElementById('clientes-tbody');
        const loadClientes = (searchTerm = '') => { const url = searchTerm ? `/api/admin/clientes?search=${encodeURIComponent(searchTerm)}` : '/api/admin/clientes'; fetchData(url).then(clientes => { clientesTbody.innerHTML = ''; if (clientes.length === 0) { clientesTbody.innerHTML = '<tr><td colspan="4">Nenhum cliente encontrado.</td></tr>'; return; } clientes.forEach(c => { const birthDate = c.birth_date ? new Date(c.birth_date).toLocaleDateString() : 'N/A'; clientesTbody.innerHTML += `<tr><td>${c.name}</td><td>${c.email}</td><td>${c.phone || 'N/A'}</td><td>${birthDate}</td><td class="text-nowrap"><button class="btn btn-sm btn-danger delete-client-btn" data-id="${c.id}">Excluir</button></td></tr>`; }); }).catch(err => console.error(err)); };
        searchButton.addEventListener('click', () => loadClientes(searchInput.value));
        searchInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') loadClientes(searchInput.value); });
        // NOVO: Event listener para o botão de excluir cliente
        clientesTbody.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-client-btn')) {
                const clientId = event.target.dataset.id;
                // A caixa de confirmação que você pediu
                if (confirm('Tem certeza que deseja excluir este cliente permanentemente?')) {
                    try {
                        const response = await fetch(`/api/admin/clientes/${clientId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message);
                        showAlert(result.message, 'success');
                        loadClientes(searchInput.value); // Recarrega a lista de clientes para mostrar a mudança
                    } catch (error) {
                        showAlert(error.message || "Erro ao excluir cliente.", 'danger');
                    }
                }
            }
        });
        loadClientes();
        
        const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'));
        const avaliacoesTbody = document.getElementById('avaliacoes-tbody');
        const loadAvaliacoes = () => { fetchData('/api/admin/avaliacoes').then(avaliacoes => { avaliacoesTbody.innerHTML = ''; if (avaliacoes.length === 0) { avaliacoesTbody.innerHTML = '<tr><td colspan="4">Nenhuma avaliação encontrada.</td></tr>'; return; } avaliacoes.forEach(a => { const statusClass = a.status === 'Aprovada' ? 'status-aceito' : (a.status === 'Rejeitada' ? 'status-rejeitado' : 'status-pendente'); let actionButtons = ''; if (a.status === 'Pendente') { actionButtons = `<button class="btn btn-sm btn-success btn-approve me-2" data-id="${a.id}">Aprovar</button><button class="btn btn-sm btn-warning btn-reject" data-id="${a.id}">Rejeitar</button>`; } else { actionButtons = `<button class="btn btn-sm btn-danger btn-delete" data-id="${a.id}">Excluir</button>`; } const ratingStars = '⭐️'.repeat(a.rating); let reviewTextHTML = ''; if (a.text.length > 50) { const truncatedText = a.text.substring(0, 50); reviewTextHTML = `<span class="truncate-text">${truncatedText}</span> <a href="#" class="view-full-review" data-full-text="${encodeURIComponent(a.text)}" data-author-name="${a.name}">...Ver mais</a>`; } else { reviewTextHTML = a.text; } avaliacoesTbody.innerHTML += `<tr><td>${a.name}</td><td>${ratingStars} ${reviewTextHTML}</td><td><span class="${statusClass}">${a.status}</span></td><td class="text-nowrap">${actionButtons}</td></tr>`; }); }).catch(err => { avaliacoesTbody.innerHTML = '<tr><td colspan="4">Erro ao carregar avaliações.</td></tr>'; console.error(err); }); };
        loadAvaliacoes();
        avaliacoesTbody.addEventListener('click', async (event) => { const button = event.target; if (button.classList.contains('view-full-review')) { event.preventDefault(); const fullText = decodeURIComponent(button.dataset.fullText); const authorName = button.dataset.authorName; document.getElementById('reviewModalLabel').textContent = `Avaliação de ${authorName}`; document.getElementById('reviewModalBody').textContent = fullText; reviewModal.show(); return; } const reviewId = button.dataset.id; if (!reviewId) return; let url = ''; let method = ''; if (button.classList.contains('btn-approve')) { url = `/api/admin/avaliacoes/${reviewId}/approve`; method = 'PUT'; } else if (button.classList.contains('btn-reject')) { url = `/api/admin/avaliacoes/${reviewId}/reject`; method = 'PUT'; } else if (button.classList.contains('btn-delete')) { if (!confirm('Você deseja mesmo excluir esta avaliação?')) return; url = `/api/admin/avaliacoes/${reviewId}`; method = 'DELETE'; } else { return; } try { const response = await fetch(url, { method: method, headers: { 'Authorization': `Bearer ${token}` } }); const result = await response.json(); if (!response.ok) throw new Error(result.message); showAlert(result.message, 'success'); loadAvaliacoes(); } catch (error) { showAlert(error.message || "Ocorreu um erro."); } });
    }
    const formEsqueciSenha = document.getElementById('formEsqueciSenha');
    if (formEsqueciSenha) {
        formEsqueciSenha.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formEsqueciSenha).entries());
            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                formEsqueciSenha.reset();
            } catch (error) {
                showAlert(error.message || "Erro ao solicitar recuperação.");
            }
        });
    }

    // Lógica para o formulário de Redefinir a Senha
    const formResetPassword = document.getElementById('formResetPassword');
    if (formResetPassword) {
        // Pega o token da URL e insere no formulário
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            document.getElementById('token').value = token;
        } else {
            showAlert('Token de recuperação não encontrado. Por favor, use o link do seu e-mail.', 'danger');
        }
        
        formResetPassword.addEventListener('submit', async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(formResetPassword).entries());

            if (data.password.length < 6) {
                return showAlert('A senha precisa ter no mínimo 6 caracteres.', 'warning');
            }
            if (data.password !== data.confirmPassword) {
                return showAlert('As senhas não coincidem!', 'warning');
            }

            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: data.token, password: data.password })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                showAlert(result.message, 'success');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } catch (error) {
                showAlert(error.message || "Erro ao redefinir a senha.");
            }
        });
    }
});

