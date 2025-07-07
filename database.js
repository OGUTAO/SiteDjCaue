// database.js - NOVA VERSÃO PARA NEON (POSTGRESQL)

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// A biblioteca 'pg' lê automaticamente a variável de ambiente DATABASE_URL
// que a Netlify criou para você.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões com Neon/Heroku
  }
});

// Função para criar as tabelas se elas não existirem
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Usamos a sintaxe do PostgreSQL (SERIAL PRIMARY KEY em vez de INTEGER AUTOINCREMENT)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        birth_date DATE,
        password TEXT,
        google_id TEXT UNIQUE,
        avatar_url TEXT,
        role TEXT DEFAULT 'client',
        reset_password_token TEXT,
        reset_password_expires TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        event_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        location TEXT,
        details TEXT,
        status TEXT DEFAULT 'Pendente',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas verificadas/criadas com sucesso.");

    // Lógica para criar o usuário admin (adaptada para PostgreSQL)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("ERRO CRÍTICO: Variáveis de ambiente do ADMIN não definidas!");
      return;
    }

    const res = await client.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    if (res.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['Admin Cauê', adminEmail, hash, 'admin']
      );
      console.log(`Usuário ADMIN padrão criado com o e-mail: ${adminEmail}`);
    }

  } catch (err) {
    console.error("Erro durante a inicialização do banco de dados:", err);
  } finally {
    client.release();
  }
};

// Inicializa o banco de dados quando o módulo é carregado
initializeDatabase().catch(console.error);

// Exporta o 'pool' para que nossas funções possam usá-lo para fazer queries
module.exports = pool;