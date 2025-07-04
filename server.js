require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

// Middlewares essenciais
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para verificar se o usuário está autenticado
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware para verificar se o usuário é Administrador
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Acesso negado." });
    next();
};


// ROTA PARA CADASTRAR UM NOVO USUÁRIO
app.post('/api/register', (req, res) => {
    const { name, email, phone, birth_date, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
    
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: "Erro ao processar senha." });
        const sql = 'INSERT INTO users (name, email, phone, birth_date, password) VALUES (?, ?, ?, ?, ?)';
        db.run(sql, [name, email, phone, birth_date, hash], function(err) {
            if (err) return res.status(409).json({ message: "E-mail já cadastrado." });
            res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
        });
    });
});

// ROTA PARA FAZER LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';

    db.get(sql, [email], (err, user) => {
        if (err) {
            console.error("Erro no banco de dados ao buscar usuário:", err.message);
            return res.status(500).json({ message: "Erro interno do servidor." });
        }
        if (!user) {
            return res.status(401).json({ message: "E-mail ou senha inválidos." });
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: "Erro ao processar login." });
            }
            if (!isMatch) {
                return res.status(401).json({ message: "E-mail ou senha inválidos." });
            }
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
            res.json({ message: "Login bem-sucedido!", token: token, role: user.role });
        });
    });
});

// ROTA PARA OBTER DADOS DO USUÁRIO ATUAL (PROTEGIDA POR TOKEN)
app.get('/api/users/me', authenticateToken, (req, res) => {
  // O middleware 'authenticateToken' já validou o token e nos deu o 'req.user'.
  const userId = req.user.id;

  // Usamos o ID do usuário para buscar o nome no banco de dados.
  const sql = 'SELECT name FROM users WHERE id = ?';

  // Usamos db.get pois esperamos apenas um resultado
  db.get(sql, [userId], (err, user) => {
    if (err) {
      console.error("Erro ao buscar dados do usuário:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    if (user) {
      // Se o usuário for encontrado, retorna o nome dele.
      res.json({ name: user.name });
    } else {
      // Isso é raro, mas acontece se o usuário do token foi deletado.
      res.status(404).json({ message: 'Usuário do token não encontrado.' });
    }
  });
});

// ROTA PARA CLIENTE LOGADO SOLICITAR ORÇAMENTO
app.post('/api/orcamento', authenticateToken, (req, res) => {
    const { event_type, event_date, start_time, end_time, location, details } = req.body;
    const sql = 'INSERT INTO orcamentos (user_id, event_type, event_date, start_time, end_time, location, details) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [req.user.id, event_type, event_date, start_time, end_time, location, details], err => {
        if (err) return res.status(500).json({ message: "Erro ao registrar orçamento." });
        res.status(201).json({ message: "Orçamento solicitado com sucesso!" });
    });
});

// ROTA PARA ENVIAR UMA AVALIAÇÃO
app.post('/api/avaliacao', (req, res) => {
    const { name, rating, text } = req.body;
    if (!rating || rating < 1) return res.status(400).json({ message: "A nota é obrigatória." });
    const sql = 'INSERT INTO avaliacoes (name, rating, text) VALUES (?, ?, ?)';
    db.run(sql, [name, rating, text], err => {
        if (err) return res.status(500).json({ message: "Erro ao enviar avaliação." });
        res.status(201).json({ message: "Avaliação enviada com sucesso!" });
    });
});

// ROTA PARA A PÁGINA INICIAL PEGAR AS AVALIAÇÕES APROVADAS
app.get('/api/reviews', (req, res) => {
    const sql = "SELECT name, rating, text FROM avaliacoes WHERE status = 'Aprovada' ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Erro ao buscar avaliações." });
        res.json(rows);
    });
});


