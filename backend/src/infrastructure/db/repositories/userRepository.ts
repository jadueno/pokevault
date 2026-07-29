import type { Pool } from "pg";
import type { User } from "../../../domain/types.js";
import type { UserRepository } from "../../../domain/ports.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, passwordHash: row.password_hash };
}

/** A diferencia del resto de repositorios, no se construye acotado a un `userId` — se usa
 * solo dentro de `/login` para resolver la identidad a partir del email, construido una
 * vez al arrancar el servidor. */
export function createUserRepository(pool: Pool): UserRepository {
  return {
    async findByEmail(email: string) {
      const { rows } = await pool.query<UserRow>("select id, email, password_hash from users where email = $1", [email]);
      return rows[0] ? toUser(rows[0]) : null;
    },
  };
}
