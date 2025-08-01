import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DocumentTable, { Document } from './DocumentTable';

interface SharePageProps {}

interface ShareOption {
  id: string;
  title: string;
  icon: string;
  description: string;
}

const SHARE_OPTIONS: ShareOption[] = [
  {
    id: 'email',
    title: 'Email',
    icon: '📧',
    description: 'Send via email with attachments',
  },
  {
    id: 'sms',
    title: 'SMS',
    icon: '💬',
    description: 'Send via text message',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    icon: '📱',
    description: 'Send via WhatsApp',
  },
  {
    id: 'native',
    title: 'Share',
    icon: '📤',
    description: 'Use native share options',
  },
];

const MAX_SHARE_SELECTION = 2;

export default function SharePage({}: SharePageProps) {
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [smsData, setSmsData] = useState({ phone: '', message: '' });

  const handleDocSelect = (doc: Document, isSelected: boolean) => {
    if (isSelected && selectedDocs.length >= MAX_SHARE_SELECTION) {
      Alert.alert('Selection Limit', `You can only select up to ${MAX_SHARE_SELECTION} documents at a time.`);
      return;
    }

    if (isSelected) {
      setSelectedDocs([...selectedDocs, doc]);
    } else {
      setSelectedDocs(selectedDocs.filter(d => d.id !== doc.id));
    }
  };

  const handleShare = () => {
    if (selectedDocs.length === 0) {
      Alert.alert('No Documents Selected', 'Please select at least one document to share.');
      return;
    }
    setShowShareModal(true);
  };

  const handleShareOption = (option: ShareOption) => {
    setShowShareModal(false);
    
    switch (option.id) {
      case 'email':
        setShowEmailForm(true);
        break;
      case 'sms':
        setShowSMSForm(true);
        break;
      case 'whatsapp':
        setShowSMSForm(true);
        break;
      case 'native':
        handleNativeShare();
        break;
    }
  };

  const handleNativeShare = async () => {
    try {
      const result = await Share.share({
        title: 'Shared Documents',
        message: `Sharing ${selectedDocs.length} document(s): ${selectedDocs.map(d => d.fileName).join(', ')}`,
        url: 'https://wecare-app.com', // Placeholder URL
      });
      
      if (result.action === Share.sharedAction) {
        Alert.alert('Success', 'Documents shared successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share documents');
    }
  };

  const handleEmailShare = () => {
    if (!emailData.to.trim()) {
      Alert.alert('Error', 'Please enter a recipient email address.');
      return;
    }

    const subject = emailData.subject || 'Shared Documents from WeCare';
    // Compose links for selected docs
    const docLinks = selectedDocs.map((doc, idx) =>
      `${idx + 1}. ${doc.fileName}${doc.fileUrl ? `: ${doc.fileUrl}` : ''}`
    ).join('\n');
    const note =
      'Note: Attachments are not supported via web email. Please use the links below to access the documents.';
    const body =
      (emailData.body ? emailData.body + '\n\n' : '') +
      note +
      '\n\n' +
      docLinks;

    const mailtoUrl = `mailto:${emailData.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (Platform.OS === 'web') {
      window.open(mailtoUrl, '_blank');
    } else {
      Alert.alert('Email', 'Opening email app...');
    }

    setShowEmailForm(false);
    setEmailData({ to: '', subject: '', body: '' });
  };

  const handleSMSShare = () => {
    if (!smsData.phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number.');
      return;
    }

    const message = smsData.message || `I'm sharing ${selectedDocs.length} document(s) with you.`;
    const phone = smsData.phone.replace(/\D/g, ''); // Remove non-digits
    
    if (Platform.OS === 'web') {
      // For web, you might want to use a different approach
      Alert.alert('SMS', 'SMS sharing is not available on web. Please use mobile app.');
    } else {
      // For mobile, use SMS URL scheme
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
      // You would need to implement opening the SMS app
      Alert.alert('SMS', 'Opening SMS app...');
    }
    
    setShowSMSForm(false);
    setSmsData({ phone: '', message: '' });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Share Documents</Text>
          <Text style={styles.subtitle}>Select up to {MAX_SHARE_SELECTION} documents to share</Text>
        </View>

        {/* Selection Info */}
        {selectedDocs.length > 0 && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedDocs.length} of {MAX_SHARE_SELECTION} documents selected
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share Selected</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Document Table with Multi-Select */}
        <View style={styles.tableSection}>
          <DocumentTable
            documents={[]} // Will be populated with real data
            onViewDocument={(doc) => {
              console.log('View document:', doc);
            }}
            onViewSummary={(doc) => {
              console.log('View summary:', doc);
            }}
            onRefresh={() => {
              console.log('Refresh documents');
            }}
            multiSelect={true}
            selectedDocs={selectedDocs}
            onDocSelect={handleDocSelect}
            maxSelection={MAX_SHARE_SELECTION}
          />
        </View>
      </ScrollView>

      {/* Share Options Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Documents</Text>
              <TouchableOpacity
                onPress={() => setShowShareModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Choose how you want to share {selectedDocs.length} document(s)
              </Text>
              
              <View style={styles.shareOptionsGrid}>
                {SHARE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.shareOptionCard}
                    onPress={() => handleShareOption(option)}
                  >
                    <Text style={styles.shareOptionIcon}>{option.icon}</Text>
                    <Text style={styles.shareOptionTitle}>{option.title}</Text>
                    <Text style={styles.shareOptionDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Form Modal */}
      <Modal
        visible={showEmailForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share via Email</Text>
              <TouchableOpacity
                onPress={() => setShowEmailForm(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>To:</Text>
              <TextInput
                style={styles.input}
                value={emailData.to}
                onChangeText={(text) => setEmailData({ ...emailData, to: text })}
                placeholder="Enter email address"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Subject:</Text>
              <TextInput
                style={styles.input}
                value={emailData.subject}
                onChangeText={(text) => setEmailData({ ...emailData, subject: text })}
                placeholder="Enter subject"
              />

              <Text style={styles.label}>Message:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={emailData.body}
                onChangeText={(text) => setEmailData({ ...emailData, body: text })}
                placeholder="Enter your message"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowEmailForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.sendButton]}
                onPress={handleEmailShare}
              >
                <Text style={styles.sendButtonText}>Send Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SMS Form Modal */}
      <Modal
        visible={showSMSForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSMSForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share via SMS/WhatsApp</Text>
              <TouchableOpacity
                onPress={() => setShowSMSForm(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>Phone Number:</Text>
              <TextInput
                style={styles.input}
                value={smsData.phone}
                onChangeText={(text) => setSmsData({ ...smsData, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Message:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={smsData.message}
                onChangeText={(text) => setSmsData({ ...smsData, message: text })}
                placeholder="Enter your message"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowSMSForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.sendButton]}
                onPress={handleSMSShare}
              >
                <Text style={styles.sendButtonText}>Send</Text>
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tableSection: {
    flex: 1,
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  shareOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  shareOptionCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  shareOptionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  shareOptionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sendButton: {
    backgroundColor: '#28a745',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 