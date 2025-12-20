/**
 * @file toggle-emergency.ts
 * @description A simple script to toggle the EMERGENCY_MODE variable in the .env file.
 */

import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config'; // Load existing env vars to not break other running processes
import logger from '../logger.service.js';
import auditLogger from '../audit-logger.service.js';

const envFilePath = path.resolve(process.cwd(), '.env');

async function toggleEmergencyMode() {
  logger.info(`[Script] Reading .env file from: ${envFilePath}`);

  let fileContent: string;
  try {
    fileContent = await fs.readFile(envFilePath, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.info('[Script] .env file not found. Creating a new one.');
      fileContent = ''; // Start with an empty file if it doesn't exist
    } else {
      logger.error('[Script] Error reading .env file:', error);
      process.exit(1);
    }
  }

  const lines = fileContent.split('\n');
  let modeFound = false;
  const newMode = process.env.EMERGENCY_MODE === 'true' ? 'false' : 'true';

  const newLines = lines.map(line => {
    if (line.startsWith('EMERGENCY_MODE=')) {
      modeFound = true;
      return `EMERGENCY_MODE=${newMode}`;
    }
    return line;
  });

  if (!modeFound) {
    newLines.push(`EMERGENCY_MODE=${newMode}`);
  }

  await fs.writeFile(envFilePath, newLines.filter(l => l).join('\n'));
  const status = newMode === 'true' ? 'ATIVADO' : 'DESATIVADO';
  logger.info(`[Script] Arquivo .env atualizado com sucesso. O Modo de Emergência agora está ${status}.`);
  auditLogger.warn(`[AUDIT] O modo de emergência foi alternado manualmente pelo operador do gateway. Novo estado: ${status}`);
}

toggleEmergencyMode().catch(error => {
  logger.error('[Script] An unexpected error occurred:', error);
  process.exit(1);
});