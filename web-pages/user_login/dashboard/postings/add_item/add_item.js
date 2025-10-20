// add_item.js - Add new item with preventative maintenance tasks
(function() {
  'use strict';

  // API Configuration
  const API = {
    me: '/api/me',
    items: '/api/items'
  };

  // Application state
  const AppState = {
    selectedFiles: new DataTransfer(),
    tasks: [],
    isSubmitting: false,
    validationErrors: new Map()
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
    itemName: document.getElementById('itemName'),
    itemDescription: document.getElementById('itemDescription'),
    itemDescCount: document.getElementById('itemDescCount'),
    cancelBtn: document.getElementById('cancelBtn'),
    submitBtn: document.getElementById('submitBtn'),
    submitText: document.getElementById('submitText'),
    submitSpinner: document.getElementById('submitSpinner'),
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    validationSummary: document.getElementById('validationSummary'),
    validationList: document.getElementById('validationList'),
    successAnimation: document.getElementById('successAnimation'),
    imagesFeedback: document.getElementById('imagesFeedback'),
    itemNameFeedback: document.getElementById('itemNameFeedback'),
    descriptionFeedback: document.getElementById('descriptionFeedback')
  };

  /* ==================== AUTHENTICATION ==================== */

  // Run session guard FIRST
  (async function sessionGuard(){
    const r = await fetch(API.me, { credentials: 'include' });
    if(!r.ok){
      window.location.href = '../login.html';
    }
  })();

  /* ==================== UTILITY FUNCTIONS ==================== */

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
            from { opacity: 0; transform: translate(-50%, -100%); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          @keyframes slideUp {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, -100%); }
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

  /* ==================== VALIDATION MANAGER ==================== */

  class ValidationManager {
    static validateField(field, value, fieldName) {
      let isValid = true;
      let message = '';

      switch (fieldName) {
        case 'images':
          isValid = AppState.selectedFiles.files.length > 0;
          message = isValid ? 'Images uploaded' : 'Please upload at least one image';
          break;

        case 'itemName':
          isValid = value.trim().length > 0 && value.length <= 100;
          message = isValid ? 'Item name is valid' : 'Please enter an item name (max 100 characters)';
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

        case 'frequency':
          const allTasks = document.querySelectorAll('.task-card');
          isValid = false;
          allTasks.forEach(taskCard => {
            const desc = taskCard.querySelector('.task-description')?.value.trim();
            const freq = taskCard.querySelector('.task-frequency')?.value;
            if (desc && freq) {
              isValid = true;
            }
          });
          message = isValid ? 'At least one task is complete' : 'Please add at least one complete maintenance task';
          break;

        default:
          isValid = true;
      }

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
        { field: elements.itemName, value: elements.itemName.value, name: 'itemName' },
        { field: elements.itemDescription, value: elements.itemDescription.value, name: 'description' },
        { field: null, value: null, name: 'frequency' }
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
              'itemName': elements.itemName,
              'description': elements.itemDescription,
              'frequency': document.getElementById('addTaskBtn')
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

  /* ==================== PROGRESS TRACKER ==================== */

  class ProgressTracker {
    static update() {
      let hasCompleteTask = false;
      document.querySelectorAll('.task-card').forEach(taskCard => {
        const desc = taskCard.querySelector('.task-description')?.value.trim();
        const freq = taskCard.querySelector('.task-frequency')?.value;
        if (desc && freq) {
          hasCompleteTask = true;
        }
      });

      const requiredFields = [
        { name: 'images', isComplete: AppState.selectedFiles.files.length > 0 },
        { name: 'itemName', isComplete: elements.itemName.value.trim().length > 0 },
        { name: 'description', isComplete: elements.itemDescription.value.trim().length > 0 },
        { name: 'frequency', isComplete: hasCompleteTask }
      ];

      const completedCount = requiredFields.filter(f => f.isComplete).length;
      const percentage = Math.round((completedCount / requiredFields.length) * 100);

      elements.progressBar.style.width = `${percentage}%`;
      elements.progressBar.setAttribute('aria-valuenow', percentage);
      elements.progressPercentage.textContent = `${percentage}%`;

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

  /* ==================== IMAGE HANDLER ==================== */

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
            Utils.showToast(`Failed to load image: ${file.name}`, 'danger');
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

      const currentCount = AppState.selectedFiles.files.length;
      const totalCount = currentCount + validFiles.length;

      if (totalCount > this.MAX_IMAGES) {
        const canAdd = this.MAX_IMAGES - currentCount;
        if (canAdd <= 0) {
          Utils.showToast(`Maximum ${this.MAX_IMAGES} images allowed. Please remove some images first.`, 'warning');
          return;
        }
        Utils.showToast(`Only adding ${canAdd} image(s). Maximum ${this.MAX_IMAGES} images allowed.`, 'warning');
        validFiles.splice(canAdd);
      }

      validFiles.forEach(file => {
        AppState.selectedFiles.items.add(file);
      });

      elements.imageInput.files = AppState.selectedFiles.files;
      this.renderPreviews();

      if (validFiles.length > 0) {
        const message = validFiles.length === 1
          ? 'Image added successfully'
          : `${validFiles.length} images added successfully`;
        Utils.showToast(message, 'success');
      }
    }
  }

  /* ==================== TASK DATA COLLECTOR ==================== */

  class TaskDataCollector {
    static getAllTasks() {
      const tasksData = [];
      document.querySelectorAll('.task-card').forEach(taskCard => {
        const taskId = taskCard.getAttribute('data-task-id');
        const description = document.getElementById(`taskDescription_${taskId}`)?.value.trim();
        const frequency = document.getElementById(`taskFrequency_${taskId}`)?.value;
        const materials = document.getElementById(`taskMaterials_${taskId}`)?.value.trim();
        const tools = document.getElementById(`taskTools_${taskId}`)?.value.trim();

        if (description && frequency) {
          tasksData.push({
            description,
            frequency,
            materials,
            tools
          });
        }
      });
      return tasksData;
    }
  }

  /* ==================== CHARACTER COUNTER ==================== */

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

  /* ==================== FORM SUBMISSION ==================== */

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    const isValid = ValidationManager.validateAllFields();

    if (!isValid) {
      Utils.showToast('Please fix the errors before submitting', 'warning');

      const firstError = document.querySelector('.is-invalid');
      if (firstError) {
        Utils.scrollToElement(firstError);
      }
      return;
    }

    if (AppState.selectedFiles.files.length === 0) {
      Utils.showToast('Please upload at least one image.', 'danger');
      Utils.scrollToElement(elements.dropZone);
      return;
    }

    if (AppState.isSubmitting) return;

    AppState.isSubmitting = true;
    elements.submitBtn.disabled = true;
    elements.submitText.classList.add('d-none');
    elements.submitSpinner.classList.remove('d-none');

    try {
      const formData = new FormData();

      formData.append('itemName', elements.itemName.value);
      formData.append('description', elements.itemDescription.value);

      const tasksData = TaskDataCollector.getAllTasks();
      formData.append('maintenanceTasks', JSON.stringify(tasksData));

      Array.from(AppState.selectedFiles.files).forEach((file, index) => {
        formData.append('images', file);
      });

      const response = await fetch(API.items, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          Utils.showToast('You are not logged in. Redirecting to login...', 'danger');
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

      elements.successAnimation.classList.add('show');

      setTimeout(() => {
        elements.successAnimation.classList.remove('show');
        window.location.href = '../dashboard.html';
      }, 2000);

    } catch (error) {
      console.error('Form submission error:', error);
      Utils.showToast('Failed to submit form: ' + error.message, 'danger');
    } finally {
      AppState.isSubmitting = false;
      elements.submitBtn.disabled = false;
      elements.submitText.classList.remove('d-none');
      elements.submitSpinner.classList.add('d-none');
    }
  }

  /* ==================== EVENT HANDLERS ==================== */

  function handleCancel() {
    // Return to the postings listing when the user cancels
    window.location.href = '../postings.html';
  }

  /* ==================== INITIALIZATION ==================== */

  const debouncedValidateItemName = debounce((value) => {
    ValidationManager.validateField(elements.itemName, value, 'itemName');
    ProgressTracker.update();
  }, 500);

  const debouncedValidateDescription = debounce((value) => {
    ValidationManager.validateField(elements.itemDescription, value, 'description');
    ProgressTracker.update();
  }, 500);

  function setupEventListeners() {
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
    elements.itemName.addEventListener('input', (e) => {
      debouncedValidateItemName(e.target.value);
    });

    elements.itemDescription.addEventListener('input', (e) => {
      debouncedValidateDescription(e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });
  }

  function initAddItem() {
    setupEventListeners();
    ProgressTracker.update();
    elements.dropZone.setAttribute('tabindex', '0');
  }

  /* ==================== ENTRY POINT ==================== */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddItem);
  } else {
    initAddItem();
  }

})();
