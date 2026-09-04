import { cryptoService } from './cryptoService';

export class LocalKeyStore {
  private inMemoryKeys: Map<string, CryptoKey> = new Map();

  public async getOrCreateChatKey(chatId: string): Promise<CryptoKey> {
    if (this.inMemoryKeys.has(chatId)) {
      return this.inMemoryKeys.get(chatId)!;
    }

    // Check localStorage for persisted raw key
    const storageKey = `vm_key_${chatId}`;
    const storedBase64 = localStorage.getItem(storageKey);

    if (storedBase64) {
      try {
        const imported = await cryptoService.importKeyFromBase64(storedBase64);
        this.inMemoryKeys.set(chatId, imported);
        return imported;
      } catch {
        // Fall back to creating a new one
      }
    }

    const newKey = await cryptoService.generateSessionKey();
    const exported = await cryptoService.exportKeyToBase64(newKey);
    localStorage.setItem(storageKey, exported);
    this.inMemoryKeys.set(chatId, newKey);
    return newKey;
  }

  public clearKeys(): void {
    this.inMemoryKeys.clear();
  }
}

export const keyStore = new LocalKeyStore();
