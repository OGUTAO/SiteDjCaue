// netlify/functions/avaliacao.js
require('dotenv').config();
const pool = require('../../database.js');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const authHeader = event.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Token não fornecido.' }) };
    }

    try {
        jwt.verify(token, JWT_SECRET); // Apenas verifica se o token é válido
        const { name, rating, text } = JSON.parse(event.body);
        
        if (!name || !rating || !text) {
            return { statusCode: 400, body: JSON.stringify({ message: "Todos os campos são obrigatórios." }) };
        }

        const sql = 'INSERT INTO avaliacoes (name, rating, text) VALUES ($1, $2, $3)';
        await pool.query(sql, [name, rating, text]);

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Avaliação enviada com sucesso! Obrigado." })
        };
    } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro ao enviar avaliação.' }) };
    }
};