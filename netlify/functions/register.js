// netlify/functions/register.js - NOVA VERSÃO

require('dotenv').config();
const pool = require('../../database.js');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    try {
        const { name, email, phone, birth_date, password } = JSON.parse(event.body);
        if (!name || !email || !password) {
            return { statusCode: 400, body: JSON.stringify({ message: "Nome, e-mail e senha são obrigatórios." }) };
        }

        const hash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, phone, birth_date, password) VALUES ($1, $2, $3, $4, $5)';
        
        await pool.query(sql, [name, email, phone, birth_date, hash]);

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Usuário cadastrado com sucesso!" })
        };

    } catch (error) {
        // Verifica se o erro é de violação de chave única (e-mail duplicado)
        if (error.code === '23505') { // Código de erro do PostgreSQL para unique_violation
            return { statusCode: 409, body: JSON.stringify({ message: "E-mail já cadastrado." }) };
        }
        console.error('Erro no cadastro:', error);
        return { statusCode: 500, body: JSON.stringify({ message: "Erro ao cadastrar." }) };
    }
};