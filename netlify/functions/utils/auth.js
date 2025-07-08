// netlify/functions/utils/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

function authenticateAdmin(event) {
    const authHeader = event.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        throw { statusCode: 401, message: 'Token não fornecido.' };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            throw { statusCode: 403, message: 'Acesso negado. Requer privilégios de administrador.' };
        }
        // CORREÇÃO: Não retorna nada em caso de sucesso.
        // A função só vai "reclamar" se houver um erro.
        return; 
    } catch (err) {
        // Lança um erro padronizado para ser capturado pelo bloco catch da função principal.
        throw { statusCode: err.statusCode || 403, message: err.message || 'Token inválido ou expirado.' };
    }
}

module.exports = { authenticateAdmin };