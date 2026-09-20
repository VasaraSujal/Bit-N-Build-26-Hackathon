import React, { useState, useRef } from 'react';
import { Upload, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const CreateClubModal = ({ isOpen, onClose, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });

  // 'none' | 'url' | 'upload'
  const [logoMode, setLogoMode] = useState('none');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        logo: 'Please select a JPG, PNG, or WebP image.'
      }));
      return;
    }

    // Validate File Size
    if (file.size > MAX_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        logo: 'Image size must be less than 5 MB.'
      }));
      return;
    }

    // Clear previous error
    setErrors((prev) => ({ ...prev, logo: null, logoUrl: null }));
    setSelectedFile(file);

    // Create object URL for preview
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    // Reset file input value so re-selecting same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setErrors((prev) => ({ ...prev, logo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModeChange = (mode) => {
    if (mode === logoMode) return;

    if (mode === 'url') {
      handleRemoveFile();
      setLogoMode('url');
    } else if (mode === 'upload') {
      setFormData((prev) => ({ ...prev, logoUrl: '' }));
      setErrors((prev) => ({ ...prev, logoUrl: null }));
      setLogoMode('upload');
    } else {
      handleRemoveFile();
      setFormData((prev) => ({ ...prev, logoUrl: '' }));
      setErrors((prev) => ({ ...prev, logoUrl: null, logo: null }));
      setLogoMode('none');
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Club name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Club name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      errs.name = 'Club name cannot exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errs.description = 'Description cannot exceed 500 characters';
    }

    // Mutual exclusivity validation
    if (logoMode === 'url' && formData.logoUrl && selectedFile) {
      errs.logo = 'Choose either a logo URL or upload a local image, not both.';
    }

    if (logoMode === 'url' && formData.logoUrl && formData.logoUrl.trim()) {
      try {
        const parsed = new URL(formData.logoUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errs.logoUrl = 'Please enter a valid HTTP or HTTPS URL';
        }
      } catch {
        errs.logoUrl = 'Please enter a valid URL (e.g. https://example.com/logo.png)';
      }
    }

    if (logoMode === 'upload' && selectedFile) {
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        errs.logo = 'Please select a JPG, PNG, or WebP image.';
      } else if (selectedFile.size > MAX_SIZE_BYTES) {
        errs.logo = 'Image size must be less than 5 MB.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleReset = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFormData({ name: '', description: '', logoUrl: '' });
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setLogoMode('none');
    setErrors({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let res;
      if (logoMode === 'upload' && selectedFile) {
        const uploadData = new FormData();
        uploadData.append('name', formData.name.trim());
        if (formData.description.trim()) {
          uploadData.append('description', formData.description.trim());
        }
        uploadData.append('logo', selectedFile);

        res = await api.post('clubs', uploadData);
      } else {
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          logoUrl: (logoMode === 'url' && formData.logoUrl.trim()) ? formData.logoUrl.trim() : undefined
        };
        res = await api.post('clubs', payload);
      }

      success(res.message || 'Club created successfully.');
      handleReset();
      onSuccess?.(res.data?.club);
      onClose();
    } catch (err) {
      if (err.status === 409) {
        setErrors((prev) => ({ ...prev, name: 'A club with this name already exists' }));
      } else if (err.status === 413) {
        setErrors((prev) => ({ ...prev, logo: 'Image size must be less than 5 MB.' }));
      } else if (err.status === 400 && err.message?.includes('either a logo URL or upload a local image')) {
        setErrors((prev) => ({ ...prev, logo: 'Choose either a logo URL or upload a local image, not both.' }));
      } else {
        toastError(err.message || 'Failed to create club. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Club"
      description="Register a new student club to start organizing events and volunteer activities."
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Create Club
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input
          label="Club Name"
          required
          placeholder="e.g. Developer Student Club"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          maxLength={100}
        />

        <Textarea
          label="Description"
          placeholder="Brief description of the club's focus and mission..."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          error={errors.description}
          disabled={isSubmitting}
          rows={3}
          helperText="Optional. Max 500 characters."
        />

        {/* Club Logo Section */}
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-content-primary">
              Club Logo
            </label>
            <span className="text-[11px] text-content-muted">Optional</span>
          </div>

          <p className="text-xs text-content-secondary">
            Choose how you want to add the club logo:
          </p>

          {/* Mode Selector Radio Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleModeChange(logoMode === 'url' ? 'none' : 'url')}
              disabled={isSubmitting}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                logoMode === 'url'
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                  : 'border-border bg-surface hover:bg-surface-muted text-content-secondary'
              }`}
            >
              <input
                type="radio"
                name="logoMode"
                checked={logoMode === 'url'}
                onChange={() => handleModeChange('url')}
                className="w-3.5 h-3.5 text-primary focus:ring-primary"
              />
              <div className="min-w-0">
                <span className="block font-semibold">Logo URL</span>
                <span className="text-[10px] opacity-75 truncate block">Web link</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange(logoMode === 'upload' ? 'none' : 'upload')}
              disabled={isSubmitting}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left ${
                logoMode === 'upload'
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                  : 'border-border bg-surface hover:bg-surface-muted text-content-secondary'
              }`}
            >
              <input
                type="radio"
                name="logoMode"
                checked={logoMode === 'upload'}
                onChange={() => handleModeChange('upload')}
                className="w-3.5 h-3.5 text-primary focus:ring-primary"
              />
              <div className="min-w-0">
                <span className="block font-semibold">Upload Image</span>
                <span className="text-[10px] opacity-75 truncate block">JPG, PNG, WebP</span>
              </div>
            </button>
          </div>

          {/* Mode 1: URL Input */}
          {logoMode === 'url' && (
            <div className="space-y-3 pt-2">
              <Input
                label="Logo URL"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                error={errors.logoUrl}
                disabled={isSubmitting}
                helperText="Paste a direct link to the club logo or badge."
              />

              {formData.logoUrl && !errors.logoUrl && (
                <div className="p-3 bg-surface-muted/50 border border-border rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={formData.logoUrl}
                      alt="URL Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-content-primary block">Live URL Preview</span>
                    <span className="text-[11px] text-content-muted truncate block">{formData.logoUrl}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Local Upload */}
          {logoMode === 'upload' && (
            <div className="space-y-2 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    errors.logo
                      ? 'border-danger bg-danger-subtle/20'
                      : 'border-border hover:border-primary hover:bg-surface-muted/50'
                  }`}
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-content-primary">Upload club logo</p>
                  <p className="text-[11px] text-content-secondary mt-0.5">JPG, PNG or WebP &bull; Max 5 MB</p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs pointer-events-none"
                    >
                      Choose Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-surface-muted/60 border border-border rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    {filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-border shrink-0 shadow-subtle"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                        <ImageIcon className="w-6 h-6 text-content-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-content-primary truncate break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-content-muted">
                        {formatFileSize(selectedFile.size)} &bull; {selectedFile.type.replace('image/', '').toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs flex-1 justify-center"
                      icon={<RefreshCw className="w-3 h-3" />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      Change Image
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-danger hover:bg-danger-subtle flex-1 justify-center"
                      icon={<X className="w-3 h-3" />}
                      onClick={handleRemoveFile}
                      disabled={isSubmitting}
                    >
                      Remove Image
                    </Button>
                  </div>
                </div>
              )}

              {errors.logo && (
                <p className="text-xs text-danger flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.logo}
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CreateClubModal;
