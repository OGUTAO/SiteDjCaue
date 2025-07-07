// netlify/functions/admin-avaliacoes.js
require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth');

exports.handler = async (event) => {
    const authResult = authenticateAdmin(event);
    if (authResult) return authResult; // Se não for admin, para aqui

    try {
        const sql = "SELECT id, name, rating, text, status, created_at FROM avaliacoes ORDER BY created_at DESC";
        const { rows } = await pool.query(sql);
        return { statusCode: 200, body: JSON.stringify(rows) };
    } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Erro ao buscar avaliações." }) };
    }
};