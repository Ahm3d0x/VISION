import { ContactItem, ContactPhone } from '../../shared/types';
import { normalizeArabicText, normalizePhoneNumber, parseVcfContent, isDummyPhoneNumber } from '../../shared/vcfParser';

export { normalizeArabicText, normalizePhoneNumber, parseVcfContent, isDummyPhoneNumber };

/**
 * Dedicated verified self-contact record for Ahmed Mohamed Attia (System Owner)
 */
export const AHMED_SELF_CONTACT: ContactItem = {
  id: 'contact_user_self',
  name: 'Ahmed Mohamed Attia (أحمد عطية - رقمي)',
  normalizedName: 'ahmed mohamed attia رقمي انا نفسي الرقم بتاعي',
  phones: [
    {
      raw: '+20 11 40409832',
      normalized: '201140409832',
      type: 'mobile',
    },
  ],
  primaryPhone: '201140409832',
  email: 'ah2005211@gmail.com',
  tags: ['self', 'user', 'me', 'myself', 'owner', 'رقمي', 'الرقم بتاعي', 'أنا', 'نفسي', 'you'],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

export class ContactManager {
  private contacts: Map<string, ContactItem> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    // Seed Ahmed's self-contact immediately
    this.contacts.set(AHMED_SELF_CONTACT.id, AHMED_SELF_CONTACT);
    this.init().catch((err) => {
      console.warn('[ContactManager] Initial load deferred:', err);
    });
  }

  /**
   * Check if a query or recipient references the user themselves (Ahmed)
   */
  public isSelfQuery(query: string): boolean {
    const q = (query || '').trim().toLowerCase();
    if (!q) return false;
    const norm = normalizeArabicText(q);
    const selfTokens = [
      'رقمي', 'رقمى', 'الرقم بتاعي', 'رقمي انا', 'رقمي أنا',
      'انا', 'أنا', 'نفسي', 'نفسى', 'لي', 'لى',
      'me', 'myself', 'self', 'my number', 'my phone', 'my whatsapp', 'my whatsapp number',
      '我的whatsapp号码', '我的号码', '我的电话', '我自己',
      'ahmed', 'ahmed attia', 'أحمد', 'احمد', 'عطية', 'attia', 'you'
    ];
    if (selfTokens.includes(q) || selfTokens.includes(norm)) {
      return true;
    }
    // Substring checks for Egyptian Arabic expressions, English, or Chinese model tokens
    if (
      norm.includes('رقمي') ||
      norm.includes('الرقم بتاعي') ||
      q.includes('my number') ||
      q.includes('my whatsapp') ||
      q.includes('to me') ||
      q.includes('我的') ||
      norm.includes('ابعتهالي') ||
      norm.includes('ابعتها لي') ||
      norm.includes('ابعتلي')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Get Ahmed's primary self-contact
   */
  public getSelfContact(): ContactItem {
    return this.contacts.get(AHMED_SELF_CONTACT.id) || AHMED_SELF_CONTACT;
  }

  /**
   * Initializes contacts from persistent storage or auto-imports default VCF.
   */
  public async init(): Promise<void> {
    if (this.isLoaded) return;

    try {
      if (typeof window !== 'undefined' && window.visionAPI?.loadContacts) {
        const stored = await window.visionAPI.loadContacts();
        if (stored && stored.length > 0) {
          this.contacts.clear();
          for (const c of stored) {
            this.contacts.set(c.id, {
              ...c,
              normalizedName: c.normalizedName || normalizeArabicText(c.name),
            });
          }
          // Ensure self-contact is always present
          this.contacts.set(AHMED_SELF_CONTACT.id, AHMED_SELF_CONTACT);
          this.isLoaded = true;
          return;
        }

        // If no stored contacts, auto-import from project VCF
        if (window.visionAPI?.importVcfFile) {
          const imported = await window.visionAPI.importVcfFile();
          if (imported?.contacts && imported.contacts.length > 0) {
            this.contacts.clear();
            for (const c of imported.contacts) {
              this.contacts.set(c.id, c);
            }
            this.contacts.set(AHMED_SELF_CONTACT.id, AHMED_SELF_CONTACT);
            this.isLoaded = true;
            return;
          }
        }
      }
      this.contacts.set(AHMED_SELF_CONTACT.id, AHMED_SELF_CONTACT);
    } catch (err) {
      console.warn('[ContactManager] Storage sync error:', err);
      this.contacts.set(AHMED_SELF_CONTACT.id, AHMED_SELF_CONTACT);
    }
  }

  /**
   * Import contacts directly from raw VCF text or structured list
   */
  public async importVcf(vcfText: string): Promise<number> {
    const parsed = parseVcfContent(vcfText);
    for (const c of parsed) {
      this.contacts.set(c.id, c);
    }
    await this.persist();
    return parsed.length;
  }

  /**
   * Search contacts by name, nickname, or phone number.
   * Uses phonetic Arabic normalization and multi-factor ranking.
   */
  public search(query: string, limit: number = 10): ContactItem[] {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return Array.from(this.contacts.values()).slice(0, limit);
    }

    const normQuery = normalizeArabicText(cleanQuery);
    const queryDigits = cleanQuery.replace(/[^\d]/g, '');
    const results: Array<{ contact: ContactItem; score: number }> = [];

    for (const contact of this.contacts.values()) {
      let score = 0;
      const normName = contact.normalizedName;

      // Exact name match
      if (normName === normQuery) {
        score += 100;
      }
      // Name starts with query
      else if (normName.startsWith(normQuery)) {
        score += 80;
      }
      // Name contains query
      else if (normName.includes(normQuery)) {
        score += 60;
      }

      // Word token matching: require at least 3 characters for substring matching to avoid accidental false positives
      const queryTokens = normQuery.split(' ').filter(Boolean);
      const nameTokens = normName.split(' ').filter(Boolean);
      for (const qt of queryTokens) {
        if (nameTokens.some((nt) => nt === qt || (nt.length >= 3 && qt.includes(nt)) || (qt.length >= 3 && nt.includes(qt)))) {
          score += 30;
        }
      }

      // Phone matching
      if (queryDigits.length >= 3) {
        for (const phone of contact.phones) {
          if (phone.normalized === queryDigits) {
            score += 90;
          } else if (phone.normalized.endsWith(queryDigits) || phone.normalized.includes(queryDigits)) {
            score += 50;
          }
        }
      }

      if (score > 0) {
        results.push({ contact, score });
      }
    }

    // If query matches self, ensure Ahmed's verified self contact is scored at highest priority
    if (this.isSelfQuery(cleanQuery)) {
      const self = this.getSelfContact();
      results.push({ contact: self, score: 250 });
    }

    results.sort((a, b) => b.score - a.score);
    // Deduplicate in case self contact appeared in both
    const seen = new Set<string>();
    const unique: ContactItem[] = [];
    for (const r of results) {
      if (!seen.has(r.contact.id)) {
        seen.add(r.contact.id);
        unique.push(r.contact);
      }
    }
    return unique.slice(0, limit);
  }

  /**
   * Find the single best matching contact for a query
   */
  public findBestMatch(query: string): ContactItem | null {
    if (this.isSelfQuery(query)) {
      return this.getSelfContact();
    }
    const list = this.search(query, 1);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Get a contact by ID
   */
  public get(id: string): ContactItem | null {
    return this.contacts.get(id) || null;
  }

  /**
   * Get all stored contacts
   */
  public getAll(): ContactItem[] {
    return Array.from(this.contacts.values());
  }

  /**
   * Get total contact count
   */
  public get count(): number {
    return this.contacts.size;
  }

  /**
   * Add or update a contact
   */
  public async save(contact: Partial<ContactItem> & { name: string }): Promise<ContactItem> {
    const id = contact.id || `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existing = this.contacts.get(id);

    const phones: ContactPhone[] = contact.phones || existing?.phones || [];
    const primaryPhone = contact.primaryPhone || phones[0]?.normalized || null;

    const item: ContactItem = {
      id,
      name: contact.name,
      normalizedName: normalizeArabicText(contact.name),
      phones,
      primaryPhone,
      email: contact.email ?? existing?.email,
      notes: contact.notes ?? existing?.notes,
      tags: contact.tags ?? existing?.tags ?? [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.contacts.set(id, item);
    await this.persist();
    return item;
  }

  /**
   * Delete a contact by ID
   */
  public async delete(id: string): Promise<boolean> {
    const deleted = this.contacts.delete(id);
    if (deleted) {
      await this.persist();
    }
    return deleted;
  }

  /**
   * Persist in Electron storage
   */
  private async persist(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.visionAPI?.saveContacts) {
        await window.visionAPI.saveContacts(Array.from(this.contacts.values()));
      }
    } catch (err) {
      console.warn('[ContactManager] Persistence failed:', err);
    }
  }
}

export const contactManager = new ContactManager();
