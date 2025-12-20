import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.resolve(process.cwd(), 'logs');

// Garante que o diretório de logs exista
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const auditLogFile = path.join(logDir, 'audit.log');

const auditLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    // Log de auditoria sempre vai para um arquivo dedicado
    new winston.transports.File({ filename: auditLogFile }),
    new winston.transports.Console() // Também no console para visibilidade
  ],
  exitOnError: false,
});

export default auditLogger;