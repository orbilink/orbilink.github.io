import { DriveFile, DriveStorageQuota } from '../types/googleDrive';
import { authService } from './firebase/authService';

export class GoogleDriveService {
  public hasAccessToken(): boolean {
    return !!authService.getGoogleAccessToken();
  }

  public async ensureAccessToken(): Promise<string> {
    const existing = authService.getGoogleAccessToken();
    if (existing) return existing;
    return await authService.requestGoogleWorkspaceAccess();
  }

  /**
   * Fetch files from Google Drive
   */
  public async fetchFiles(options?: {
    folderId?: string;
    queryText?: string;
    starredOnly?: boolean;
    trashedOnly?: boolean;
    mimeTypeFilter?: string;
    pageSize?: number;
  }): Promise<DriveFile[]> {
    const token = await this.ensureAccessToken();
    const folderId = options?.folderId || 'root';
    const pageSize = options?.pageSize || 100;

    let q = options?.trashedOnly ? 'trashed = true' : 'trashed = false';

    if (options?.starredOnly) {
      q += ' and starred = true';
    } else if (!options?.trashedOnly && !options?.queryText) {
      q += ` and '${folderId}' in parents`;
    }

    if (options?.queryText && options.queryText.trim()) {
      const sanitized = options.queryText.trim().replace(/'/g, "\\'");
      q += ` and (name contains '${sanitized}' or fullText contains '${sanitized}')`;
    }

    if (options?.mimeTypeFilter) {
      if (options.mimeTypeFilter === 'folder') {
        q += ` and mimeType = 'application/vnd.google-apps.folder'`;
      } else if (options.mimeTypeFilter === 'document') {
        q += ` and (mimeType contains 'document' or mimeType contains 'text' or mimeType contains 'pdf' or mimeType = 'application/vnd.google-apps.document')`;
      } else if (options.mimeTypeFilter === 'spreadsheet') {
        q += ` and (mimeType contains 'spreadsheet' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType contains 'csv')`;
      } else if (options.mimeTypeFilter === 'presentation') {
        q += ` and (mimeType contains 'presentation' or mimeType = 'application/vnd.google-apps.presentation')`;
      } else if (options.mimeTypeFilter === 'image') {
        q += ` and mimeType contains 'image/'`;
      } else if (options.mimeTypeFilter === 'video') {
        q += ` and (mimeType contains 'video/' or mimeType contains 'audio/')`;
      }
    }

    const fields =
      'files(id,name,mimeType,iconLink,webViewLink,webContentLink,thumbnailLink,size,modifiedTime,createdTime,starred,trashed,parents,owners,shared)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}&orderBy=folder,name`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.setGoogleAccessToken(null);
        throw new Error('Google authorization expired. Please reconnect Google Drive.');
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Google Drive API error (${response.status})`);
    }

    const data = await response.json();
    const files: any[] = data.files || [];

    return files.map((f) => ({
      id: f.id,
      name: f.name || 'Untitled File',
      mimeType: f.mimeType || 'application/octet-stream',
      iconLink: f.iconLink,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      thumbnailLink: f.thumbnailLink,
      size: f.size,
      modifiedTime: f.modifiedTime,
      createdTime: f.createdTime,
      starred: !!f.starred,
      trashed: !!f.trashed,
      parents: f.parents,
      owners: f.owners,
      shared: !!f.shared,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  /**
   * Fetch storage quota
   */
  public async getStorageQuota(): Promise<DriveStorageQuota> {
    try {
      const token = await this.ensureAccessToken();
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      if (!response.ok) return {};
      const data = await response.json();
      return {
        limit: data.storageQuota?.limit ? parseInt(data.storageQuota.limit, 10) : undefined,
        usage: data.storageQuota?.usage ? parseInt(data.storageQuota.usage, 10) : undefined,
        usageInDrive: data.storageQuota?.usageInDrive
          ? parseInt(data.storageQuota.usageInDrive, 10)
          : undefined,
        usageInDriveTrash: data.storageQuota?.usageInDriveTrash
          ? parseInt(data.storageQuota.usageInDriveTrash, 10)
          : undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Create a new folder
   */
  public async createFolder(name: string, parentFolderId?: string): Promise<DriveFile> {
    const token = await this.ensureAccessToken();
    const metadata: any = {
      name: name.trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,createdTime,modifiedTime', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || 'Failed to create folder');
    }

    const created = await response.json();
    return {
      id: created.id,
      name: created.name,
      mimeType: created.mimeType,
      webViewLink: created.webViewLink,
      isFolder: true,
      createdTime: created.createdTime,
      modifiedTime: created.modifiedTime,
    };
  }

  /**
   * Upload a file to Google Drive using multipart upload
   */
  public async uploadFile(file: File, parentFolderId?: string): Promise<DriveFile> {
    const token = await this.ensureAccessToken();

    const metadata: any = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };
    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const reader = new FileReader();
    const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const fileBuffer = await fileDataPromise;
    const metadataBlob = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    ]);

    const closingBlob = new Blob([closeDelimiter]);
    const multipartBody = new Blob([metadataBlob, fileBuffer, closingBlob]);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size,createdTime',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || 'Failed to upload file to Google Drive');
    }

    const uploaded = await response.json();
    return {
      id: uploaded.id,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      webViewLink: uploaded.webViewLink,
      webContentLink: uploaded.webContentLink,
      size: uploaded.size,
      isFolder: false,
      createdTime: uploaded.createdTime,
    };
  }

  /**
   * Star / Unstar a file
   */
  public async toggleStar(fileId: string, starred: boolean): Promise<void> {
    const token = await this.ensureAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ starred }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || 'Failed to update star status');
    }
  }

  /**
   * Move file to Trash or permanently delete
   */
  public async trashFile(fileId: string): Promise<void> {
    const token = await this.ensureAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trashed: true }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || 'Failed to move file to trash');
    }
  }

  /**
   * Permanently delete file
   */
  public async deleteFilePermanently(fileId: string): Promise<void> {
    const token = await this.ensureAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || 'Failed to delete file permanently');
    }
  }
}

export const googleDriveService = new GoogleDriveService();
