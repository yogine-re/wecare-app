interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  description?: string;
  tags?: string[];
  category?: string;
  documentName?: string; // Added this line
}

interface UploadResult {
  success: boolean;
  fileId?: string;
  metadataId?: string;
  error?: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private readonly API_BASE = 'https://www.googleapis.com/drive/v3';
  private readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
  private readonly ROOT_FOLDER_NAME = 'wecare';
  private readonly DOCS_FOLDER_NAME = 'docs';
  private readonly METADATA_FOLDER_NAME = 'metadata';
  private readonly SETTINGS_FOLDER_NAME = 'settings';
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

  private rootFolderId: string | null = null;
  private docsFolderId: string | null = null;
  private metadataFolderId: string | null = null;
  private settingsFolderId: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  clearAccessToken() {
    this.accessToken = null;
    this.rootFolderId = null;
    this.docsFolderId = null;
    this.metadataFolderId = null;
    this.settingsFolderId = null;
  }

  getFolderStatus() {
    return {
      hasAccessToken: !!this.accessToken,
      rootFolderId: this.rootFolderId,
      docsFolderId: this.docsFolderId,
      metadataFolderId: this.metadataFolderId,
      settingsFolderId: this.settingsFolderId,
    };
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} - ${error}`);
    }

    // For DELETE requests, there's no response body to parse
    if (options.method === 'DELETE') {
      return { success: true };
    }

    // For PATCH requests, the response might be empty or contain the updated file
    if (options.method === 'PATCH') {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const responseData = await response.json();
          return responseData;
        } catch (error) {
          return { success: true };
        }
      } else {
        return { success: true };
      }
    }

    // For other requests, try to parse JSON
    try {
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      return { success: true };
    }
  }

  private async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    
    // Search for existing folder
    const query = parentId 
      ? `name='${folderName}' and '${parentId}' in parents and trashed=false`
      : `name='${folderName}' and 'root' in parents and trashed=false`;
    
    
    const searchResponse = await this.makeRequest(
      `${this.API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
    );

