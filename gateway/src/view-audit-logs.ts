/**
 * @file view-audit-logs.ts
 * @description A simple script to read and display the contents of the audit log.
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../logger.service.js';

const auditLogFile = path.resolve(process.cwd(), 'logs', 'audit.log');

async function viewAuditLogs() {
  const args = process.argv.slice(2);
  let filterDate: string | undefined;
  let outputFile: string | undefined;

  // Detecção simples de argumentos: Data (YYYY-MM-DD) ou Arquivo de Saída
  if (args.length > 0) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(args[0])) {
      filterDate = args[0];
      outputFile = args[1];
    } else {
      outputFile = args[0];
    }
  }

  try {
    const data = await fs.readFile(auditLogFile, 'utf-8');
    let lines = data.split('\n').filter(line => line.trim());

    if (filterDate) {
      console.log(`\n--- Registros de Auditoria (Filtrado por: ${filterDate}) ---`);
      lines = lines.filter(line => line.startsWith(filterDate));
    } else {
      console.log('\n--- Registros de Auditoria (Todos) ---');
    }

    if (lines.length > 0) {
      const outputContent = lines.join('\n');
      console.log(outputContent);

      if (outputFile) {
        const outputPath = path.resolve(process.cwd(), outputFile);
        await fs.writeFile(outputPath, outputContent);
        console.log(`\n[Export] Logs exportados com sucesso para: ${outputPath}`);
      }
    } else {
      console.log(filterDate ? `Nenhuma entrada encontrada para a data ${filterDate}.` : 'Nenhuma entrada de auditoria encontrada.');
    }
    console.log('--------------------------\n');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.warn('[Script] Arquivo de log de auditoria não encontrado. Nenhuma entrada para exibir ainda.');
    } else {
      logger.error('[Script] Erro ao ler o arquivo de log de auditoria:', error);
      process.exit(1);
    }
  }
}

viewAuditLogs();