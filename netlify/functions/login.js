// netlify/functions/login.js - NOVA VERSÃO

require('dotenv').config();
const pool = require('../../database.js'); // Importa o pool de conexão
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email, password } = JSON.parse(event.body);
        const sql = 'SELECT * FROM users WHERE email = $1'; // Sintaxe do PostgreSQL para parâmetros é $1, $2...

        // Faz a consulta usando o pool
        const result = await pool.query(sql, [email]);
        const user = result.rows[0]; // O usuário encontrado estará em result.rows

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'E-mail ou senha inválidos.' }),
            };
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Login bem-sucedido!', token, role: user.role }),
        };

    } catch (error) {
        console.error('Erro no login:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro ao processar login.' }) };
    }
};