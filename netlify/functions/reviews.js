// netlify/functions/reviews.js
// Esta é uma rota PÚBLICA, não precisa de autenticação.
require('dotenv').config();
const pool = require('../../database.js');

exports.handler = async (event) => {
    // Permite apenas o método GET
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Seleciona apenas as avaliações com status 'Aprovada' e ordena pelas mais recentes
        const sql = "SELECT name, rating, text FROM avaliacoes WHERE status = 'Aprovada' ORDER BY created_at DESC";
        
        const { rows } = await pool.query(sql);
        
        return { 
            statusCode: 200, 
            body: JSON.stringify(rows) 
        };

    } catch (error) {
        console.error("Erro ao buscar avaliações públicas:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: "Ocorreu um erro no servidor." }) 
        };
    }
};