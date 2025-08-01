import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FileMetadata, googleDriveService } from '../utils/googleDriveService';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

interface UploadSource {
  id: string;
  title: string;
  icon: string;
  description: string;
  action: () => void;
}

interface MetadataForm {
  fileName: string;
  documentName: string;
  tags: string;
  docType: string;
  summary: string;
}

const DOC_TYPES = [
  'Prescription',
  'Consult',
  'Lab Result',
  'Medical Report',
  'X-Ray',
  'MRI',
  'CT Scan',
  'Ultrasound',
  'Vaccination Record',
  'Insurance',
  'Other'
];

const RECENT_UPLOADS_KEY = 'recentUploads';

interface UploadPageProps {
  onNavigateToHomeTab?: () => void;
}

export default function UploadPage({ onNavigateToHomeTab }: UploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [metadata, setMetadata] = useState<MetadataForm>({
    fileName: '',
    documentName: '',
    tags: '',
    docType: 'Other',
    summary: '',
  });
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load recent uploads from cache on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(RECENT_UPLOADS_KEY);
        if (cached) {
          setRecentUploads(JSON.parse(cached));
        }
      } catch {}
    })();
  }, []);

  const handleFileSelected = (file: any) => {
    console.log('🔍 DEBUG: File selected with mimeType:', file.type);
    setSelectedFile(file);
    setMetadata({
      fileName: file.name,
      documentName: file.name,
      tags: '',
      docType: 'Other',
      summary: '',
    });
    console.log('🔍 DEBUG: File selected with name:', file.name);
    setShowMetadataModal(true);
  };

  const closeDropdown = () => {
    setShowDocTypeDropdown(false);
  };

  const pickFromDevice = async () => {
    try {
      if (Platform.OS === 'web') {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const file = result.assets[0];
          handleFileSelected({
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
      handleFileSelected({
        uri: URL.createObjectURL(file),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      });
    }
  };

  const pickFromCamera = () => {
    Alert.alert(
      'Coming Soon', 
      'Camera upload will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const pickFromGallery = () => {
    Alert.alert(
      'Coming Soon', 
      'Gallery upload will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const pickFromDrive = () => {
    Alert.alert(
      'Coming Soon', 
      'Google Drive import will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const pickFromOneDrive = () => {
    Alert.alert(
      'Coming Soon', 
      'OneDrive import will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    console.log('🔍 DEBUG: Metadata before upload:', metadata);

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

      // Create a new file object with the user's custom document name
      const fileToUpload = {
        ...selectedFile,
        name: metadata.documentName || selectedFile.name, // Use custom name if provided
      };

      const uploadMetadata: Partial<FileMetadata> = {
        description: metadata.summary.trim() || undefined,
        tags: metadata.tags.trim() ? metadata.tags.split(',').map(tag => tag.trim()) : undefined,
        category: metadata.docType,
      };

      console.log('🔍 DEBUG: Uploading file with name:', fileToUpload.name);
      const result = await googleDriveService.uploadFile(fileToUpload, uploadMetadata);

      if (result.success) {
        // Update local cache of recent uploads
        const newDoc = {
          name: metadata.documentName,
          fileName: selectedFile.name,
          docType: metadata.docType,
          uploadDate: new Date().toISOString(),
          id: result.fileId || Date.now().toString(),
        };
        const updatedUploads = [newDoc, ...recentUploads].slice(0, 3);
        setRecentUploads(updatedUploads);
        await AsyncStorage.setItem(RECENT_UPLOADS_KEY, JSON.stringify(updatedUploads));
        setShowMetadataModal(false);
        setSelectedFile(null);
        setMetadata({
          fileName: '',
          documentName: '',
          tags: '',
          docType: 'Other',
          summary: '',
        });
        setUploadSuccess(true);
        
        // Automatically navigate back to home tab after successful upload
        setTimeout(() => {
          if (onNavigateToHomeTab) {
            onNavigateToHomeTab();
          }
        }, 2000); // Wait 2 seconds to show success message
      } else {
        if (Platform.OS === 'web') {
          alert(`Upload failed: ${result.error || 'Unknown error'}`);
        } else {
          Alert.alert('Upload Failed', result.error || 'Unknown error occurred');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to upload document');
      } else {
        Alert.alert('Error', 'Failed to upload document');
      }
    } finally {
      setUploading(false);
    }
  };

  // Post-success actions
  const handleViewInDocuments = () => {
    if (onNavigateToHomeTab) {
      onNavigateToHomeTab();
    }
  };
  const handleUploadAnother = () => {
    setUploadSuccess(false);
    setSelectedFile(null);
    setMetadata({
      fileName: '',
      documentName: '',
      tags: '',
      docType: 'Other',
      summary: '',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadSources: UploadSource[] = [
    {
      id: 'device',
      title: 'Device',
      icon: '💾',
      description: 'Select from your device storage',
      action: pickFromDevice,
    },
    {
      id: 'camera',
      title: 'Camera',
      icon: '📷',
      description: 'Take a new photo or video (Coming Soon)',
      action: pickFromCamera,
    },
    {
      id: 'gallery',
      title: 'Gallery',
      icon: '📱',
      description: 'Select from your photos and videos (Coming Soon)',
      action: pickFromGallery,
    },
    {
      id: 'drive',
      title: 'Drive',
      icon: '☁️',
      description: 'Import from your Google Drive (Coming Soon)',
      action: pickFromDrive,
    },
    {
      id: 'onedrive',
      title: 'OneDrive',
      icon: '☁️',
      description: 'Import from your OneDrive (Coming Soon)',
      action: pickFromOneDrive,
    },
  ];

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Source Selection Section */}
        {!uploadSuccess && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Document</Text>
            <Text style={styles.sectionSubtitle}>Select where to upload your document from</Text>
            
            <View style={styles.sourcesGrid}>
              {uploadSources.map((source) => {
                const isAvailable = source.id === 'device';
                return (
                  <TouchableOpacity
                    key={source.id}
                    style={[
                      styles.sourceCard,
                      !isAvailable && styles.sourceCardDisabled
                    ]}
                    onPress={source.action}
                  >
                    <Text style={[
                      styles.sourceIcon,
                      !isAvailable && styles.sourceIconDisabled
                    ]}>
                      {source.icon}
                    </Text>
                    <Text style={[
                      styles.sourceTitle,
                      !isAvailable && styles.sourceTitleDisabled
                    ]}>
                      {source.title}
                    </Text>
                    <Text style={[
                      styles.sourceDescription,
                      !isAvailable && styles.sourceDescriptionDisabled
                    ]}>
                      {source.description}
                    </Text>
                    {isAvailable && (
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableBadgeText}>Available</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Uploads Section */}
        {recentUploads.length > 0 && !uploadSuccess && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Uploads</Text>
            {recentUploads.map((doc) => (
              <View key={doc.id} style={styles.recentDocCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentDocName}>{doc.name}</Text>
                  <Text style={styles.recentDocMeta}>{doc.docType} • {new Date(doc.uploadDate).toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.recentDocViewBtn} onPress={() => {}}>
                  <Text style={styles.recentDocViewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Post-success actions */}
        {uploadSuccess && (
          <View style={styles.section}>
            <Text style={styles.successMessage}>Document uploaded successfully!</Text>
            <View style={styles.successActions}>
              <TouchableOpacity style={styles.successBtnPrimary} onPress={handleViewInDocuments}>
                <Text style={styles.successBtnPrimaryText}>View in Documents</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successBtnSecondary} onPress={handleUploadAnother}>
                <Text style={styles.successBtnSecondaryText}>Upload Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Metadata Modal */}
      <Modal
        visible={showMetadataModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMetadataModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Details</Text>
              <TouchableOpacity
                onPress={() => setShowMetadataModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* File Info */}
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{selectedFile?.name}</Text>
                {selectedFile?.size > 0 && (
                  <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                )}
                <Text style={styles.fileType}>{selectedFile?.type}</Text>
              </View>

              {/* Metadata Form */}
              <View style={styles.form}>
                <Text style={styles.label}>Document Name</Text>
                <TextInput
                  style={styles.input}
                  value={metadata.documentName}
                  onChangeText={(text) => setMetadata({ ...metadata, documentName: text })}
                  placeholder="Enter document name..."
                />

                {Platform.OS === 'web' ? (
                  <View style={{ marginBottom: isSmallScreen ? 12 : 16 }}>
                    <Text style={styles.label}>Document Type</Text>
                    <select
                      style={{
                        width: '100%',
                        padding: isSmallScreen ? 10 : 12,
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        fontSize: isSmallScreen ? 14 : 15,
                        marginBottom: 0,
                        backgroundColor: '#fff',
                      }}
                      value={metadata.docType}
                      onChange={e => setMetadata({ ...metadata, docType: e.target.value })}
                    >
                      {DOC_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </View>
                ) : (
                  <View style={{ marginBottom: isSmallScreen ? 12 : 16 }}>
                    <Text style={styles.label}>Document Type</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={metadata.docType}
                        onValueChange={(value: string) => setMetadata({ ...metadata, docType: value })}
                        style={styles.picker}
                      >
                        {DOC_TYPES.map(type => (
                          <Picker.Item key={type} label={type} value={type} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                <Text style={styles.label}>Tags (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  value={metadata.tags}
                  onChangeText={(text) => setMetadata({ ...metadata, tags: text })}
                  placeholder="e.g., important, medical, urgent"
                />

                <Text style={styles.label}>Summary</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={metadata.summary}
                  onChangeText={(text) => setMetadata({ ...metadata, summary: text })}
                  placeholder="Enter document summary..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>Upload Date</Text>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowMetadataModal(false)}
                disabled={uploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={uploadFile}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload Document</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: isSmallScreen ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isSmallScreen ? 6 : 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    marginBottom: isSmallScreen ? 24 : 30,
    textAlign: 'center',
  },
  sourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 12 : 16,
  },
  sourceCard: {
    width: isSmallScreen ? '100%' : '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    minHeight: isSmallScreen ? 100 : 140,
    marginBottom: isSmallScreen ? 8 : 0,
  },
  sourceIcon: {
    fontSize: isSmallScreen ? 28 : 36,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  sourceTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: isSmallScreen ? 6 : 8,
    textAlign: 'center',
  },
  sourceDescription: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 16 : 20,
  },
  sourceCardDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    opacity: 0.6,
  },
  sourceIconDisabled: {
    opacity: 0.5,
  },
  sourceTitleDisabled: {
    color: '#999',
  },
  sourceDescriptionDisabled: {
    color: '#999',
  },
  availableBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  availableBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'ios' ? 16 : 8,
    width: isLargeScreen ? '80%' : '95%',
    maxWidth: isLargeScreen ? 600 : screenWidth * 0.95,
    maxHeight: isLargeScreen ? '90%' : '95%',
    minHeight: isLargeScreen ? '60%' : '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isSmallScreen ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    borderRadius: isSmallScreen ? 14 : 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: isSmallScreen ? 16 : 20,
  },
  fileInfo: {
    backgroundColor: '#f8f9fa',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    marginBottom: isSmallScreen ? 16 : 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fileName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: isSmallScreen ? 4 : 6,
  },
  fileSize: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
    marginBottom: 4,
  },
  fileType: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: isSmallScreen ? 6 : 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: isSmallScreen ? 10 : 12,
    fontSize: isSmallScreen ? 14 : 15,
    backgroundColor: '#fff',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  textArea: {
    minHeight: isSmallScreen ? 60 : 80,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: isSmallScreen ? 12 : 16,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: isSmallScreen ? 44 : 48,
  },
  dateText: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: isSmallScreen ? 10 : 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: isSmallScreen ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: isSmallScreen ? 10 : 12,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    borderRadius: 8,
    marginHorizontal: isSmallScreen ? 4 : 6,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  uploadButton: {
    backgroundColor: '#007bff',
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 16 : 20,
  },
  successActions: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-around',
    gap: isSmallScreen ? 12 : 0,
  },
  successBtnPrimary: {
    backgroundColor: '#007bff',
    paddingVertical: isSmallScreen ? 12 : 14,
    paddingHorizontal: isSmallScreen ? 20 : 24,
    borderRadius: 8,
    flex: isSmallScreen ? 0 : 1,
    marginHorizontal: isSmallScreen ? 0 : 10,
  },
  successBtnPrimaryText: {
    color: '#fff',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBtnSecondary: {
    backgroundColor: '#6c757d',
    paddingVertical: isSmallScreen ? 12 : 14,
    paddingHorizontal: isSmallScreen ? 20 : 24,
    borderRadius: 8,
    flex: isSmallScreen ? 0 : 1,
    marginHorizontal: isSmallScreen ? 0 : 10,
  },
  successBtnSecondaryText: {
    color: '#fff',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentDocCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    marginBottom: isSmallScreen ? 8 : 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  recentDocName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: isSmallScreen ? 2 : 4,
  },
  recentDocMeta: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
  },
  recentDocViewBtn: {
    backgroundColor: '#007bff',
    paddingVertical: isSmallScreen ? 6 : 8,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    borderRadius: 6,
  },
  recentDocViewBtnText: {
    color: '#fff',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
  },
}); 