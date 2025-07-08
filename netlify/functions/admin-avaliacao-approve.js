require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth');

exports.handler = async (event) => {
    try {
        authenticateAdmin(event);
        const { id } = event.queryStringParameters;
        if (!id) return { statusCode: 400, body: JSON.stringify({ message: 'ID da avaliação não fornecido.' }) };

        await pool.query("UPDATE avaliacoes SET status = 'Aprovada' WHERE id = $1", [id]);
        return { statusCode: 200, body: JSON.stringify({ message: 'Avaliação aprovada com sucesso!' }) };
    } catch (error) {
        return { statusCode: error.statusCode || 500, body: JSON.stringify({ message: error.message || 'Erro no servidor.' }) };
    }
};