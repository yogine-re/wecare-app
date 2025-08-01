import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import BottomNavigation, { TabType } from '../../components/BottomNavigation';
import { Document } from '../../components/DocumentTable';
import SharePage from '../../components/SharePage';
import UploadPage from '../../components/UploadPage';
import { useAuth } from '../../contexts/AuthContext';
import { googleDriveService } from '../../utils/googleDriveService';

const { width: screenWidth } = Dimensions.get('window');

// Document categories
const documentCategories = [
  { id: 'prescriptions', label: 'Prescriptions', icon: '💊', color: '#4CAF50' },
  { id: 'lab-reports', label: 'Lab Reports', icon: '🧪', color: '#2196F3' },
  { id: 'medical-records', label: 'Medical Records', icon: '❤️', color: '#F44336' },
  { id: 'others', label: 'Others', icon: '📄', color: '#9C27B0' },
];

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeCategory, setActiveCategory] = useState('prescriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userToken, userInfo } = useAuth();

  // Get user name for display
  const userName = userInfo?.name || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  // Fetch documents from Google Drive
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const files = await googleDriveService.listFiles();
      
      // Transform FileMetadata to Document format
      const transformedDocuments: Document[] = files.map(file => ({
        id: file.id,
        fileName: file.name,
        uploadDate: new Date(file.createdTime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        docType: file.mimeType.includes('pdf') ? 'PDF' : 
                file.mimeType.includes('image') ? 'JPG' : 'DOC',
        summary: file.description || 'No description available',
        fileSize: file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown',
        fileUrl: `https://drive.google.com/file/d/${file.id}/view`,
        tags: file.tags || [],
        category: file.category || 'others'
      }));
      
      setDocuments(transformedDocuments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'home') {
      fetchDocuments();
    }
  }, [activeTab]);

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    // Refresh documents when switching to home tab
    if (tab === 'home') {
      fetchDocuments();
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleViewDocument = (document: Document) => {
    Alert.alert(
      'View Document',
      `Document: ${document.fileName}\n\nThis document should open in Google Drive or your default viewer.`,
      [{ text: 'OK' }]
    );
  };

  const handleViewSummary = (document: Document) => {
    Alert.alert(
      document.fileName,
      `Summary:\n${document.summary}\n\nType: ${document.docType}\nUploaded: ${document.uploadDate}\nSize: ${document.fileSize}`,
      [{ text: 'OK' }]
    );
  };

  const handleRefreshDocuments = () => {
    fetchDocuments();
  };

  const handleUploadPress = () => {
    setActiveTab('upload');
  };

  const handleUploadComplete = () => {
    // Refresh documents when returning from upload
    fetchDocuments();
    setActiveTab('home');
  };

  const handleDocumentAction = async (documentId: string, action: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;

    switch (action) {
      case 'view':
        if (document.fileUrl) {
          Alert.alert('View Document', 'Opening document in browser...');
          // You can add Linking.openURL(document.fileUrl) here
        } else {
          Alert.alert('View Document', 'Document link not available');
        }
        break;
      case 'edit':
        Alert.alert('Edit Document', 'Opening edit mode...');
        break;
      case 'share':
        Alert.alert('Share Document', 'Opening share options...');
        break;
      case 'delete':
        Alert.alert(
          'Delete Document',
          'Are you sure you want to delete this document?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: async () => {
                try {
                  await googleDriveService.deleteFile(documentId);
                  Alert.alert('Success', 'Document deleted successfully');
                  fetchDocuments(); // Refresh the list
                } catch (err) {
                  Alert.alert('Error', 'Failed to delete document');
                }
              }
            }
          ]
        );
        break;
    }
  };

  // Filter documents based on category and search query
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'others') {
      // Show documents that don't match any specific category
      const hasSpecificCategory = doc.category && ['prescriptions', 'lab-reports', 'medical-records'].includes(doc.category);
      return matchesSearch && !hasSpecificCategory;
    } else {
      // Show documents that match the selected category
      return matchesSearch && doc.category === activeCategory;
    }
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <View style={styles.homeContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search documents or doctors..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {/* Category Tabs */}
            <View style={styles.categoryContainer}>
              {documentCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryTab,
                    activeCategory === category.id && styles.activeCategoryTab
                  ]}
                  onPress={() => handleCategoryPress(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    activeCategory === category.id && styles.activeCategoryLabel
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Document List */}
            <ScrollView style={styles.documentList} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.centerContent}>
                  <Text style={styles.loadingText}>Loading documents...</Text>
                </View>
              ) : error ? (
                <View style={styles.centerContent}>
                  <Text style={styles.errorText}>Error: {error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={fetchDocuments}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredDocuments.length === 0 ? (
                <View style={styles.centerContent}>
                  <Text style={styles.emptyText}>No documents found</Text>
                  <Text style={styles.emptySubtext}>Upload your first document to get started</Text>
                </View>
              ) : (
                filteredDocuments.map((document) => (
                  <View key={document.id} style={styles.documentCard}>
                    <View style={styles.documentHeader}>
                      <View style={styles.documentIcon}>
                        <Text style={styles.documentIconText}>
                          {document.docType === 'PDF' ? '📄' : 
                           document.docType === 'JPG' || document.docType === 'PNG' ? '🖼️' : '📄'}
                        </Text>
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentTitle}>{document.fileName}</Text>
                        <View style={styles.documentMeta}>
                          <View style={[styles.fileTypeTag, { backgroundColor: document.docType === 'PDF' ? '#F44336' : '#4CAF50' }]}>
                            <Text style={styles.fileTypeText}>{document.docType}</Text>
                          </View>
                          <Text style={styles.fileSize}>{document.fileSize}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.documentActions}
                        onPress={() => Alert.alert(
                          'Document Actions',
                          'Choose an action',
                          [
                            { text: 'View', onPress: () => handleDocumentAction(document.id, 'view') },
                            { text: 'Edit', onPress: () => handleDocumentAction(document.id, 'edit') },
                            { text: 'Share', onPress: () => handleDocumentAction(document.id, 'share') },
                            { text: 'Delete', style: 'destructive', onPress: () => handleDocumentAction(document.id, 'delete') },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        )}
                      >
                        <Text style={styles.actionIcon}>⋮</Text>
                      </TouchableOpacity>
                    </View>
                                          <View style={styles.documentFooter}>
                        <View style={styles.dateInfo}>
                          <Text style={styles.dateIcon}>📅</Text>
                          <Text style={styles.dateText}>{document.uploadDate}</Text>
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileIcon}>📁</Text>
                          <Text style={styles.fileText}>{document.fileSize}</Text>
                        </View>
                      </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        );
      case 'upload':
        return <UploadPage onNavigateToHomeTab={handleUploadComplete} />;
      case 'share':
        return <SharePage />;
      case 'ask':
        return (
          <View style={styles.placeholderContent}>
            <Text style={styles.placeholderText}>💬 Chat & Ask</Text>
            <Text style={styles.placeholderSubtext}>Chat with AI assistant about your health documents</Text>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.placeholderContent}>
            <Text style={styles.placeholderText}>👤 Profile</Text>
            <Text style={styles.placeholderSubtext}>Manage your account settings and preferences</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Top Header */}
      <View style={styles.customHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>We</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Documents</Text>
            <Text style={styles.headerSubtitle}>Manage my documents</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPress}>
            <Text style={styles.uploadIcon}>+</Text>
          </TouchableOpacity>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>{userInitials}</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginHorizontal: 2,
  },
  activeCategoryTab: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  categoryIcon: {
    fontSize: 12,
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  activeCategoryLabel: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  documentList: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentIconText: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  fileTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  documentActions: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 18,
    color: '#666',
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  doctorName: {
    fontSize: 12,
    color: '#666',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  fileText: {
    fontSize: 12,
    color: '#666',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
