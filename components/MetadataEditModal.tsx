import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Document } from './DocumentTable';

interface MetadataEditModalProps {
  visible: boolean;
  document: Document | null;
  onClose: () => void;
  onSave: (documentId: string, metadata: {
    name: string;
    description: string;
    tags: string[];
    category: string;
  }) => Promise<boolean>;
}

export default function MetadataEditModal({
  visible,
  document,
  onClose,
  onSave,
}: MetadataEditModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document) {
      setName(document.fileName || '');
      setDescription(document.summary || '');
      setTags(document.tags?.join(', ') || '');
      setCategory(document.category || '');
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;

    setLoading(true);
    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const success = await onSave(document.id, {
        name,
        description,
        tags: tagsArray,
        category,
      });

      if (success) {
        Alert.alert('Success', 'Document metadata updated successfully!');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to update document metadata');
      }
    } catch (error) {
      console.error('Error updating metadata:', error);
      Alert.alert('Error', 'Failed to update document metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    onClose();
  };

  if (!document) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Document Metadata</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Document Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter document name..."
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter document description..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="e.g., important, work, personal"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g., Work, Personal, Medical"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>File Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type:</Text>
                <Text style={styles.infoValue}>{document.docType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Size:</Text>
                <Text style={styles.infoValue}>{document.fileSize}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Uploaded:</Text>
                <Text style={styles.infoValue}>
                  {new Date(document.uploadDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 