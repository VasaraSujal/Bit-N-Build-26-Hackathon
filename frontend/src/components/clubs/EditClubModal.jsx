import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, RefreshCw, AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { ClubLogo } from './ClubLogo';
import { api } from '../../lib/api';
import { useToast } from '../../context/useToast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const EditClubModal = ({ isOpen, onClose, club, onSuccess }) => {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });

  // Action mode for logo: 'keep' | 'url' | 'upload' | 'remove'
  const [logoAction, setLogoAction] = useState('keep');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (club && isOpen) {
      setFormData({
        name: club.name || '',
        description: club.description || '',
        logoUrl: club.logoUrl || ''
      });
      setLogoAction('keep');
      setSelectedFile(null);
      setFilePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setErrors({});
    }
  }, [club, isOpen]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        logo: 'Please select a JPG, PNG, or WebP image.'
      }));
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        logo: 'Image size must be less than 5 MB.'
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, logo: null, logoUrl: null }));
    setSelectedFile(file);

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSelectedFile = () => {
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

  const handleActionChange = (action) => {
    if (action === logoAction) return;

    if (action === 'url') {
      handleRemoveSelectedFile();
      setLogoAction('url');
    } else if (action === 'upload') {
      setFormData((prev) => ({ ...prev, logoUrl: '' }));
      setErrors((prev) => ({ ...prev, logoUrl: null }));
      setLogoAction('upload');
    } else if (action === 'remove') {
      handleRemoveSelectedFile();
      setFormData((prev) => ({ ...prev, logoUrl: '' }));
      setErrors((prev) => ({ ...prev, logoUrl: null, logo: null }));
      setLogoAction('remove');
    } else {
      // keep
      handleRemoveSelectedFile();
      setFormData((prev) => ({ ...prev, logoUrl: club?.logoUrl || '' }));
      setErrors((prev) => ({ ...prev, logoUrl: null, logo: null }));
      setLogoAction('keep');
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

    // Mutual exclusivity
    if (logoAction === 'url' && formData.logoUrl && selectedFile) {
      errs.logo = 'Choose either a logo URL or upload a local image, not both.';
    }

    if (logoAction === 'url') {
      if (!formData.logoUrl || !formData.logoUrl.trim()) {
        errs.logoUrl = 'Please enter a valid URL or select Keep/Remove';
      } else {
        try {
          const parsed = new URL(formData.logoUrl.trim());
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            errs.logoUrl = 'Please enter a valid HTTP or HTTPS URL';
          }
        } catch {
          errs.logoUrl = 'Please enter a valid URL (e.g. https://example.com/logo.png)';
        }
      }
    }

    if (logoAction === 'upload') {
      if (!selectedFile) {
        errs.logo = 'Please choose an image to upload or select another option.';
      } else if (!ALLOWED_TYPES.includes(selectedFile.type)) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !club?.id) return;

    setIsSubmitting(true);
    try {
      let res;
      if (logoAction === 'upload' && selectedFile) {
        const uploadData = new FormData();
        uploadData.append('name', formData.name.trim());
        uploadData.append('description', formData.description ? formData.description.trim() : '');
        uploadData.append('logo', selectedFile);

        res = await api.put(`clubs/${club.id}`, uploadData);
      } else {
        const payload = {
          name: formData.name.trim(),
          description: formData.description ? formData.description.trim() : null
        };

        if (logoAction === 'remove') {
          payload.removeLogo = true;
          payload.logoUrl = null;
        } else if (logoAction === 'url') {
          payload.logoUrl = formData.logoUrl.trim();
        } else {
          // keep existing logo
          payload.logoUrl = club.logoUrl || null;
        }

        res = await api.put(`clubs/${club.id}`, payload);
      }

      success(res.message || 'Club updated successfully.');
      onSuccess?.(res.data?.club);
      onClose();
    } catch (err) {
      if (err.status === 409) {
        setErrors((prev) => ({ ...prev, name: 'Another club with this name already exists' }));
      } else if (err.status === 413) {
        setErrors((prev) => ({ ...prev, logo: 'Image size must be less than 5 MB.' }));
      } else if (err.status === 400 && err.message?.includes('either a logo URL or upload a local image')) {
        setErrors((prev) => ({ ...prev, logo: 'Choose either a logo URL or upload a local image, not both.' }));
      } else {
        toastError(err.message || 'Failed to update club. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Club Details"
      description={`Update metadata and profile for ${club?.name || 'this club'}.`}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
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
            Save Changes
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
          helperText="Max 500 characters."
        />

        {/* Club Logo Management Section */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-content-primary">
              Club Logo
            </label>
            {club?.logoUrl && (
              <span className="text-[11px] text-content-muted">Has active logo</span>
            )}
          </div>

          {/* Current Logo Display */}
          {club?.logoUrl && (
            <div className="p-3 bg-surface-muted/50 border border-border rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ClubLogo logoUrl={club.logoUrl} name={club.name} size="md" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-content-primary block">Current Logo</span>
                  <span className="text-[11px] text-content-muted truncate block max-w-xs">{club.logoUrl}</span>
                </div>
              </div>
              {logoAction !== 'remove' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-danger hover:bg-danger-subtle shrink-0"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleActionChange('remove')}
                >
                  Remove
                </Button>
              ) : (
                <span className="text-xs text-danger font-medium shrink-0">Marked for removal</span>
              )}
            </div>
          )}

          {/* Logo Option Buttons */}
          <div className="space-y-1.5">
            <p className="text-xs text-content-secondary">
              {club?.logoUrl ? 'Change or replace logo:' : 'Add a club logo:'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {club?.logoUrl && (
                <button
                  type="button"
                  onClick={() => handleActionChange('keep')}
                  disabled={isSubmitting}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all text-left ${
                    logoAction === 'keep'
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                      : 'border-border bg-surface hover:bg-surface-muted text-content-secondary'
                  }`}
                >
                  <span className="block font-semibold">Keep Existing</span>
                  <span className="text-[10px] opacity-75">No changes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleActionChange('url')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg border text-xs font-medium transition-all text-left ${
                  logoAction === 'url'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                    : 'border-border bg-surface hover:bg-surface-muted text-content-secondary'
                }`}
              >
                <span className="block font-semibold">Logo URL</span>
                <span className="text-[10px] opacity-75">Direct link</span>
              </button>

              <button
                type="button"
                onClick={() => handleActionChange('upload')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg border text-xs font-medium transition-all text-left ${
                  logoAction === 'upload'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                    : 'border-border bg-surface hover:bg-surface-muted text-content-secondary'
                }`}
              >
                <span className="block font-semibold">Upload Image</span>
                <span className="text-[10px] opacity-75">JPG, PNG, WebP</span>
              </button>
            </div>
          </div>

          {/* URL Input Mode */}
          {logoAction === 'url' && (
            <div className="space-y-3 pt-2">
              <Input
                label="New Logo URL"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                error={errors.logoUrl}
                disabled={isSubmitting}
                helperText="Paste a direct link to the replacement club logo."
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
                    <span className="text-xs font-medium text-content-primary block">Replacement Preview</span>
                    <span className="text-[11px] text-content-muted truncate block">{formData.logoUrl}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Image Mode */}
          {logoAction === 'upload' && (
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
                  <p className="text-xs font-semibold text-content-primary">Upload replacement logo</p>
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
                      onClick={handleRemoveSelectedFile}
                      disabled={isSubmitting}
                    >
                      Remove
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

          {/* Remove Logo Confirmation Message */}
          {logoAction === 'remove' && (
            <div className="p-3 bg-danger-subtle/30 border border-danger-border rounded-lg text-xs text-danger flex items-center justify-between">
              <span>Current logo will be removed upon saving.</span>
              <button
                type="button"
                onClick={() => handleActionChange('keep')}
                className="text-xs font-semibold hover:underline"
              >
                Undo
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default EditClubModal;