    if (searchResponse.files && searchResponse.files.length > 0) {
      return searchResponse.files[0].id;
    }

    
    // Create folder if it doesn't exist
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };

    
    const createResponse = await this.makeRequest(`${this.API_BASE}/files`, {
      method: 'POST',
      body: JSON.stringify(folderMetadata),
    });

    return createResponse.id;
  }

  async initializeFolderStructure(): Promise<boolean> {
    try {
      console.log('🔍 DEBUG: Starting folder structure initialization...');
      console.log('🔍 DEBUG: Access token available:', !!this.accessToken);
      
      if (!this.accessToken) {
        throw new Error('No access token available for folder initialization');
      }
      
      // Create root wecare folder
      console.log('🔍 DEBUG: Creating/finding root folder:', this.ROOT_FOLDER_NAME);
      this.rootFolderId = await this.findOrCreateFolder(this.ROOT_FOLDER_NAME);
      console.log('🔍 DEBUG: Root folder ID:', this.rootFolderId);
      
      // Create subfolders
      console.log('🔍 DEBUG: Creating/finding docs folder:', this.DOCS_FOLDER_NAME);
      this.docsFolderId = await this.findOrCreateFolder(this.DOCS_FOLDER_NAME, this.rootFolderId);
      console.log('🔍 DEBUG: Docs folder ID:', this.docsFolderId);
      
      console.log('🔍 DEBUG: Creating/finding metadata folder:', this.METADATA_FOLDER_NAME);
      this.metadataFolderId = await this.findOrCreateFolder(this.METADATA_FOLDER_NAME, this.rootFolderId);
      console.log('🔍 DEBUG: Metadata folder ID:', this.metadataFolderId);
      
      console.log('🔍 DEBUG: Creating/finding settings folder:', this.SETTINGS_FOLDER_NAME);
      this.settingsFolderId = await this.findOrCreateFolder(this.SETTINGS_FOLDER_NAME, this.rootFolderId);
      console.log('🔍 DEBUG: Settings folder ID:', this.settingsFolderId);

      console.log('🔍 DEBUG: Folder structure initialization completed successfully');
      return true;
    } catch (error) {
      console.log('🔍 DEBUG: Folder structure initialization failed:', error);
      throw new Error('Failed to initialize folder structure: ' + error);
    }
  }

  async uploadFile(
    file: File | { uri: string; name: string; type: string; size: number },
    metadata: Partial<FileMetadata> = {}
  ): Promise<UploadResult> {
    try {
      console.log('🔍 DEBUG: Starting upload for file:', file.name);
      console.log('🔍 DEBUG: Docs folder ID:', this.docsFolderId);
      console.log('🔍 DEBUG: Provided document name:', metadata.documentName);
      
      if (!this.docsFolderId) {
        console.log('🔍 DEBUG: Initializing folder structure...');
        const initSuccess = await this.initializeFolderStructure();
        if (!initSuccess) {
          throw new Error('Failed to initialize Google Drive folders');
        }
        console.log('🔍 DEBUG: Folder structure initialized');
      }

      if (file.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        };
      }

      // Create file metadata
      const fileMetadata = {
        name: metadata.documentName || file.name,
        parents: [this.docsFolderId],
        description: metadata.description || '',
        mimeType: file.type,
      };

      console.log('🔍 DEBUG: Final file name used for upload:', fileMetadata.name);
      console.log('🔍 DEBUG: File metadata:', fileMetadata);
      
      // Upload file using proper multipart format
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      
      let body = '';
      
      // Add metadata part
      body += `--${boundary}\r\n`;
      body += 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
      body += JSON.stringify(fileMetadata) + '\r\n';
      
      // Add file part
      body += `--${boundary}\r\n`;

      // For web files, we need to read the file content
      if ('uri' in file) {
        // React Native file - use FormData
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
        
        console.log('🔍 DEBUG: FormData payload:', formData);

        const uploadResponse = await fetch(
          `${this.UPLOAD_BASE}/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
            body: formData,
          }
        );
        
        console.log('🔍 DEBUG: Upload response status:', uploadResponse.status);
        console.log('🔍 DEBUG: Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.log('🔍 DEBUG: Upload error:', errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadedFile = await uploadResponse.json();
        console.log('🔍 DEBUG: Uploaded file response:', uploadedFile);
        
        if (!uploadedFile.id) {
          throw new Error('Upload response missing file ID');
        }
        
        const fileId = uploadedFile.id;
        
        // Create metadata file
        const fileMetadataObj: FileMetadata = {
          id: fileId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          createdTime: new Date().toISOString(),
          modifiedTime: new Date().toISOString(),
          description: metadata.description,
          tags: metadata.tags || [],
          category: metadata.category,
        };

        console.log('🔍 DEBUG: Saving metadata:', fileMetadataObj);
        
        const metadataResult = await this.saveMetadata(fileId, fileMetadataObj);
        console.log('🔍 DEBUG: Metadata saved:', metadataResult);

        return {
          success: true,
          fileId,
          metadataId: metadataResult.metadataId,
        };
      } else {
        // Web file - read file content and create proper multipart body
        const fileContent = await file.arrayBuffer();
        const fileBytes = new Uint8Array(fileContent);
        
        body += String.fromCharCode.apply(null, Array.from(fileBytes));
        body += `\r\n--${boundary}--\r\n`;
        
        console.log('🔍 DEBUG: Multipart body payload:', body);

        const uploadResponse = await fetch(
          `${this.UPLOAD_BASE}/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: body,
          }
        );
        
        console.log('🔍 DEBUG: Upload response status:', uploadResponse.status);
        console.log('🔍 DEBUG: Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.log('🔍 DEBUG: Upload error:', errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadedFile = await uploadResponse.json();
        console.log('🔍 DEBUG: Uploaded file response:', uploadedFile);
        
        if (!uploadedFile.id) {
          throw new Error('Upload response missing file ID');
        }
        
        const fileId = uploadedFile.id;
        
        // Create metadata file
        const fileMetadataObj: FileMetadata = {
          id: fileId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          createdTime: new Date().toISOString(),
          modifiedTime: new Date().toISOString(),
          description: metadata.description,
          tags: metadata.tags || [],
          category: metadata.category,
        };

        console.log('🔍 DEBUG: Saving metadata:', fileMetadataObj);
        
        const metadataResult = await this.saveMetadata(fileId, fileMetadataObj);
        console.log('🔍 DEBUG: Metadata saved:', metadataResult);

        return {
          success: true,
          fileId,
          metadataId: metadataResult.metadataId,
        };
      }
    } catch (error) {
      console.log('🔍 DEBUG: Upload error:', error);
      throw new Error('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async saveMetadata(fileId: string, metadata: FileMetadata): Promise<{ metadataId: string }> {
    if (!this.metadataFolderId) {
      throw new Error('Metadata folder not initialized');
    }

    const metadataFileName = `${fileId}_metadata.json`;
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify({
      name: metadataFileName,
      parents: [this.metadataFolderId],
    })], { type: 'application/json' }));
    formData.append('file', metadataBlob, metadataFileName);

    const response = await fetch(
      `${this.UPLOAD_BASE}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save metadata');
    }

    const result = await response.json();
    return { metadataId: result.id };
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      if (!this.metadataFolderId) {
        throw new Error('Metadata folder not initialized');
      }

      const metadataFileName = `${fileId}_metadata.json`;
      const query = `name='${metadataFileName}' and '${this.metadataFolderId}' in parents and trashed=false`;
      
      const searchResponse = await this.makeRequest(
        `${this.API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
      );

      if (!searchResponse.files || searchResponse.files.length === 0) {
        return null;
      }

      const metadataFileId = searchResponse.files[0].id;
      const metadataResponse = await this.makeRequest(
        `${this.API_BASE}/files/${metadataFileId}?alt=media`
      );

      return metadataResponse;
    } catch (error) {
      throw new Error('Failed to get file metadata: ' + error);
    }
  }

  // Add method to refresh token
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: '252276410338-59i709s33q4ifvq1jvnb6cbslomb837r.apps.googleusercontent.com', // Use your web client ID
          client_secret: '', // You'll need to add your client secret
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      } else {
        return null;
      }
    } catch (error) {
      throw new Error('Error refreshing token: ' + error);
    }
  }

  // Add method to validate token
  async validateToken(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }

      // Make a simple API call to test if token is valid
      const response = await fetch(`${this.API_BASE}/about?fields=user`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error('Error validating token: ' + error);
    }
  }

  async listFiles(): Promise<FileMetadata[]> {
    try {
      console.log('🔍 DEBUG: Starting listFiles...');
      console.log('🔍 DEBUG: Access token available:', !!this.accessToken);
      console.log('🔍 DEBUG: Docs folder ID:', this.docsFolderId);
      
      if (!this.accessToken) {
        throw new Error('No access token available');
      }

      // Validate token before proceeding
      const isTokenValid = await this.validateToken();
      if (!isTokenValid) {
        throw new Error('Access token is expired or invalid. Please log in again.');
      }

      if (!this.docsFolderId) {
        const initSuccess = await this.initializeFolderStructure();
        if (!initSuccess) {
          throw new Error('Failed to initialize folder structure');
        }
      }

      const query = `'${this.docsFolderId}' in parents and trashed=false`;
      console.log('🔍 DEBUG: Query:', query);
      
      // Request webViewLink and webContentLink
      const response = await this.makeRequest(
        `${this.API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)`
      );

      console.log('🔍 DEBUG: Files found:', response.files?.length || 0);
      console.log('🔍 DEBUG: Files:', response.files);
      
      const files: FileMetadata[] = [];
      for (const file of response.files) {
        try {
          console.log('🔍 DEBUG: Processing file:', file.name, 'ID:', file.id);
          const metadata = await this.getFileMetadata(file.id);
          if (metadata) {
            console.log('🔍 DEBUG: Found metadata for:', file.name);
            // Attach webViewLink as fileUrl
            (metadata as any).fileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
            files.push(metadata);
          } else {
            console.log('🔍 DEBUG: No metadata found for:', file.name, '- using fallback');
            // Fallback: create metadata from file info if metadata file doesn't exist
            const fallbackMetadata: FileMetadata = {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size || 0,
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime,
              description: '',
              tags: [],
              category: 'others',
            };
            (fallbackMetadata as any).fileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
            files.push(fallbackMetadata);
          }
        } catch (error) {
          console.log('🔍 DEBUG: Error processing file:', file.name, 'Error:', error);
          // If metadata retrieval fails, still include the file with fallback data
          const fallbackMetadata: FileMetadata = {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size || 0,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            description: '',
            tags: [],
            category: 'others',
          };
          (fallbackMetadata as any).fileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
          files.push(fallbackMetadata);
        }
      }

      console.log('🔍 DEBUG: Final files array:', files.length, 'files');
      return files;
    } catch (error) {
      console.log('🔍 DEBUG: listFiles error:', error);
      throw error; // Re-throw to let the calling component handle it
    }
  }

  async saveProfile(profileData: any): Promise<boolean> {
    try {
      if (!this.settingsFolderId) {
        throw new Error('Settings folder not initialized');
      }

      const profileFileName = 'profile.json';
      const profileBlob = new Blob([JSON.stringify(profileData, null, 2)], {
        type: 'application/json',
      });

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify({
        name: profileFileName,
        parents: [this.settingsFolderId],
      })], { type: 'application/json' }));
      formData.append('file', profileBlob, profileFileName);

      const response = await fetch(
        `${this.UPLOAD_BASE}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: formData,
        }
      );

      return response.ok;
    } catch (error) {
      throw new Error('Failed to save profile: ' + error);
    }
  }

  async getProfile(): Promise<any | null> {
    try {
      if (!this.settingsFolderId) {
        throw new Error('Settings folder not initialized');
      }

      const profileFileName = 'profile.json';
      const query = `name='${profileFileName}' and '${this.settingsFolderId}' in parents and trashed=false`;
      
      const searchResponse = await this.makeRequest(
        `${this.API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
      );

      if (!searchResponse.files || searchResponse.files.length === 0) {
        return null;
      }

      const profileFileId = searchResponse.files[0].id;
      const profileResponse = await this.makeRequest(
        `${this.API_BASE}/files/${profileFileId}?alt=media`
      );

      return profileResponse;
    } catch (error) {
      throw new Error('Failed to get profile: ' + error);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }
      
      // Delete the main file
      await this.makeRequest(
        `${this.API_BASE}/files/${fileId}`,
        { method: 'DELETE' }
      );
      
      // Delete the metadata file
      if (this.metadataFolderId) {
        const metadataFileName = `${fileId}_metadata.json`;
        const query = `name='${metadataFileName}' and '${this.metadataFolderId}' in parents and trashed=false`;
        
        const searchResponse = await this.makeRequest(
          `${this.API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
        );

        if (searchResponse.files && searchResponse.files.length > 0) {
          const metadataFileId = searchResponse.files[0].id;
          await this.makeRequest(
            `${this.API_BASE}/files/${metadataFileId}`,
            { method: 'DELETE' }
          );
        }
      }
      
      return true;
    } catch (error) {
      throw new Error('Failed to delete file: ' + error);
    }
  }

  async updateFileName(fileId: string, newName: string): Promise<boolean> {
    try {
      
      const response = await this.makeRequest(
        `${this.API_BASE}/files/${fileId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: newName }),
        }
      );
      
      return true;
    } catch (error) {
      throw new Error('Failed to update file name: ' + error);
    }
  }

  async updateMetadata(fileId: string, metadata: Partial<FileMetadata>): Promise<boolean> {
    try {
      if (!this.metadataFolderId) {
        throw new Error('Metadata folder not initialized');
      }

      // Get existing metadata
      const existingMetadata = await this.getFileMetadata(fileId);
      if (!existingMetadata) {
        throw new Error('File metadata not found');
      }

      // If name is being updated, update the actual file first
      if (metadata.name && metadata.name !== existingMetadata.name) {
        try {
          const nameUpdateSuccess = await this.updateFileName(fileId, metadata.name);
          if (!nameUpdateSuccess) {
            // Continue with metadata update even if file name update fails
          }
        } catch (error) {
          // Continue with metadata update even if file name update fails
        }
      }

      // Merge with new metadata
      const updatedMetadata = {
        ...existingMetadata,
        ...metadata,
        modifiedTime: new Date().toISOString(),
      };

      // Delete old metadata file
      const metadataFileName = `${fileId}_metadata.json`;
      const query = `name='${metadataFileName}' and '${this.metadataFolderId}' in parents and trashed=false`;
      
      const searchResponse = await this.makeRequest(
        `${this.API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
      );

      if (searchResponse.files && searchResponse.files.length > 0) {
        const oldMetadataFileId = searchResponse.files[0].id;
        await this.makeRequest(
          `${this.API_BASE}/files/${oldMetadataFileId}`,
          { method: 'DELETE' }
        );
      }

      // Create new metadata file
      const metadataBlob = new Blob([JSON.stringify(updatedMetadata, null, 2)], {
        type: 'application/json',
      });

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify({
        name: metadataFileName,
        parents: [this.metadataFolderId],
      })], { type: 'application/json' }));
      formData.append('file', metadataBlob, metadataFileName);

      const response = await fetch(
        `${this.UPLOAD_BASE}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update metadata: ${response.status} - ${errorText}`);
      }

      return true;
    } catch (error) {
      throw new Error('Failed to update metadata: ' + error);
    }
  }
}

export const googleDriveService = new GoogleDriveService();
export type { FileMetadata, UploadResult };
