// netlify/functions/admin-orcamento-update-status.js
require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth.js');

exports.handler = async (event) => {
    // Permite apenas o método PUT para atualização
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        authenticateAdmin(event); // Valida se é admin
        
        const { id } = event.queryStringParameters;
        const { status } = JSON.parse(event.body);

        if (!id || !status) {
            return { statusCode: 400, body: JSON.stringify({ message: 'ID e novo status são obrigatórios.' }) };
        }

        const allowedStatus = ['Pendente', 'Concluido', 'Cancelado', 'Rejeitado'];
        if (!allowedStatus.includes(status)) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Status inválido.' }) };
        }

        await pool.query("UPDATE orcamentos SET status = $1 WHERE id = $2", [status, id]);
        
        return { statusCode: 200, body: JSON.stringify({ message: 'Status do orçamento atualizado com sucesso!' }) };

    } catch (error) {
        return { 
            statusCode: error.statusCode || 500, 
            body: JSON.stringify({ message: error.message || 'Erro no servidor ao atualizar status.' }) 
        };
    }
};