// netlify/functions/admin-orcamento-delete.js
require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth');

exports.handler = async (event) => {
    // Permite apenas o método DELETE
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        authenticateAdmin(event);
        const { id } = event.queryStringParameters;
        if (!id) return { statusCode: 400, body: JSON.stringify({ message: 'ID do orçamento não fornecido.' }) };

        await pool.query("DELETE FROM orcamentos WHERE id = $1", [id]);
        
        return { statusCode: 200, body: JSON.stringify({ message: 'Orçamento excluído com sucesso!' }) };
        
    } catch (error) {
        return { 
            statusCode: error.statusCode || 500, 
            body: JSON.stringify({ message: error.message || 'Erro no servidor ao excluir orçamento.' }) 
        };
    }
};