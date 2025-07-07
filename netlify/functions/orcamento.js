// netlify/functions/orcamento.js
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
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        
        const { event_type, event_date, start_time, end_time, location, details } = JSON.parse(event.body);

        const sql = 'INSERT INTO orcamentos (user_id, event_type, event_date, start_time, end_time, location, details) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        await pool.query(sql, [userId, event_type, event_date, start_time, end_time, location, details]);

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Orçamento solicitado com sucesso!" })
        };
    } catch (error) {
        console.error('Erro ao registrar orçamento:', error);
        if (error.name === 'JsonWebTokenError') {
             return { statusCode: 403, body: JSON.stringify({ message: "Token inválido." }) };
        }
        return { statusCode: 500, body: JSON.stringify({ message: 'Erro ao registrar orçamento.' }) };
    }
};