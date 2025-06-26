const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Conecta ao arquivo do banco de dados (se não existir, ele será criado)
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
        // Cria as tabelas se elas não existirem
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                birth_date TEXT,
                password TEXT,
                google_id TEXT UNIQUE,
                avatar_url TEXT,
                role TEXT DEFAULT 'client'
            )`, (err) => {
                if (err) console.error("Erro ao criar tabela users", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                event_type TEXT NOT NULL,
                event_date TEXT NOT NULL,
                start_time TEXT,
                end_time TEXT,
                location TEXT,
                details TEXT,
                status TEXT DEFAULT 'Pendente',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`, (err) => {
                if (err) console.error("Erro ao criar tabela orcamentos", err.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS avaliacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                rating INTEGER NOT NULL,
                text TEXT NOT NULL,
                status TEXT DEFAULT 'Pendente',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error("Erro ao criar tabela avaliacoes", err.message);
            });

            // --- INÍCIO DA MODIFICAÇÃO DE SEGURANÇA ---
            // CRIA UM USUÁRIO ADMIN PADRÃO (se não existir) USANDO VARIÁVEIS DE AMBIENTE
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminPassword = process.env.ADMIN_PASSWORD;

            // Verifica se as variáveis de ambiente foram carregadas corretamente
            if (!adminEmail || !adminPassword) {
                console.error("\nERRO CRÍTICO: As variáveis ADMIN_EMAIL e ADMIN_PASSWORD não foram definidas no seu arquivo .env.");
                console.error("O servidor não pode garantir a criação do usuário admin de forma segura.\n");
                return; // Para a execução aqui para evitar erros
            }

            db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
                if (err) {
                    return console.error("Erro ao buscar usuário admin:", err.message);
                }
                
                // Só cria o admin se ele não existir no banco
                if (!row) {
                    bcrypt.hash(adminPassword, 10, (err, hash) => {
                        if (err) {
                            return console.error("Erro ao gerar hash para a senha do admin:", err.message);
                        }
                        
                        db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                        ['Admin Cauê', adminEmail, hash, 'admin'],
                        (err) => {
                            if (err) {
                                return console.error("Erro ao inserir o usuário admin:", err.message);
                            }
                            console.log(`Usuário ADMIN padrão criado com o e-mail: ${adminEmail}`);
                            console.log('Lembre-se de usar a senha definida no seu arquivo .env para o primeiro login.');
                        });
                    });
                }
            });
            // --- FIM DA MODIFICAÇÃO DE SEGURANÇA ---
        });
    }
});

module.exports = db;