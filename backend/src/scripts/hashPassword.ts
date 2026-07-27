import { hashPassword } from "../infrastructure/http/passwordHash.js";

// Utilidad de línea de comandos para generar el valor de LOGIN_PASSWORD_HASH (ver
// .env.example) a partir de una contraseña en claro — nunca se guarda la contraseña tal
// cual, ni en el .env ni en ningún sitio.
const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password -- "tu-contraseña"');
  process.exit(1);
}

console.log(hashPassword(password));
