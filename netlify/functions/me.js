// netlify/functions/me.js

require('dotenv').config();
const pool = require('../../database.js');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const authHeader = event.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Token não fornecido.' }) };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        const result = await pool.query('SELECT name, role FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Usuário não encontrado.' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(user),
        };

    } catch (error) {
        console.error('Erro de autenticação ou busca:', error);
        return { statusCode: 403, body: JSON.stringify({ message: 'Token inválido ou expirado.' }) };
    }
};