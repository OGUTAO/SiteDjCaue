// netlify/functions/admin-clientes.js
require('dotenv').config();
const pool = require('../../database.js');
const { authenticateAdmin } = require('./utils/auth'); // Criaremos este utilitário

exports.handler = async (event) => {
    const authResult = authenticateAdmin(event);
    if (authResult) return authResult;

    try {
        const searchTerm = event.queryStringParameters.search;
        let sql = "SELECT id, name, email, phone, birth_date FROM users WHERE role = 'client'";
        const params = [];

        if (searchTerm) {
            sql += " AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)";
            params.push(`%${searchTerm}%`);
        }
        sql += " ORDER BY name";

        const { rows } = await pool.query(sql, params);
        return { statusCode: 200, body: JSON.stringify(rows) };

    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Erro ao buscar clientes." }) };
    }
};