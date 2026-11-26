import { USUARIOS } from './support/ambiente';
import { criarUsuario, limparEmuladores } from './support/emulador';

/** Começa cada execução com os emuladores vazios e os usuários de teste criados. */
export default async function globalSetup(): Promise<void> {
  await limparEmuladores();
  for (const usuario of Object.values(USUARIOS)) {
    await criarUsuario(usuario);
  }
}
