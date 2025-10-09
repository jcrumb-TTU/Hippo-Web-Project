// API base URL
const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:5257';
const USE_COOKIES = true;

// LocalStorage keys
const STORAGE_KEYS = {
    DRAFT: 'add_item_draft',
    DRAFT_TIMESTAMP: 'add_item_draft_timestamp',
    DRAFT_IMAGES: 'add_item_draft_images'
};

// Application state
const AppState = {
    selectedFiles: new DataTransfer(),
    maintenanceTags: new Set(),
    isSubmitting: false,
    hasUnsavedChanges: false,
    autosaveInterval: null,
    validationErrors: new Map(),
    lastAutosave: null
};

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility functions
const Utils = {
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    validateWordCount(text, max) {
        const words = text.trim().split(/\s+/);
        return words.length <= max && words[0] !== '';
    },

    showError(message) {
        this.showToast(message, 'danger');
    },

    showSuccess(message) {
        this.showToast(message, 'success');
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg`;
        toast.style.cssText = `
            z-index: 9999;
            min-width: 300px;
            border-radius: 8px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideDown 0.3s ease;
            font-weight: 500;
        `;

        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            danger: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        };

        const iconHtml = icons[type] || icons.info;
        toast.innerHTML = `${iconHtml}<span>${message}</span>`;

        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -100%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                }
                @keyframes slideUp {
                    from {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                    to {
                        opacity: 0;
                        transform: translate(-50%, -100%);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus({ preventScroll: true });
    }
};

// DOM Elements
const elements = {
    form: document.getElementById('itemForm'),
    imageInput: document.getElementById('itemImages'),
    dropZone: document.getElementById('dropZone'),
    imagePreview: document.getElementById('imagePreview'),
    imageAlert: document.getElementById('imageAlert'),
    imageCounter: document.getElementById('imageCounter'),
    imageCounterText: document.getElementById('imageCounterText'),
    imageCounterBadge: document.getElementById('imageCounterBadge'),
    itemDescription: document.getElementById('itemDescription'),
    itemDescCount: document.getElementById('itemDescCount'),
    itemCategory: document.getElementById('itemCategory'),
    itemPrice: document.getElementById('itemPrice'),
    maintenanceFrequency: document.getElementById('maintenanceFrequency'),
    maintenanceTagInput: document.getElementById('maintenanceTagInput'),
    addTagBtn: document.getElementById('addTagBtn'),
    maintenanceTagsContainer: document.getElementById('maintenanceTags'),
    cancelBtn: document.getElementById('cancelBtn'),
    submitBtn: document.getElementById('submitBtn'),
    submitText: document.getElementById('submitText'),
    submitSpinner: document.getElementById('submitSpinner'),
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    validationSummary: document.getElementById('validationSummary'),
    validationList: document.getElementById('validationList'),
    draftBanner: document.getElementById('draftBanner'),
    resumeDraftBtn: document.getElementById('resumeDraftBtn'),
    discardDraftBtn: document.getElementById('discardDraftBtn'),
    autosaveIndicator: document.getElementById('autosaveIndicator'),
    autosaveText: document.getElementById('autosaveText'),
    networkStatus: document.getElementById('networkStatus'),
    networkStatusText: document.getElementById('networkStatusText'),
    successAnimation: document.getElementById('successAnimation'),
    imagesFeedback: document.getElementById('imagesFeedback'),
    descriptionFeedback: document.getElementById('descriptionFeedback'),
    categoryFeedback: document.getElementById('categoryFeedback'),
    priceFeedback: document.getElementById('priceFeedback'),
    frequencyFeedback: document.getElementById('frequencyFeedback')
};

// Network Status Monitor
class NetworkMonitor {
    static init() {
        window.addEventListener('online', () => this.updateStatus(true));
        window.addEventListener('offline', () => this.updateStatus(false));
        this.updateStatus(navigator.onLine);
    }

    static updateStatus(isOnline) {
        if (!isOnline) {
            elements.networkStatus.classList.add('show', 'offline');
            elements.networkStatusText.textContent = 'Offline';
            Utils.showToast('You are offline. Changes will be saved locally.', 'warning');
        } else {
            elements.networkStatus.classList.remove('offline');
            elements.networkStatusText.textContent = 'Online';
            if (elements.networkStatus.classList.contains('show')) {
                Utils.showToast('Back online!', 'success');
                setTimeout(() => {
                    elements.networkStatus.classList.remove('show');
                }, 3000);
            }
        }
    }
}

// Draft Management
class DraftManager {
    static checkForDraft() {
        const draftData = localStorage.getItem(STORAGE_KEYS.DRAFT);
        const draftTimestamp = localStorage.getItem(STORAGE_KEYS.DRAFT_TIMESTAMP);

        if (draftData && draftTimestamp) {
            const timestamp = new Date(parseInt(draftTimestamp));
            const now = new Date();
            const hoursDiff = (now - timestamp) / (1000 * 60 * 60);

            // Only show draft if it's less than 7 days old
            if (hoursDiff < 168) {
                elements.draftBanner.classList.add('show');
            } else {
                this.clearDraft();
            }
        }
    }

    static saveDraft() {
        try {
            const formData = {
                description: elements.itemDescription.value,
                category: elements.itemCategory.value,
                price: elements.itemPrice.value,
                frequency: elements.maintenanceFrequency.value,
                requiredMaterials: document.getElementById('requiredMaterials').value,
                requiredTools: document.getElementById('requiredTools').value,
                maintenanceTags: Array.from(AppState.maintenanceTags)
            };

            localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(formData));
            localStorage.setItem(STORAGE_KEYS.DRAFT_TIMESTAMP, Date.now().toString());

            AppState.lastAutosave = new Date();
            this.showAutosaveIndicator('Draft saved');
        } catch (error) {
            console.error('Error saving draft:', error);
        }
    }

    static loadDraft() {
        try {
            const draftData = localStorage.getItem(STORAGE_KEYS.DRAFT);
            if (!draftData) return;

            const data = JSON.parse(draftData);

            elements.itemDescription.value = data.description || '';
            elements.itemCategory.value = data.category || '';
            elements.itemPrice.value = data.price || '';
            elements.maintenanceFrequency.value = data.frequency || '';
            document.getElementById('requiredMaterials').value = data.requiredMaterials || '';
            document.getElementById('requiredTools').value = data.requiredTools || '';

            if (data.maintenanceTags && Array.isArray(data.maintenanceTags)) {
                AppState.maintenanceTags = new Set(data.maintenanceTags);
                TagHandler.render();
            }

            // Update character counters
            elements.itemDescCount.textContent = `${elements.itemDescription.value.length} / 200`;

            // Hide banner
            elements.draftBanner.classList.remove('show');

            // Validate all fields
            ValidationManager.validateAllFields();
            ProgressTracker.update();

            Utils.showToast('Draft restored successfully', 'success');
        } catch (error) {
            console.error('Error loading draft:', error);
            Utils.showToast('Error loading draft', 'danger');
        }
    }

    static clearDraft() {
        localStorage.removeItem(STORAGE_KEYS.DRAFT);
        localStorage.removeItem(STORAGE_KEYS.DRAFT_TIMESTAMP);
        localStorage.removeItem(STORAGE_KEYS.DRAFT_IMAGES);
        elements.draftBanner.classList.remove('show');
    }

    static showAutosaveIndicator(message = 'Saving draft...') {
        elements.autosaveText.textContent = message;
        elements.autosaveIndicator.classList.add('show');

        setTimeout(() => {
            elements.autosaveIndicator.classList.remove('show');
        }, 2000);
    }

    static startAutosave() {
        // Auto-save every 30 seconds
        AppState.autosaveInterval = setInterval(() => {
            if (AppState.hasUnsavedChanges && !AppState.isSubmitting) {
                this.saveDraft();
            }
        }, 30000);
    }

    static stopAutosave() {
        if (AppState.autosaveInterval) {
            clearInterval(AppState.autosaveInterval);
            AppState.autosaveInterval = null;
        }
    }
}

// Validation Manager
class ValidationManager {
    static validateField(field, value, fieldName) {
        let isValid = true;
        let message = '';

        switch (fieldName) {
            case 'images':
                isValid = AppState.selectedFiles.files.length > 0;
                message = isValid ? 'Images uploaded' : 'Please upload at least one image';
                break;

            case 'description':
                isValid = value.trim().length > 0 && value.length <= 200;
                if (!isValid) {
                    message = value.trim().length === 0
                        ? 'Description is required'
                        : 'Description must be 200 characters or less';
                } else {
                    message = 'Description looks good';
                }
                break;

            case 'category':
                isValid = value.trim().length > 0 && value.length <= 50;
                message = isValid ? 'Category is valid' : 'Please enter a category';
                break;

            case 'price':
                const price = parseFloat(value);
                isValid = !isNaN(price) && price >= 0 && price <= 1000000;
                message = isValid ? 'Price is valid' : 'Please enter a valid price (0 - 1,000,000)';
                break;

            case 'frequency':
                isValid = value !== '';
                message = isValid ? 'Frequency selected' : 'Please select a maintenance frequency';
                break;

            default:
                isValid = true;
        }

        // Update field visual state
        if (field) {
            if (isValid) {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
                AppState.validationErrors.delete(fieldName);
            } else {
                field.classList.remove('is-valid');
                field.classList.add('is-invalid');
                AppState.validationErrors.set(fieldName, message);
            }
        }

        // Update feedback message
        const feedbackElement = elements[`${fieldName}Feedback`];
        if (feedbackElement) {
            feedbackElement.textContent = message;
            if (isValid) {
                feedbackElement.classList.remove('invalid');
                feedbackElement.classList.add('valid', 'show');
            } else {
                feedbackElement.classList.remove('valid');
                feedbackElement.classList.add('invalid', 'show');
            }
        }

        return isValid;
    }

    static validateAllFields() {
        const validations = [
            { field: null, value: AppState.selectedFiles.files.length, name: 'images' },
            { field: elements.itemDescription, value: elements.itemDescription.value, name: 'description' },
            { field: elements.itemCategory, value: elements.itemCategory.value, name: 'category' },
            { field: elements.itemPrice, value: elements.itemPrice.value, name: 'price' },
            { field: elements.maintenanceFrequency, value: elements.maintenanceFrequency.value, name: 'frequency' }
        ];

        validations.forEach(({ field, value, name }) => {
            this.validateField(field, value, name);
        });

        this.updateValidationSummary();
        return AppState.validationErrors.size === 0;
    }

    static updateValidationSummary() {
        if (AppState.validationErrors.size > 0) {
            elements.validationList.innerHTML = '';
            AppState.validationErrors.forEach((message, fieldName) => {
                const li = document.createElement('li');
                li.textContent = message;
                li.addEventListener('click', () => {
                    const fieldMap = {
                        'images': elements.dropZone,
                        'description': elements.itemDescription,
                        'category': elements.itemCategory,
                        'price': elements.itemPrice,
                        'frequency': elements.maintenanceFrequency
                    };
                    const targetField = fieldMap[fieldName];
                    if (targetField) {
                        Utils.scrollToElement(targetField);
                    }
                });
                elements.validationList.appendChild(li);
            });
            elements.validationSummary.classList.add('show');
        } else {
            elements.validationSummary.classList.remove('show');
        }
    }
}

// Progress Tracker
class ProgressTracker {
    static update() {
        const requiredFields = [
            { name: 'images', isComplete: AppState.selectedFiles.files.length > 0 },
            { name: 'description', isComplete: elements.itemDescription.value.trim().length > 0 },
            { name: 'category', isComplete: elements.itemCategory.value.trim().length > 0 },
            { name: 'price', isComplete: elements.itemPrice.value.trim().length > 0 },
            { name: 'frequency', isComplete: elements.maintenanceFrequency.value !== '' }
        ];

        const completedCount = requiredFields.filter(f => f.isComplete).length;
        const percentage = Math.round((completedCount / requiredFields.length) * 100);

        // Update progress bar
        elements.progressBar.style.width = `${percentage}%`;
        elements.progressBar.setAttribute('aria-valuenow', percentage);
        elements.progressPercentage.textContent = `${percentage}%`;

        // Update field checklist
        requiredFields.forEach(({ name, isComplete }) => {
            const checkItem = document.querySelector(`.field-check-item[data-field="${name}"]`);
            if (checkItem) {
                if (isComplete) {
                    checkItem.classList.add('completed');
                    const icon = checkItem.querySelector('.field-check-icon');
                    icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                } else {
                    checkItem.classList.remove('completed');
                    const icon = checkItem.querySelector('.field-check-icon');
                    icon.innerHTML = '';
                }
            }
        });
    }
}

// Image handling
class ImageHandler {
    static MAX_IMAGES = 5;

    static updateCounter() {
        const count = AppState.selectedFiles.files.length;

        if (count > 0) {
            elements.imageCounter.classList.remove('d-none');
            elements.imageCounterText.textContent = `${count} ${count === 1 ? 'image' : 'images'} selected`;
            elements.imageCounterBadge.textContent = `${count}/${this.MAX_IMAGES}`;

            if (count >= this.MAX_IMAGES) {
                elements.imageCounterBadge.style.background = 'var(--color-secondary)';
            } else {
                elements.imageCounterBadge.style.background = 'var(--color-primary)';
            }
        } else {
            elements.imageCounter.classList.add('d-none');
        }

        // Trigger validation
        ValidationManager.validateField(null, count, 'images');
        ProgressTracker.update();
    }

    static renderPreviews() {
        elements.imagePreview.innerHTML = '';
        elements.imageAlert.classList.add('d-none');

        const files = Array.from(AppState.selectedFiles.files);

        if (files.length > this.MAX_IMAGES) {
            elements.imageAlert.classList.remove('d-none');
        }

        this.updateCounter();

        files.slice(0, this.MAX_IMAGES).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                this.createLoadingPlaceholder(index);

                const reader = new FileReader();
                reader.onload = (e) => this.createPreviewItem(e.target.result, index);
                reader.onerror = () => {
                    console.error('Error reading file:', file.name);
                    Utils.showError(`Failed to load image: ${file.name}`);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    static createLoadingPlaceholder(index) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('preview-item', 'loading');
        wrapper.setAttribute('data-index', index);
        wrapper.setAttribute('role', 'listitem');
        elements.imagePreview.appendChild(wrapper);
    }

    static createPreviewItem(src, index) {
        const loadingItem = elements.imagePreview.querySelector(`[data-index="${index}"]`);

        const wrapper = document.createElement('div');
        wrapper.classList.add('preview-item');
        wrapper.setAttribute('role', 'listitem');

        const badge = document.createElement('div');
        badge.classList.add('preview-item-badge');
        badge.textContent = `#${index + 1}`;

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Preview ${index + 1}`;
        img.loading = 'lazy';

        const btn = document.createElement('button');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
        btn.classList.add('remove-btn');
        btn.type = 'button';
        btn.setAttribute('aria-label', `Remove image ${index + 1}`);
        btn.addEventListener('click', () => this.removeImage(index));

        wrapper.appendChild(badge);
        wrapper.appendChild(img);
        wrapper.appendChild(btn);

        if (loadingItem) {
            loadingItem.replaceWith(wrapper);
        } else {
            elements.imagePreview.appendChild(wrapper);
        }
    }

    static removeImage(index) {
        const newDt = new DataTransfer();
        Array.from(AppState.selectedFiles.files).forEach((file, i) => {
            if (i !== index) {
                newDt.items.add(file);
            }
        });
        AppState.selectedFiles = newDt;
        elements.imageInput.files = newDt.files;
        this.renderPreviews();

        AppState.hasUnsavedChanges = true;
        Utils.showToast('Image removed', 'info');
    }

    static handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                Utils.showToast(`${file.name} is not a valid image file`, 'warning');
                return false;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                Utils.showToast(`${file.name} is too large. Maximum size is 10MB`, 'warning');
                return false;
            }

            return true;
        });

        if (validFiles.length === 0) {
            return;
        }

        AppState.selectedFiles = new DataTransfer();
        validFiles.forEach(file => {
            AppState.selectedFiles.items.add(file);
        });

        elements.imageInput.files = AppState.selectedFiles.files;
        this.renderPreviews();

        AppState.hasUnsavedChanges = true;

        if (validFiles.length > 0) {
            const message = validFiles.length === 1
                ? 'Image added successfully'
                : `${validFiles.length} images added successfully`;
            Utils.showToast(message, 'success');
        }
    }
}

// Maintenance tags handling
class TagHandler {
    static add() {
        const tagText = elements.maintenanceTagInput.value.trim();

        if (!tagText) return;

        if (!Utils.validateWordCount(tagText, 2)) {
            Utils.showError('Please enter only 1-2 words for the tag.');
            return;
        }

        const normalizedTag = tagText.toLowerCase();

        if (AppState.maintenanceTags.has(normalizedTag)) {
            Utils.showError('This tag has already been added.');
            return;
        }

        AppState.maintenanceTags.add(normalizedTag);
        this.render();
        elements.maintenanceTagInput.value = '';
        elements.maintenanceTagInput.focus();

        AppState.hasUnsavedChanges = true;
        Utils.showToast('Tag added', 'success');
    }

    static remove(tagText) {
        AppState.maintenanceTags.delete(tagText);
        this.render();
        AppState.hasUnsavedChanges = true;
    }

    static render() {
        elements.maintenanceTagsContainer.innerHTML = '';

        if (AppState.maintenanceTags.size === 0) {
            const placeholder = document.createElement('small');
            placeholder.className = 'text-muted';
            placeholder.textContent = 'No maintenance tasks added yet';
            elements.maintenanceTagsContainer.appendChild(placeholder);
            return;
        }

        AppState.maintenanceTags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.classList.add('maintenance-tag');
            tagElement.setAttribute('role', 'listitem');

            const span = document.createElement('span');
            span.textContent = tag;

            const btn = document.createElement('button');
            btn.innerHTML = '&times;';
            btn.classList.add('remove-tag');
            btn.type = 'button';
            btn.setAttribute('aria-label', `Remove ${tag} tag`);
            btn.addEventListener('click', () => this.remove(tag));

            tagElement.appendChild(span);
            tagElement.appendChild(btn);
            elements.maintenanceTagsContainer.appendChild(tagElement);
        });
    }
}

// Character counter with visual feedback
function setupCharCounter(textarea, counter, max) {
    const updateCounter = () => {
        const length = textarea.value.length;
        counter.textContent = `${length} / ${max}`;

        counter.classList.remove('warning', 'danger');

        if (length >= max) {
            counter.classList.add('danger');
        } else if (length >= max * 0.8) {
            counter.classList.add('warning');
        }
    };

    textarea.addEventListener('input', updateCounter);
    updateCounter();
}

// Debounced validation for real-time feedback
const debouncedValidateDescription = debounce((value) => {
    ValidationManager.validateField(elements.itemDescription, value, 'description');
    ProgressTracker.update();
    AppState.hasUnsavedChanges = true;
}, 500);

const debouncedValidateCategory = debounce((value) => {
    ValidationManager.validateField(elements.itemCategory, value, 'category');
    ProgressTracker.update();
    AppState.hasUnsavedChanges = true;
}, 500);

const debouncedValidatePrice = debounce((value) => {
    ValidationManager.validateField(elements.itemPrice, value, 'price');
    ProgressTracker.update();
    AppState.hasUnsavedChanges = true;
}, 500);

// Form submission with success animation
async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    // Validate all fields
    const isValid = ValidationManager.validateAllFields();

    if (!isValid) {
        Utils.showToast('Please fix the errors before submitting', 'warning');

        // Scroll to first error
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
            Utils.scrollToElement(firstError);
        }
        return;
    }

    if (AppState.selectedFiles.files.length === 0) {
        Utils.showError('Please upload at least one image.');
        Utils.scrollToElement(elements.dropZone);
        return;
    }

    if (AppState.isSubmitting) return;

    AppState.isSubmitting = true;
    elements.submitBtn.disabled = true;
    elements.submitText.classList.add('d-none');
    elements.submitSpinner.classList.remove('d-none');

    try {
        const formData = new FormData(elements.form);

        formData.append('maintenanceTags', JSON.stringify(Array.from(AppState.maintenanceTags)));

        Array.from(AppState.selectedFiles.files).forEach((file, index) => {
            formData.append(`image_${index}`, file);
        });

        const response = await fetch(`${API_BASE}/api/items`, {
            method: 'POST',
            body: formData,
            credentials: USE_COOKIES ? 'include' : 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                Utils.showError('You are not logged in. Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 1500);
                return;
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Item created successfully:', result);

        // Clear draft
        DraftManager.clearDraft();
        DraftManager.stopAutosave();
        AppState.hasUnsavedChanges = false;

        // Show success animation
        elements.successAnimation.classList.add('show');

        setTimeout(() => {
            elements.successAnimation.classList.remove('show');
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('Form submission error:', error);
        Utils.showError('Failed to submit form: ' + error.message);
    } finally {
        AppState.isSubmitting = false;
        elements.submitBtn.disabled = false;
        elements.submitText.classList.remove('d-none');
        elements.submitSpinner.classList.add('d-none');
    }
}

// Cancel handler with unsaved changes warning
function handleCancel() {
    if (AppState.hasUnsavedChanges) {
        const shouldCancel = confirm('You have unsaved changes. Do you want to save a draft before leaving?');
        if (shouldCancel) {
            DraftManager.saveDraft();
            window.location.href = 'dashboard.html';
        }
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S to save draft
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            DraftManager.saveDraft();
            Utils.showToast('Draft saved manually', 'success');
        }

        // Escape to cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }

        // Enter on tag input
        if (e.target === elements.maintenanceTagInput && e.key === 'Enter') {
            e.preventDefault();
            TagHandler.add();
        }
    });
}

// Prevent navigation with unsaved changes
function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
        if (AppState.hasUnsavedChanges && !AppState.isSubmitting) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
}

// Event listeners
function initEventListeners() {
    // Form submission
    elements.form.addEventListener('submit', handleSubmit);

    // Cancel button
    elements.cancelBtn.addEventListener('click', handleCancel);

    // Image upload
    elements.dropZone.addEventListener('click', () => elements.imageInput.click());

    elements.imageInput.addEventListener('change', function() {
        ImageHandler.handleFiles(this.files);
    });

    // Drag and drop
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('drag-over');
    });

    elements.dropZone.addEventListener('dragleave', () => {
        elements.dropZone.classList.remove('drag-over');
    });

    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('drag-over');
        ImageHandler.handleFiles(e.dataTransfer.files);
    });

    // Character counters
    setupCharCounter(elements.itemDescription, elements.itemDescCount, 200);

    // Real-time validation with debouncing
    elements.itemDescription.addEventListener('input', (e) => {
        debouncedValidateDescription(e.target.value);
    });

    elements.itemCategory.addEventListener('input', (e) => {
        debouncedValidateCategory(e.target.value);
    });

    elements.itemPrice.addEventListener('input', (e) => {
        debouncedValidatePrice(e.target.value);
    });

    elements.maintenanceFrequency.addEventListener('change', (e) => {
        ValidationManager.validateField(e.target, e.target.value, 'frequency');
        ProgressTracker.update();
        AppState.hasUnsavedChanges = true;
    });

    // Maintenance tags
    elements.addTagBtn.addEventListener('click', () => TagHandler.add());

    elements.maintenanceTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            TagHandler.add();
        }
    });

    // Draft management
    elements.resumeDraftBtn.addEventListener('click', () => {
        DraftManager.loadDraft();
    });

    elements.discardDraftBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to discard the saved draft?')) {
            DraftManager.clearDraft();
            Utils.showToast('Draft discarded', 'info');
        }
    });

    // Track form changes
    elements.form.addEventListener('input', () => {
        AppState.hasUnsavedChanges = true;
    });

    // Initialize tag container
    TagHandler.render();
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all systems
    NetworkMonitor.init();
    DraftManager.checkForDraft();
    DraftManager.startAutosave();
    setupKeyboardShortcuts();
    setupBeforeUnload();
    initEventListeners();
    ProgressTracker.update();

    // Focus first field for accessibility
    elements.dropZone.setAttribute('tabindex', '0');
});
