import { GoogleContact, CreateGoogleContactInput } from '../types/googleContacts';
import { authService } from './firebase/authService';
import { getFirebaseDb, isLiveFirebase } from './firebase/firebaseApp';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export class GoogleContactsService {
  /**
   * Checks if we have an active access token in memory
   */
  public hasAccessToken(): boolean {
    return !!authService.getGoogleAccessToken();
  }

  /**
   * Obtains access token or triggers interactive consent prompt
   */
  public async ensureAccessToken(): Promise<string> {
    const existing = authService.getGoogleAccessToken();
    if (existing) return existing;
    return await authService.requestGoogleContactsAccess();
  }

  /**
   * Fetches the user's Google Contacts via People API connections endpoint
   */
  public async fetchConnections(tokenOverride?: string): Promise<GoogleContact[]> {
    const token = tokenOverride || (await this.ensureAccessToken());
    if (!token) throw new Error('No Google authorization token available.');

    const url =
      'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations,birthdays,addresses,userDefined&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING';

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.setGoogleAccessToken(null);
        throw new Error('Google session expired or permission revoked. Please reconnect Google Contacts.');
      }
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson?.error?.message || `Google API error (${response.status})`;
      throw new Error(msg);
    }

    const data = await response.json();
    const connections: any[] = data.connections || [];

    const contacts: GoogleContact[] = connections.map((p) => this.mapPersonToGoogleContact(p, false));
    return contacts;
  }

  /**
   * Fetches frequent / "Other contacts" via Google People API
   */
  public async fetchOtherContacts(tokenOverride?: string): Promise<GoogleContact[]> {
    const token = tokenOverride || (await this.ensureAccessToken());
    if (!token) return [];

    try {
      const url =
        'https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses,phoneNumbers,photos&pageSize=1000';

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const others: any[] = data.otherContacts || [];
      return others.map((p) => this.mapPersonToGoogleContact(p, true));
    } catch {
      return [];
    }
  }

  /**
   * Searches contacts in Google People API
   */
  public async searchGoogleContacts(queryText: string): Promise<GoogleContact[]> {
    const token = await this.ensureAccessToken();
    if (!queryText.trim()) return await this.fetchConnections(token);

    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
      queryText
    )}&readMask=names,emailAddresses,phoneNumbers,photos,organizations&pageSize=50`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback to local filter if search endpoint has quota issues
      const all = await this.fetchConnections(token);
      return all.filter(
        (c) =>
          c.displayName.toLowerCase().includes(queryText.toLowerCase()) ||
          c.emails.some((e) => e.toLowerCase().includes(queryText.toLowerCase())) ||
          c.phoneNumbers.some((p) => p.includes(queryText))
      );
    }

    const data = await response.json();
    const results: any[] = data.results || [];
    return results.map((r) => this.mapPersonToGoogleContact(r.person, false));
  }

  /**
   * Correlates Google Contacts with registered ORBILINK users in Cloud Firestore
   */
  public async matchWithOrbilinkUsers(contacts: GoogleContact[]): Promise<GoogleContact[]> {
    const db = getFirebaseDb();
    if (!isLiveFirebase() || !db || contacts.length === 0) {
      return contacts;
    }

    // Collect all emails to query
    const emailToContactIdxs = new Map<string, number[]>();
    contacts.forEach((c, idx) => {
      c.emails.forEach((email) => {
        const clean = email.trim().toLowerCase();
        if (clean) {
          if (!emailToContactIdxs.has(clean)) {
            emailToContactIdxs.set(clean, []);
          }
          emailToContactIdxs.get(clean)!.push(idx);
        }
      });
    });

    if (emailToContactIdxs.size === 0) return contacts;

    const emailsArray = Array.from(emailToContactIdxs.keys());
    // Query Firestore in batches of 30 (Firestore 'in' query limit)
    const matchedContacts = [...contacts];

    for (let i = 0; i < emailsArray.length; i += 30) {
      const batch = emailsArray.slice(i, i + 30);
      try {
        const q = query(collection(db, 'users'), where('email', 'in', batch), limit(30));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const u = docSnap.data();
          const userEmail = (u.email || '').toLowerCase();
          const targetIndices = emailToContactIdxs.get(userEmail);
          if (targetIndices) {
            targetIndices.forEach((targetIdx) => {
              const matchedUserObj = {
                id: docSnap.id,
                username: u.username || 'user',
                displayName: u.displayName || u.username || 'User',
                avatarColor: u.avatarColor || '#25D366',
                avatarUrl: u.avatarUrl || u.photoURL,
                isOnline: !!u.isOnline,
                about: u.about,
              };
              matchedContacts[targetIdx] = {
                ...matchedContacts[targetIdx],
                isOrbilinkUser: true,
                matchedOrbilinkUser: matchedUserObj,
              };
            });
          }
        });
      } catch (err) {
        console.warn('[GoogleContacts] User matching warning:', err);
      }
    }

    return matchedContacts;
  }

  /**
   * Creates a new Contact in Google Contacts via People API
   * NOTE: Must be preceded by explicit user confirmation
   */
  public async createContact(input: CreateGoogleContactInput): Promise<GoogleContact> {
    const token = await this.ensureAccessToken();
    const payload: any = {
      names: [
        {
          givenName: input.givenName.trim(),
          familyName: (input.familyName || '').trim(),
        },
      ],
    };

    if (input.email?.trim()) {
      payload.emailAddresses = [{ value: input.email.trim() }];
    }
    if (input.phone?.trim()) {
      payload.phoneNumbers = [{ value: input.phone.trim() }];
    }
    if (input.organization?.trim() || input.jobTitle?.trim()) {
      payload.organizations = [
        {
          name: (input.organization || '').trim(),
          title: (input.jobTitle || '').trim(),
        },
      ];
    }

    const response = await fetch('https://people.googleapis.com/v1/people:createContact?personFields=names,emailAddresses,phoneNumbers,photos,organizations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to create Google Contact (${response.status})`);
    }

    const created = await response.json();
    return this.mapPersonToGoogleContact(created, false);
  }

  /**
   * Deletes a Contact from Google Contacts via People API
   * NOTE: Must be preceded by explicit user confirmation
   */
  public async deleteContact(resourceName: string): Promise<void> {
    const token = await this.ensureAccessToken();
    const response = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to delete Google Contact (${response.status})`);
    }
  }

  /**
   * Maps Google People API Person resource to normalized GoogleContact
   */
  private mapPersonToGoogleContact(p: any, isOther: boolean): GoogleContact {
    const resourceName = p.resourceName || '';
    const etag = p.etag || '';

    // Extract names
    const primaryName = (p.names && p.names[0]) || {};
    const displayName =
      primaryName.displayName ||
      primaryName.givenName ||
      (p.emailAddresses && p.emailAddresses[0]?.value) ||
      (p.phoneNumbers && p.phoneNumbers[0]?.value) ||
      'Unnamed Contact';

    const givenName = primaryName.givenName || '';
    const familyName = primaryName.familyName || '';

    // Extract emails
    const emails: string[] = [];
    let primaryEmail: string | undefined;
    if (Array.isArray(p.emailAddresses)) {
      p.emailAddresses.forEach((e: any) => {
        if (e.value) {
          emails.push(e.value);
          if (e.metadata?.primary || !primaryEmail) {
            primaryEmail = e.value;
          }
        }
      });
    }

    // Extract phone numbers
    const phoneNumbers: string[] = [];
    let primaryPhone: string | undefined;
    if (Array.isArray(p.phoneNumbers)) {
      p.phoneNumbers.forEach((ph: any) => {
        if (ph.value) {
          phoneNumbers.push(ph.value);
          if (ph.metadata?.primary || !primaryPhone) {
            primaryPhone = ph.value;
          }
        }
      });
    }

    // Extract photos
    const photoUrl = (p.photos && p.photos[0]?.url) || '';

    // Extract organization
    const org = (p.organizations && p.organizations[0]) || {};
    const organization = org.name || '';
    const jobTitle = org.title || '';

    // Extract addresses
    const addresses: string[] = [];
    if (Array.isArray(p.addresses)) {
      p.addresses.forEach((a: any) => {
        if (a.formattedValue) addresses.push(a.formattedValue);
      });
    }

    return {
      resourceName,
      etag,
      displayName,
      givenName,
      familyName,
      emails,
      primaryEmail,
      phoneNumbers,
      primaryPhone,
      photoUrl,
      organization,
      jobTitle,
      addresses,
      isOtherContact: isOther,
      matchedOrbilinkUser: null,
    };
  }
}

export const googleContactsService = new GoogleContactsService();
