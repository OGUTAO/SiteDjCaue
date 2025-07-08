// netlify/functions/admin-orcamentos.js
require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth');

exports.handler = async (event) => {
    // Envolve toda a lógica em um bloco try...catch para capturar qualquer erro
    try {
        // 1. Verifica se o usuário é um administrador
        authenticateAdmin(event);

        // 2. Se a autenticação passar, busca os dados no banco
        const sql = `
            SELECT
                o.id, 
                o.event_type, 
                o.event_date, 
                o.start_time, 
                o.end_time,
                o.location, 
                o.details, 
                o.status, 
                o.created_at,
                u.name AS client_name, 
                u.email AS client_email, 
                u.phone AS client_phone
            FROM 
                orcamentos o 
            JOIN 
                users u ON o.user_id = u.id
            ORDER BY 
                o.created_at DESC`;
        
        const { rows } = await pool.query(sql);
        
        // 3. Retorna os dados com sucesso
        return { 
            statusCode: 200, 
            body: JSON.stringify(rows) 
        };

    } catch (error) {
        // 4. Se qualquer erro ocorrer (seja de autenticação ou do banco de dados), retorna uma mensagem de erro clara
        console.error("Erro ao buscar orçamentos:", error);
        return { 
            statusCode: error.statusCode || 500, 
            body: JSON.stringify({ message: error.message || "Ocorreu um erro no servidor ao buscar os orçamentos." }) 
        };
    }
};