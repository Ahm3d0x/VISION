import { ContactItem, ContactPhone } from './types';

/**
 * Normalizes Arabic text for phonetic & substring matching.
 * Converts letter variants (أ/إ/آ -> ا, ة -> ه, ى -> ي) and strips tashkeel.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Strip diacritics / harakat
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/\uFFFD/g, '') // Strip unicode replacement char
    .replace(/\u00A0/g, ' ') // Non-breaking space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes phone numbers to standard WhatsApp-compatible format (E.164 digits without +)
 * Handles Egyptian mobile local numbers (010, 011, 012, 015) and international codes.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/[^\d]/g, '');

  // Handle leading 00 international prefix (e.g. 002010... -> 2010...)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Handle Egyptian local numbers (010..., 011..., 012..., 015...)
  if (/^0(10|11|12|15)\d{8}$/.test(digits)) {
    digits = '20' + digits.slice(1);
  } else if (/^(10|11|12|15)\d{8}$/.test(digits)) {
    digits = '20' + digits;
  }

  return digits;
}

/**
 * Detects obvious hallucinated placeholder or dummy phone numbers
 * e.g. "01012345678", "201012345678", "12345678", "01000000000", "0123456789"
 */
export function isDummyPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return false;

  const dummyList = [
    '01012345678',
    '201012345678',
    '1012345678',
    '123456789',
    '0123456789',
    '12345678',
    '987654321',
    '01000000000',
    '201000000000',
    '01111111111',
    '201111111111',
    '01222222222',
    '01555555555',
  ];

  if (dummyList.includes(digits)) return true;
  if (digits.includes('12345678') || digits.includes('123456789')) return true;
  if (/(\d)\1{6,}/.test(digits)) return true;

  return false;
}

/**
 * Parses vCard 2.1 / 3.0 / 4.0 format into structured ContactItem records.
 */
export function parseVcfContent(vcfContent: string): ContactItem[] {
  if (!vcfContent) return [];

  // Unfold vCard lines: RFC standard unfolds lines that start with space or tab
  const unfolded = vcfContent.replace(/\r?\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i);
  const contacts: ContactItem[] = [];

  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx];
    if (!card.trim()) continue;

    // 1. Extract Name (FN or fallback to N)
    let displayName = '';
    const fnMatch = card.match(/FN:(.*?)(\r?\n|$)/i);
    if (fnMatch) {
      displayName = fnMatch[1].replace(/\uFFFD/g, '').replace(/[\r\n]+/g, ' ').trim();
    }

    if (!displayName) {
      const nMatch = card.match(/N:(.*?)(\r?\n|$)/i);
      if (nMatch) {
        const parts = nMatch[1].split(';').map((p) => p.trim()).filter(Boolean);
        displayName = parts.join(' ').replace(/\uFFFD/g, '').trim();
      }
    }

    // 2. Extract Phone numbers
    const phones: ContactPhone[] = [];
    const telMatches = card.matchAll(/TEL(?:;[^:]*)?:(.*?)(\r?\n|$)/gi);
    for (const m of telMatches) {
      const rawTel = m[1].replace(/[\r\n]+/g, '').trim();
      const normalized = normalizePhoneNumber(rawTel);
      if (normalized.length >= 7) {
        phones.push({
          raw: rawTel,
          normalized,
          type: m[0].toLowerCase().includes('cell') || m[0].includes('الجوّال') ? 'mobile' : 'other',
        });
      }
    }

    // 3. Extract Email
    let email: string | undefined;
    const emailMatch = card.match(/EMAIL(?:;[^:]*)?:(.*?)(\r?\n|$)/i);
    if (emailMatch) {
      email = emailMatch[1].trim();
    }

    // 4. Extract Notes
    let notes: string | undefined;
    const noteMatch = card.match(/NOTE:(.*?)(\r?\n|$)/i);
    if (noteMatch) {
      notes = noteMatch[1].trim();
    }

    if (displayName || phones.length > 0) {
      const finalName = displayName || (phones[0] ? `Contact ${phones[0].raw}` : 'Unknown Contact');
      contacts.push({
        id: `contact_${contacts.length + 1}`,
        name: finalName,
        normalizedName: normalizeArabicText(finalName),
        phones,
        primaryPhone: phones[0]?.normalized || null,
        email,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return contacts;
}
