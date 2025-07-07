// netlify/functions/utils/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';

function authenticateAdmin(event) {
    const authHeader = event.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return { statusCode: 401, body: JSON.stringify({ message: 'Token não fornecido.' }) };

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado. Requer privilégios de administrador.' }) };
        }
        // Se for admin, não retorna nada para continuar a execução
        return null; 
    } catch (err) {
        return { statusCode: 403, body: JSON.stringify({ message: 'Token inválido ou expirado.' }) };
    }
}

module.exports = { authenticateAdmin };