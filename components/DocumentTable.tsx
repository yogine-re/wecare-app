import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { googleDriveService } from '../utils/googleDriveService';
import MetadataEditModal from './MetadataEditModal';

const { width: screenWidth } = Dimensions.get('window');
const ACTION_WIDTH = 80;

export interface Document {
  id: string;
  fileName: string;
  uploadDate: string;
  docType: string;
  summary: string;
  fileSize?: string;
  fileUrl?: string;
  tags?: string[];
  category?: string;
}

interface DocumentTableProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
  onViewSummary?: (document: Document) => void;
  onRefresh?: () => void;
  multiSelect?: boolean;
  selectedDocs?: Document[];
  onDocSelect?: (doc: Document, isSelected: boolean) => void;
  maxSelection?: number;
}

interface SwipeableRowProps {
  document: Document;
  onView: (doc: Document) => void;
  onViewSummary: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  isActive: boolean;
  onActivate: (id: string) => void;
  multiSelect?: boolean;
  isSelected?: boolean;
  onSelect?: (doc: Document, isSelected: boolean) => void;
  maxSelection?: number;
  selectedCount?: number;
}

const SwipeableRow: React.FC<SwipeableRowProps> = ({
  document,
  onView,
  onViewSummary,
  onEdit,
  onDelete,
  isActive,
  onActivate,
  multiSelect,
  isSelected,
  onSelect,
  maxSelection,
  selectedCount
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);

  const getFileIcon = (docType: string) => {
    const type = docType.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('doc') || type.includes('word')) return '📝';
    if (type.includes('image') || type.includes('jpg') || type.includes('png')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    return '📁';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePress = () => {
    if (isOpen) {
      closeRow();
    } else {
      onView(document);
    }
  };

  const handleLongPress = () => {
    if (Platform.OS === 'web') {
      // On web, show contextual menu
      onActivate(document.id);
    } else {
      // On mobile, open row
      openRow();
    }
  };

  const openRow = () => {
    setIsOpen(true);
    Animated.spring(translateX, {
      toValue: -ACTION_WIDTH * 2,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const closeRow = () => {
    setIsOpen(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleEdit = () => {
    closeRow();
    onEdit(document);
  };

  const handleDelete = () => {
    closeRow();
    onDelete(document);
  };

  const handleViewSummary = () => {
    closeRow();
    onViewSummary(document);
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(document, !isSelected);
    }
  };

  return (
    <View style={styles.rowContainer}>
      {/* Action Buttons (Hidden behind row) */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editAction]}
          onPress={handleEdit}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteAction]}
          onPress={handleDelete}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Main Row Content */}
      <Animated.View
        style={[
          styles.tableRow,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Pressable
          style={[styles.rowContent, multiSelect && styles.rowContentMultiSelect]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        >
          {/* Selection Checkbox */}
          {multiSelect && (
            <TouchableOpacity
              style={styles.selectCheckbox}
              onPress={handleSelect}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Text style={styles.checkboxCheckmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          )}

          {/* File Name */}
          <View style={[styles.fileNameCell, multiSelect && styles.fileNameCellMultiSelect]}>
            <Text style={styles.fileIcon}>{getFileIcon(document.docType)}</Text>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>
                {document.fileName}
              </Text>
              {document.fileSize && (
                <Text style={styles.fileSize}>{document.fileSize}</Text>
              )}
            </View>
          </View>

          {/* Doc Type */}
          <View style={styles.typeCell}>
            <Text style={styles.docType}>
              {document.docType.split('/').pop()?.toUpperCase() || 'FILE'}
            </Text>
          </View>

          {/* Upload Date */}
          <View style={styles.dateCell}>
            <Text style={styles.uploadDate}>{formatDate(document.uploadDate)}</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleViewSummary}
            >
              <Text style={styles.quickActionText}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.viewButton]}
              onPress={() => onView(document)}
            >
              <Text style={styles.viewButtonText}>👁️</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default function DocumentTable({ 
  documents, 
  onViewDocument, 
  onViewSummary,
  onRefresh,
  multiSelect = false,
  selectedDocs = [],
  onDocSelect,
  maxSelection = 3
}: DocumentTableProps) {
  const [realDocuments, setRealDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📋 DocumentTable: Fetching documents...');
      const files = await googleDriveService.listFiles();
      console.log('📋 DocumentTable: Documents fetched successfully:', files.length);
      
      const docs: Document[] = files.map((file: any) => ({
        id: file.id,
        fileName: file.name,
        uploadDate: file.createdTime,
        docType: file.mimeType,
        summary: file.description || 'No description available',
        fileSize: formatFileSize(file.size),
        fileUrl: file.fileUrl || `https://drive.google.com/file/d/${file.id}/view`,
        tags: file.tags || [],
        category: file.category || '',
      }));
      
      setRealDocuments(docs);
    } catch (error) {
      console.error('❌ DocumentTable: Error fetching documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleViewDocument = async (document: Document) => {
    try {
      console.log('👁️ DocumentTable: Opening document:', document.fileName);
      
      if (document.fileUrl) {
        const canOpen = await Linking.canOpenURL(document.fileUrl);
        if (canOpen) {
          await Linking.openURL(document.fileUrl);
          console.log('✅ DocumentTable: Document opened successfully');
        } else {
          onViewDocument(document);
        }
      } else {
        onViewDocument(document);
      }
    } catch (error) {
      console.error('❌ DocumentTable: Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleViewSummary = (document: Document) => {
    if (onViewSummary) {
      onViewSummary(document);
    } else {
      Alert.alert(
        document.fileName,
        `Summary:\n${document.summary}\n\nType: ${document.docType}\nUploaded: ${document.uploadDate}\nSize: ${document.fileSize}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteDocument = async (document: Document) => {
    // For web, use a simpler confirmation approach
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete "${document.fileName}"?\n\nThis action cannot be undone.`);
      if (!confirmed) {
        return;
      }
    } else {
      Alert.alert(
        'Delete Document',
        `Are you sure you want to delete "${document.fileName}"?\n\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDelete(document);
            },
          },
        ]
      );
      return;
    }
    
    // For web, perform delete directly
    await performDelete(document);
  };

  const performDelete = async (document: Document) => {
    try {
      // Ensure Google Drive service is initialized
      if (!googleDriveService) {
        console.error('❌ Google Drive service not available');
        if (Platform.OS === 'web') {
          alert('Error: Google Drive service not available');
        } else {
          Alert.alert('Error', 'Google Drive service not available');
        }
        return;
      }
      
      const success = await googleDriveService.deleteFile(document.id);
      
      if (success) {
        if (Platform.OS === 'web') {
          alert('Document deleted successfully!');
        } else {
          Alert.alert('Success', 'Document deleted successfully!');
        }
        
        // Remove the document from local state immediately for better UX
        setRealDocuments(prevDocs => prevDocs.filter(doc => doc.id !== document.id));
        
        // Also refresh from server to ensure consistency
        await fetchDocuments();
      } else {
        console.error('❌ DocumentTable: Delete operation returned false');
        if (Platform.OS === 'web') {
          alert('Failed to delete document. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to delete document. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ DocumentTable: Error during deletion:', error);
      
      const errorMessage = `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowEditModal(true);
  };

  const handleSaveMetadata = async (
    documentId: string,
    metadata: { name: string; description: string; tags: string[]; category: string }
  ): Promise<boolean> => {
    try {
      console.log('✏️ DocumentTable: Updating metadata for document:', documentId);
      console.log('✏️ DocumentTable: Metadata to update:', metadata);
      
      const success = await googleDriveService.updateMetadata(documentId, metadata);
      console.log('✏️ DocumentTable: Update result:', success);
      
      if (success) {
        // Refresh the document list to show updated metadata
        await fetchDocuments();
        console.log('✅ DocumentTable: Metadata updated and list refreshed');
        return true;
      } else {
        console.error('❌ DocumentTable: Metadata update failed');
        return false;
      }
    } catch (error) {
      console.error('❌ DocumentTable: Error updating metadata:', error);
      return false;
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDocument(null);
  };

  const handleRowActivate = (id: string) => {
    setActiveRow(id);
    if (Platform.OS === 'web') {
      // On web, show context menu
      const document = realDocuments.find(doc => doc.id === id);
      if (document) {
        setSelectedDocument(document);
        // Position context menu at mouse position (simplified for now)
        setContextMenuPosition({ x: 100, y: 100 });
        setShowContextMenu(true);
      }
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (showContextMenu) {
      const handleClickOutside = () => {
        setShowContextMenu(false);
        setSelectedDocument(null);
      };
      
      // Add event listener for web
      if (Platform.OS === 'web') {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
      }
    }
  }, [showContextMenu]);

  const handleContextMenuAction = (action: 'view' | 'edit' | 'delete' | 'summary') => {
    if (!selectedDocument) return;
    
    setShowContextMenu(false);
    setSelectedDocument(null);
    
    switch (action) {
      case 'view':
        handleViewDocument(selectedDocument);
        break;
      case 'edit':
        handleEditDocument(selectedDocument);
        break;
      case 'delete':
        handleDeleteDocument(selectedDocument);
        break;
      case 'summary':
        handleViewSummary(selectedDocument);
        break;
    }
  };

  // Use real documents if available, otherwise fall back to props
  const displayDocuments = realDocuments.length > 0 ? realDocuments : documents;

  // Debug: Show current status
  const debugStatus = () => {
    const status = googleDriveService.getFolderStatus();
    console.log('🔍 DocumentTable Debug Status:', status);
    return status;
  };

  useEffect(() => {
    console.log('📋 DocumentTable: Component mounted');
    debugStatus();
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>📁 Loading documents...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to Load Documents</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDocuments}>
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={debugStatus}>
          <Text style={styles.debugButtonText}>🔍 Debug Status</Text>
        </TouchableOpacity>
        {error.includes('expired') && (
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => {
              // Force logout by clearing storage
              AsyncStorage.clear().then(() => {
                window.location.reload(); // For web
              });
            }}
          >
            <Text style={styles.logoutButtonText}>🚪 Force Logout</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (displayDocuments.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📁</Text>
        <Text style={styles.emptyStateText}>No documents found</Text>
        <Text style={styles.emptyStateSubtext}>Upload your first document to get started</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchDocuments}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Instructions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <Text style={styles.headerSubtitle}>
          {Platform.OS === 'web' 
            ? 'Right-click or long-press for more options' 
            : 'Swipe left or long-press for more options'
          }
        </Text>
      </View>

      <ScrollView style={styles.tableContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerText}>Document Name</Text>
          <Text style={styles.headerText}>Type</Text>
          <Text style={styles.headerText}>Upload Date</Text>
          <Text style={styles.headerText}>Actions</Text>
        </View>
        
        {displayDocuments.map((document) => (
          <SwipeableRow
            key={document.id}
            document={document}
            onView={handleViewDocument}
            onViewSummary={handleViewSummary}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            isActive={activeRow === document.id}
            onActivate={handleRowActivate}
            multiSelect={multiSelect}
            isSelected={selectedDocs?.some(doc => doc.id === document.id)}
            onSelect={onDocSelect}
            maxSelection={maxSelection}
            selectedCount={selectedDocs?.length}
          />
        ))}
      </ScrollView>

      {/* Context Menu for Web */}
      {showContextMenu && selectedDocument && (
        <View style={[styles.contextMenu, { left: contextMenuPosition.x, top: contextMenuPosition.y }]}>
          <TouchableOpacity
            style={styles.contextMenuItem}
            onPress={() => handleContextMenuAction('view')}
          >
            <Text style={styles.contextMenuText}>👁️ View Document</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contextMenuItem}
            onPress={() => handleContextMenuAction('summary')}
          >
            <Text style={styles.contextMenuText}>📋 View Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contextMenuItem}
            onPress={() => handleContextMenuAction('edit')}
          >
            <Text style={styles.contextMenuText}>✏️ Edit Metadata</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contextMenuItem, styles.contextMenuDelete]}
            onPress={() => handleContextMenuAction('delete')}
          >
            <Text style={[styles.contextMenuText, styles.contextMenuDeleteText]}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Metadata Edit Modal */}
      <MetadataEditModal
        visible={showEditModal}
        document={editingDocument}
        onClose={handleCloseEditModal}
        onSave={handleSaveMetadata}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    width: '100%',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
  },
  actionButtons: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  actionButton: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  editAction: {
    backgroundColor: '#4CAF50',
  },
  deleteAction: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: ACTION_WIDTH, // Make space for action buttons
  },
  fileNameCell: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  typeCell: {
    flex: 1,
  },
  docType: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dateCell: {
    flex: 1,
  },
  uploadDate: {
    fontSize: 12,
    color: '#666',
  },
  quickActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 10,
  },
  quickActionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 2,
  },
  quickActionText: {
    fontSize: 14,
  },
  viewButton: {
    backgroundColor: '#007AFF',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  contextMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contextMenuText: {
    fontSize: 16,
    color: '#333',
  },
  contextMenuDelete: {
    borderBottomWidth: 0,
  },
  contextMenuDeleteText: {
    color: '#dc3545',
  },
  selectCheckbox: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  checkboxCheckmark: {
    fontSize: 14,
    color: '#fff',
  },
  rowContentMultiSelect: {
    paddingLeft: 10,
  },
  fileNameCellMultiSelect: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  debugButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 