// ROTA PARA PEGAR TODOS OS ORÇAMENTOS
app.get('/api/admin/orcamentos', authenticateToken, isAdmin, (req, res) => {
    const sql = `
        SELECT
            o.id, o.event_type, o.event_date, o.start_time, o.end_time,
            o.location, o.details, o.status, o.created_at,
            u.name as client_name, u.email as client_email, u.phone as client_phone
        FROM orcamentos o JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Erro ao buscar orçamentos." });
        res.json(rows);
    });
});

// ROTA PARA ATUALIZAR O STATUS DE UM ORÇAMENTO
app.put('/api/admin/orcamentos/:id/status', authenticateToken, isAdmin, (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    const allowedStatus = ['Pendente', 'Concluido', 'Cancelado', 'Rejeitado'];
    if (!allowedStatus.includes(status)) return res.status(400).json({ message: "Status inválido." });
    
    const sql = 'UPDATE orcamentos SET status = ? WHERE id = ?';
    db.run(sql, [status, id], function(err) {
        if (err) return res.status(500).json({ message: "Erro ao atualizar status." });
        res.json({ message: `Status do orçamento atualizado.` });
    });
});

// ROTA PARA EXCLUIR UM ORÇAMENTO
app.delete('/api/admin/orcamentos/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM orcamentos WHERE id = ?";
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ message: "Erro ao excluir orçamento." });
        if (this.changes === 0) return res.status(404).json({ message: "Orçamento não encontrado."});
        res.json({ message: "Orçamento excluído com sucesso!" });
    });
});

// ROTA PARA PEGAR CLIENTES (COM BUSCA)
app.get('/api/admin/clientes', authenticateToken, isAdmin, (req, res) => {
    const searchTerm = req.query.search;
    let sql = "SELECT id, name, email, phone, birth_date FROM users WHERE role = 'client'";
    const params = [];
    if (searchTerm) {
        sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
        const likeTerm = `%${searchTerm}%`;
        params.push(likeTerm, likeTerm, likeTerm);
    }
    sql += " ORDER BY name";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: "Erro ao buscar clientes." });
        res.json(rows);
    });
});

// --- NOVA ROTA PARA EXCLUIR UM CLIENTE ---
app.delete('/api/admin/clientes/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM users WHERE id = ? AND role = 'client'";
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ message: "Erro ao excluir cliente." });
        if (this.changes === 0) return res.status(404).json({ message: "Cliente não encontrado ou não é um cliente."});
        res.json({ message: "Cliente excluído com sucesso!" });
    });
});


// ROTA PARA PEGAR TODAS AS AVALIAÇÕES
app.get('/api/admin/avaliacoes', authenticateToken, isAdmin, (req, res) => {
    const sql = "SELECT id, name, rating, text, status FROM avaliacoes ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Erro ao buscar avaliações." });
        res.json(rows);
    });
});

// ROTA PARA APROVAR UMA AVALIAÇÃO
app.put('/api/admin/avaliacoes/:id/approve', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE avaliacoes SET status = 'Aprovada' WHERE id = ?";
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ message: "Erro ao aprovar avaliação." });
        res.json({ message: "Avaliação aprovada com sucesso!" });
    });
});

// ROTA PARA REJEITAR UMA AVALIAÇÃO
app.put('/api/admin/avaliacoes/:id/reject', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const sql = "UPDATE avaliacoes SET status = 'Rejeitada' WHERE id = ?";
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ message: "Erro ao rejeitar avaliação." });
        res.json({ message: "Avaliação rejeitada com sucesso!" });
    });
});

// ROTA PARA EXCLUIR UMA AVALIAÇÃO
app.delete('/api/admin/avaliacoes/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM avaliacoes WHERE id = ?";
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ message: "Erro ao excluir avaliação." });
        res.json({ message: "Avaliação excluída com sucesso!" });
    });
});

// ROTA PARA SOLICITAR A RECUPERAÇÃO DE SENHA
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';

    db.get(sql, [email], (err, user) => {
        if (!user) {
            // Resposta genérica para não revelar se um e-mail está ou não cadastrado
            return res.status(200).json({ message: "Se um usuário com este e-mail existir, um link de recuperação foi enviado." });
        }

        // 1. Gerar token seguro
        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // Token válido por 1 hora

        // 2. Salvar o token no banco de dados
        const updateSql = 'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?';
        db.run(updateSql, [token, expires, email], async (err) => {
            if (err) {
                return res.status(500).json({ message: "Erro ao salvar o token de recuperação." });
            }

            // 3. Configurar o Nodemailer para enviar o e-mail
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailOptions = {
                to: user.email,
                from: `DJ Cauê Faria <${process.env.EMAIL_USER}>`,
                subject: 'Recuperação de Senha - DJ Cauê Faria',
                text: `Você está recebendo este e-mail porque você (ou outra pessoa) solicitou a redefinição da senha da sua conta.\n\n` +
                      `Por favor, clique no link a seguir ou cole-o em seu navegador para concluir o processo:\n\n` +
                      `http://${req.headers.host}/reset-password.html?token=${token}\n\n` +
                      `Se você não solicitou isso, ignore este e-mail e sua senha permanecerá inalterada.\n`,
            };

            // 4. Enviar o e-mail
            try {
                await transporter.sendMail(mailOptions);
                res.json({ message: `Um e-mail de recuperação foi enviado para ${user.email}.` });
            } catch (error) {
                console.error('Erro ao enviar e-mail:', error);
                res.status(500).json({ message: "Erro ao enviar o e-mail de recuperação." });
            }
        });
    });
});

// ROTA PARA REDEFINIR A SENHA
app.post('/api/reset-password', (req, res) => {
    const { token, password } = req.body;

    const sql = `SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > ?`;
    db.get(sql, [token, new Date()], (err, user) => {
        if (!user) {
            return res.status(400).json({ message: "Token de redefinição de senha inválido ou expirado." });
        }

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ message: "Erro ao processar a nova senha." });

            const updateSql = `UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?`;
            db.run(updateSql, [hash, user.id], (err) => {
                if (err) return res.status(500).json({ message: "Erro ao atualizar a senha." });
                res.json({ message: "Senha alterada com sucesso! Você já pode fazer o login." });
            });
        });
    });
});

// Rota final para servir o front-end
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Inicia o servidor
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));