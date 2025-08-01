import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FileMetadata, googleDriveService } from '../utils/googleDriveService';

interface FileListProps {
  onFileSelect?: (file: FileMetadata) => void;
}

export default function FileList({ onFileSelect }: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const fileList = await googleDriveService.listFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
      
      // Check if it's a folder initialization error
      if (error instanceof Error && error.message.includes('not initialized')) {
        Alert.alert(
          'Setup Required',
          'Google Drive folders need to be initialized. Please try logging out and logging back in.',
          [
            { text: 'OK' },
            { text: 'Retry', onPress: loadFiles }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderFileItem = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => onFileSelect?.(item)}
    >
      <View style={styles.fileHeader}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
      </View>
      
      {item.description && (
        <Text style={styles.fileDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.fileMeta}>
        <Text style={styles.fileDate}>
          Created: {formatDate(item.createdTime)}
        </Text>
        {item.category && (
          <Text style={styles.fileCategory}>{item.category}</Text>
        )}
      </View>
      
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTags}>+{item.tags.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading files...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Files</Text>
      
      {files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No files uploaded yet</Text>
          <Text style={styles.emptySubtext}>
            Upload your first file to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fileItem: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  fileDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  fileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileDate: {
    fontSize: 12,
    color: '#666',
  },
  fileCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
}); 