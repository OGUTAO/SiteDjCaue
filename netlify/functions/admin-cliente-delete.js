// netlify/functions/admin-cliente-delete.js
require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth');

exports.handler = async (event) => {
    // Permite apenas o método DELETE
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        authenticateAdmin(event); // Valida se é admin
        
        const { id } = event.queryStringParameters;
        if (!id) {
            return { statusCode: 400, body: JSON.stringify({ message: 'ID do cliente não fornecido.' }) };
        }

        // Deleta o cliente com o ID fornecido, garantindo que não seja um admin
        const result = await pool.query("DELETE FROM users WHERE id = $1 AND role = 'client'", [id]);

        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Cliente não encontrado ou você não tem permissão para excluí-lo.' }) };
        }
        
        return { statusCode: 200, body: JSON.stringify({ message: 'Cliente excluído com sucesso!' }) };

    } catch (error) {
        return { 
            statusCode: error.statusCode || 500, 
            body: JSON.stringify({ message: error.message || 'Erro no servidor ao excluir cliente.' }) 
        };
    }
};