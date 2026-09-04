export interface GoogleContact {
  resourceName: string;
  etag?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  emails: string[];
  primaryEmail?: string;
  phoneNumbers: string[];
  primaryPhone?: string;
  photoUrl?: string;
  organization?: string;
  jobTitle?: string;
  addresses?: string[];
  birthday?: string;
  isOtherContact?: boolean;
  isOrbilinkUser?: boolean;
  matchedOrbilinkUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarColor?: string;
    avatarUrl?: string;
    isOnline: boolean;
    about?: string;
  } | null;
}

export interface CreateGoogleContactInput {
  givenName: string;
  familyName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
}
