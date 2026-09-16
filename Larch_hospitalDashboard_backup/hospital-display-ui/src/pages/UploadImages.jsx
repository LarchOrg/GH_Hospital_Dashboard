import React, { useState, useEffect, useCallback } from 'react';
import Loader from '../components/common/Loader';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import { useLanguage } from '../hooks/useLanguage';
import { dashboardImageApi, resolveAssetUrl } from '../api/apiClient';

const MAX_IMAGES_PER_UPLOAD = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Staff screen for managing the images that appear full-screen on the
 * public TV dashboard, right after each safety awareness message.
 * Supports selecting up to 6 images at once (or a single image), and
 * shows/deletes whatever is currently live on the dashboard.
 */
export default function UploadImages() {
  const { t } = useLanguage();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const closeToast = useCallback(() => setToast({ message: '', type: 'success' }), []);

  const loadImages = useCallback(async () => {
    try {
      const response = await dashboardImageApi.getAll();
      setImages(response.data || []);
    } catch (err) {
      console.error('Failed to load dashboard images:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const applySelection = (fileList) => {
    const files = Array.from(fileList || []);
    setError('');

    if (files.length === 0) return;

    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      setError(t('images.tooMany').replace('{max}', MAX_IMAGES_PER_UPLOAD));
      setSelectedFiles([]);
      return;
    }

    const invalidFile = files.find(
      (file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE_BYTES
    );
    if (invalidFile) {
      setError(t('images.invalidFile'));
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(files);
  };

  const handleFileInputChange = (e) => {
    applySelection(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    applySelection(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      await dashboardImageApi.upload(formData);

      setToast({ message: t('images.uploadSuccess'), type: 'success' });
      setSelectedFiles([]);
      const input = document.getElementById('dashboard-image-input');
      if (input) input.value = '';
      await loadImages();
    } catch (err) {
      setToast({ message: err.message || t('images.uploadFailed'), type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (confirmDeleteId === null) return;
    try {
      await dashboardImageApi.remove(confirmDeleteId);
      setToast({ message: t('images.deleteSuccess'), type: 'success' });
      await loadImages();
    } catch (err) {
      setToast({ message: err.message || t('images.deleteFailed'), type: 'error' });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="image-upload-page">
        <Loader label={t('images.loading')} />
      </div>
    );
  }

  return (
    <div className="image-upload-page">
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />

      <div className="image-upload-layout">
        <div className="image-upload-card">
          <div className="image-upload-card-header">
            <h2>{t('images.title')}</h2>
            <p className="image-upload-subtitle">{t('images.subtitle')}</p>
          </div>

          <div className="image-upload-card-body">
            <label
              htmlFor="dashboard-image-input"
              className={`image-upload-dropzone ${isDragOver ? 'is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <i className="bi bi-cloud-arrow-up-fill" aria-hidden="true" />
              <span>{t('images.chooseFiles')}</span>
              <small>{t('images.chooseFilesHint')}</small>
              <input
                id="dashboard-image-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFileInputChange}
                hidden
              />
            </label>

            {selectedFiles.length > 0 && (
              <>
                <div className="image-upload-selected-count">
                  {t('images.selectedCount').replace('{count}', selectedFiles.length)}
                </div>
                <ul className="image-upload-selected-list">
                  {selectedFiles.map((file) => (
                    <li key={file.name}>
                      <i className="bi bi-image" aria-hidden="true" />
                      {file.name}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {error && <div className="alert alert-danger mt-2 mb-0">{error}</div>}

            <button
              type="button"
              className="btn btn-primary btn-lg image-upload-submit-btn"
              disabled={selectedFiles.length === 0 || uploading}
              onClick={handleUpload}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  {t('images.uploading')}
                </>
              ) : (
                <>
                  <i className="bi bi-upload me-2" aria-hidden="true" />
                  {t('images.uploadButton')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="image-gallery-card">
          <div className="image-gallery-header">
            <h3>{t('images.galleryTitle')}</h3>
            <span className="image-gallery-count">
              {images.length} {t('images.galleryCountSuffix')}
            </span>
          </div>

          {images.length === 0 ? (
            <div className="image-gallery-empty">
              <i className="bi bi-images" aria-hidden="true" />
              <p>{t('images.galleryEmpty')}</p>
            </div>
          ) : (
            <div className="image-gallery-grid">
              {images.map((image) => (
                <div className="image-gallery-item" key={image.imageId}>
                  <img src={resolveAssetUrl(image.imageUrl)} alt={image.originalName || ''} />
                  <button
                    type="button"
                    className="image-gallery-delete-btn"
                    onClick={() => setConfirmDeleteId(image.imageId)}
                    aria-label={t('images.delete')}
                    title={t('images.delete')}
                  >
                    <i className="bi bi-trash3-fill" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        show={confirmDeleteId !== null}
        title={t('images.confirmDeleteTitle')}
        message={t('images.confirmDeleteMessage')}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
