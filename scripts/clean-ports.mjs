import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// 1. Detener contenedores Docker que ocupan los puertos 3001, 4321 y 80 con builds antiguos
try {
  console.log('[clean-ports] Verificando si hay contenedores Docker antiguos en los puertos 3001 / 4321...');
  execSync('docker stop esqueleto-admin esqueleto-storefront esqueleto-caddy', {
    stdio: 'ignore',
  });
  console.log('[clean-ports] Contenedores Docker (esqueleto-admin / esqueleto-storefront) detenidos para liberar puertos.');
} catch {
  // Ignorar si Docker no está corriendo o los contenedores ya están detenidos
}

// 2. Liberar procesos Node locales que hayan quedado ocupando los puertos 3001, 4321, 4322, 4323
// (Independiente del idioma de Windows: funciona con LISTENING, ESCUCHANDO, etc.)
const PORTS = [3001, 4321, 4322, 4323];

if (process.platform === 'win32') {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pidsToKill = new Set();

    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5 || parts[0].toUpperCase() !== 'TCP') continue;
      const localAddr = parts[1] || '';
      const foreignAddr = parts[2] || '';
      const pid = parts[parts.length - 1];

      // Un socket en escucha tiene dirección remota terminada en :0
      if (!foreignAddr.endsWith(':0') && !foreignAddr.endsWith(':*')) continue;

      for (const port of PORTS) {
        if (localAddr.endsWith(`:${port}`)) {
          if (pid && /^\d+$/.test(pid) && Number(pid) !== process.pid && Number(pid) > 4) {
            pidsToKill.add(pid);
          }
        }
      }
    }

    for (const pid of pidsToKill) {
      try {
        console.log(`[clean-ports] Liberando proceso anterior en puerto ocupado (PID ${pid})...`);
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } catch {
        // Ignorar si ya terminó
      }
    }
  } catch {
    // Ignorar errores de netstat
  }
}
