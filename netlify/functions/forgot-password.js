// netlify/functions/forgot-password.js
require('dotenv').config();
const pool = require('../../database.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email } = JSON.parse(event.body);
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];

        if (!user) {
            return { statusCode: 200, body: JSON.stringify({ message: "Se um usuário com este e-mail existir, um link de recuperação foi enviado." }) };
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hora de validade

        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
            [token, expires, email]
        );

        const transporter = nodemailer.createTransport({
            service: 'gmail', // ou outro serviço de sua preferência
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            to: user.email,
            from: `DJ Cauê Faria <${process.env.EMAIL_USER}>`,
            subject: 'Recuperação de Senha - DJ Cauê Faria',
            text: `Você está recebendo este e-mail porque você (ou outra pessoa) solicitou a redefinição da senha da sua conta.\n\n` +
                  `Por favor, clique no link a seguir ou cole-o em seu navegador para concluir o processo:\n\n` +
                  `https://${event.headers.host}/reset-password.html?token=${token}\n\n` +
                  `Se você não solicitou isso, ignore este e-mail e sua senha permanecerá inalterada.\n`,
        };
        
        await transporter.sendMail(mailOptions);

        return { statusCode: 200, body: JSON.stringify({ message: "Se um usuário com este e-mail existir, um link de recuperação foi enviado." }) };

    } catch (error) {
        console.error("Erro em forgot-password:", error);
        return { statusCode: 500, body: JSON.stringify({ message: "Erro ao solicitar recuperação de senha." }) };
    }
};