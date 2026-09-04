export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  starred?: boolean;
  trashed?: boolean;
  parents?: string[];
  owners?: { displayName: string; emailAddress?: string; photoLink?: string }[];
  shared?: boolean;
  isFolder: boolean;
}

export interface DriveStorageQuota {
  limit?: number; // bytes
  usage?: number; // bytes
  usageInDrive?: number; // bytes
  usageInDriveTrash?: number; // bytes
}

export interface DriveFolderBreadcrumb {
  id: string;
  name: string;
}
