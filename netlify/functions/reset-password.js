// netlify/functions/reset-password.js
require('dotenv').config();
const pool = require('../../database.js');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { token, password } = JSON.parse(event.body);
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
            [token]
        );
        const user = rows[0];

        if (!user) {
            return { statusCode: 400, body: JSON.stringify({ message: "Token de redefinição de senha inválido ou expirado." }) };
        }

        const hash = await bcrypt.hash(password, 10);

        await pool.query(
            'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
            [hash, user.id]
        );

        return { statusCode: 200, body: JSON.stringify({ message: "Senha alterada com sucesso! Você já pode fazer o login." }) };

    } catch (error) {
        console.error("Erro em reset-password:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Erro ao redefinir a senha." }) };
    }
};