import * as DocumentPicker from 'expo-document-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { FileMetadata, googleDriveService } from '../utils/googleDriveService';

interface FileUploadProps {
  onUploadComplete?: (result: { success: boolean; fileId?: string; error?: string }) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickDocument = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web-specific file picker
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      } else {
        // Mobile-specific document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const file = result.assets[0];
          setSelectedFile({
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
            size: file.size || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      if (Platform.OS === 'web') {
        alert('Failed to pick document');
      } else {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const handleWebFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile({
        uri: URL.createObjectURL(file),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      if (Platform.OS === 'web') {
        alert('Please select a file first');
      } else {
        Alert.alert('Error', 'Please select a file first');
      }
      return;
    }

    setUploading(true);

    try {
      // Check current folder status
      const folderStatus = googleDriveService.getFolderStatus();
      console.log('📁 Current folder status:', folderStatus);
      
      // Ensure Google Drive folders are initialized before upload
      console.log('🔧 Initializing Google Drive folders...');
      const initSuccess = await googleDriveService.initializeFolderStructure();
      if (!initSuccess) {
        throw new Error('Failed to initialize Google Drive folders');
      }
      console.log('✅ Google Drive folders initialized');

      const metadata: Partial<FileMetadata> = {
        description: description.trim() || undefined,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : undefined,
        category: category.trim() || undefined,
      };

      const result = await googleDriveService.uploadFile(selectedFile, metadata);

      if (result.success) {
        if (Platform.OS === 'web') {
          alert('File uploaded successfully!');
        } else {
          Alert.alert('Success', 'File uploaded successfully!');
        }
        setSelectedFile(null);
        setDescription('');
        setTags('');
        setCategory('');
        onUploadComplete?.({ success: true, fileId: result.fileId });
      } else {
        if (Platform.OS === 'web') {
          alert(`Upload Failed: ${result.error || 'Unknown error occurred'}`);
        } else {
          Alert.alert('Upload Failed', result.error || 'Unknown error occurred');
        }
        onUploadComplete?.({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to upload file');
      } else {
        Alert.alert('Error', 'Failed to upload file');
      }
      onUploadComplete?.({ success: false, error: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleWebFileSelect}
          accept="*/*"
        />
      )}
      
      <Text style={styles.title}>Upload File</Text>
      
      <TouchableOpacity style={styles.pickButton} onPress={pickDocument} disabled={uploading}>
        <Text style={styles.pickButtonText}>
          {selectedFile ? 'Change File' : 'Pick a File'}
        </Text>
      </TouchableOpacity>

      {selectedFile && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{selectedFile.name}</Text>
          <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
          <Text style={styles.fileType}>{selectedFile.type}</Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter file description..."
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Tags (optional)</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="Enter tags separated by commas..."
        />

        <Text style={styles.label}>Category (optional)</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Enter category..."
        />
      </View>

      {selectedFile && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={uploadFile}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload to Google Drive</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  pickButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  uploadButton: {
    backgroundColor: '#34A853',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
}); 