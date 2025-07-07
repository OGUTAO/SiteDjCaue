// netlify/functions/register.js

require('dotenv').config();
const db = require('../../database.js');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    try {
        const { name, email, phone, birth_date, password } = JSON.parse(event.body);
        if (!name || !email || !password) {
            return { statusCode: 400, body: JSON.stringify({ message: "Nome, e-mail e senha são obrigatórios." }) };
        }

        const hash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, phone, birth_date, password) VALUES (?, ?, ?, ?, ?)';

        await new Promise((resolve, reject) => {
            db.run(sql, [name, email, phone, birth_date, hash], function(err) {
                if (err) reject(new Error("E-mail já cadastrado."));
                resolve(this);
            });
        });

        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Usuário cadastrado com sucesso!" })
        };

    } catch (error) {
        // Se o erro for de e-mail duplicado ou outro
        return { statusCode: error.message.includes("cadastrado") ? 409 : 500, body: JSON.stringify({ message: error.message || "Erro ao cadastrar." }) };
    }
};