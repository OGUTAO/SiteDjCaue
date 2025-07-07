// netlify/functions/login.js

require('dotenv').config();
const db = require('../../database.js'); // Caminho ajustado para sair de 'netlify/functions'
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

exports.handler = async (event, context) => {
    // A Netlify só permite que a função continue se o método for POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email, password } = JSON.parse(event.body);
        const sql = 'SELECT * FROM users WHERE email = ?';

        const user = await new Promise((resolve, reject) => {
            db.get(sql, [email], (err, row) => {
                if (err) reject(new Error("Erro interno do servidor."));
                resolve(row);
            });
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'E-mail ou senha inválidos.' })
            };
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Login bem-sucedido!', token: token, role: user.role })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message || 'Erro ao processar login.' }) };
    }
};