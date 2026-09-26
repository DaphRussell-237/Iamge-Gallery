/* ============================================
   LUMINA GALLERY — Add (File/URL) · Delete · Lightbox
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- DOM refs ---------- */
  const gallery     = document.getElementById('gallery');
  const lightbox    = document.getElementById('lightbox');
  const lbImage     = document.getElementById('lbImage');
  const lbTitle     = document.getElementById('lbTitle');
  const lbCategory  = document.getElementById('lbCategory');
  const lbCounter   = document.getElementById('lbCounter');
  const btnClose    = document.getElementById('lbClose');
  const btnPrev     = document.getElementById('lbPrev');
  const btnNext     = document.getElementById('lbNext');

  const modal       = document.getElementById('modal');
  const modalClose  = document.getElementById('modalClose');
  const btnAdd      = document.getElementById('btnAdd');
  const btnCancel   = document.getElementById('btnCancel');
  const addForm     = document.getElementById('addForm');
  const formError   = document.getElementById('formError');

  const tabFile     = document.getElementById('tabFile');
  const tabUrl      = document.getElementById('tabUrl');
  const panelFile   = document.getElementById('panelFile');
  const panelUrl    = document.getElementById('panelUrl');

  const dropzone    = document.getElementById('dropzone');
  const inputFile   = document.getElementById('inputFile');
  const filePreview = document.getElementById('filePreview');
  const dropInner   = document.getElementById('dropzoneInner');
  const btnClearFile= document.getElementById('btnClearFile');

  const inputUrl    = document.getElementById('inputUrl');
  const urlPreview  = document.getElementById('urlPreview');
  const inputTitle  = document.getElementById('inputTitle');
  const inputCat    = document.getElementById('inputCategory');
  const inputSize   = document.getElementById('inputSize');

  /* ---------- State ---------- */
  const STORAGE_KEY = 'lumina-gallery-images-v2';
  let images = [];
  let currentIndex = 0;
  let lastFocusedElement = null;

  // Currently chosen source for the new image
  let currentSourceType = 'file';   // 'file' | 'url'
  let selectedFileData  = null;     // base64 string if file picked

  /* ---------- Helpers ---------- */
  const uid = () => 'img_' + Math.random().toString(36).slice(2, 10);

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ---------- Default seed ---------- */
  const DEFAULT_IMAGES = [
    { id: uid(), src: 'https://picsum.photos/id/1015/600/900', title: 'Silent River',   category: 'Nature',      size: 'tall'   },
    { id: uid(), src: 'https://picsum.photos/id/1018/600/600', title: 'Northern Peaks', category: 'Landscape',   size: 'normal' },
    { id: uid(), src: 'https://picsum.photos/id/1019/900/600', title: 'Amber Horizon',  category: 'Golden Hour', size: 'wide'   },
    { id: uid(), src: 'https://picsum.photos/id/1024/600/600', title: 'Into the Woods', category: 'Forest',      size: 'normal' },
    { id: uid(), src: 'https://picsum.photos/id/1025/600/900', title: 'Edge of Tides',  category: 'Ocean',       size: 'tall'   },
    { id: uid(), src: 'https://picsum.photos/id/1035/600/600', title: 'Windswept',      category: 'Desert',      size: 'normal' },
    { id: uid(), src: 'https://picsum.photos/id/1036/600/600', title: 'Cosmic Silence', category: 'Night',       size: 'normal' },
    { id: uid(), src: 'https://picsum.photos/id/1043/900/600', title: 'Reflections',    category: 'Autumn',      size: 'wide'   },
    { id: uid(), src: 'https://picsum.photos/id/1050/600/600', title: 'Frozen Silence', category: 'Winter',      size: 'normal' },
    { id: uid(), src: 'https://picsum.photos/id/1069/600/900', title: 'Cascade Dream',  category: 'Waterfall',   size: 'tall'   },
    { id: uid(), src: 'https://picsum.photos/id/1080/900/600', title: 'Wild Bloom',     category: 'Meadow',      size: 'wide'   },
    { id: uid(), src: 'https://picsum.photos/id/152/600/600',  title: 'Mirror Lake',    category: 'Alpine',      size: 'normal' },
    { id: uid(), src: 'https://picsum.photos/id/164/600/900',  title: 'Red Walls',      category: 'Canyon',      size: 'tall'   },
    { id: uid(), src: 'https://picsum.photos/id/211/900/600',  title: 'End of Day',     category: 'Sunset',      size: 'wide'   },
    { id: uid(), src: 'https://picsum.photos/id/218/600/600',  title: 'Alone Together', category: 'Shelter',     size: 'normal' }
  ];

  /* ---------- Persistence ---------- */
  function loadImages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          images = parsed;
          return;
        }
      }
    } catch (e) { console.warn('Load failed:', e); }
    images = DEFAULT_IMAGES.slice();
    saveImages();
  }

  function saveImages() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    } catch (e) {
      console.warn('Save failed (quota?):', e);
      alert('Could not save. Your browser storage may be full (try smaller images).');
    }
  }

  /* ---------- Render gallery ---------- */
  function renderGallery() {
    gallery.innerHTML = '';

    images.forEach((img, index) => {
      const figure = document.createElement('figure');
      figure.className = `tile ${img.size && img.size !== 'normal' ? img.size : ''}`.trim();
      figure.tabIndex = 0;
      figure.dataset.index = index;

      figure.innerHTML = `
        <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.title || 'Gallery image')}" loading="lazy"
             onerror="this.src='https://picsum.photos/600/600?random=${index}'">
        <button class="btn-delete" aria-label="Delete ${escapeHtml(img.title)}" title="Delete">&times;</button>
        <figcaption class="caption">
          <span>${escapeHtml(img.category || 'Uncategorized')}</span>
          <h3>${escapeHtml(img.title || 'Untitled')}</h3>
        </figcaption>
      `;

      figure.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete')) return;
        openLightbox(index);
      });

      figure.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.btn-delete')) {
          e.preventDefault();
          openLightbox(index);
        }
      });

      figure.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(index, figure);
      });

      gallery.appendChild(figure);
    });
  }

  /* ---------- Delete ---------- */
  function deleteImage(index, tileEl) {
    const img = images[index];
    if (!img) return;
    if (!confirm(`Delete "${img.title}"?`)) return;

    tileEl.classList.add('removing');
    setTimeout(() => {
      images.splice(index, 1);
      saveImages();
      renderGallery();
    }, 340);
  }

  /* ---------- Tabs ---------- */
  function switchTab(type) {
    currentSourceType = type;

    tabFile.classList.toggle('active', type === 'file');
    tabUrl.classList.toggle('active', type === 'url');
    tabFile.setAttribute('aria-selected', type === 'file');
    tabUrl.setAttribute('aria-selected', type === 'url');

    panelFile.classList.toggle('active', type === 'file');
    panelUrl.classList.toggle('active', type === 'url');

    formError.textContent = '';
  }

  tabFile.addEventListener('click', () => switchTab('file'));
  tabUrl.addEventListener('click', () => switchTab('url'));

  /* ---------- File input ---------- */
  const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

  function handleFile(file) {
    formError.textContent = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      formError.textContent = 'Please choose a valid image file.';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      formError.textContent = 'Image too large (max ~3MB). Try compressing it.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      selectedFileData = e.target.result; // base64 data URL
      filePreview.src = selectedFileData;
      filePreview.hidden = false;
      dropInner.style.display = 'none';
      btnClearFile.hidden = false;

      // Auto-fill title from filename if empty
      if (!inputTitle.value.trim()) {
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        inputTitle.value = name.slice(0, 60);
      }
    };
    reader.onerror = () => {
      formError.textContent = 'Failed to read the file. Try again.';
    };
    reader.readAsDataURL(file);
  }

  // Click to open picker
  dropzone.addEventListener('click', () => inputFile.click());

  inputFile.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });

  // Drag & drop
  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  });

  // Clear selected file
  btnClearFile.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFileData = null;
    filePreview.src = '';
    filePreview.hidden = true;
    dropInner.style.display = '';
    btnClearFile.hidden = true;
    inputFile.value = '';
  });

  /* ---------- URL preview ---------- */
  let urlPreviewTimer;
  inputUrl.addEventListener('input', () => {
    clearTimeout(urlPreviewTimer);
    const val = inputUrl.value.trim();
    if (!val) {
      urlPreview.hidden = true;
      urlPreview.src = '';
      return;
    }
    urlPreviewTimer = setTimeout(() => {
      urlPreview.src = val;
    }, 400);
  });

  urlPreview.addEventListener('load', () => { urlPreview.hidden = false; });
  urlPreview.addEventListener('error', () => {
    urlPreview.hidden = true;
  });

  /* ---------- Open / close modal ---------- */
  function openModal() {
    lastFocusedElement = document.activeElement;
    resetForm();
    switchTab('file');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => inputTitle.focus(), 250);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function resetForm() {
    addForm.reset();
    selectedFileData = null;
    filePreview.src = '';
    filePreview.hidden = true;
    dropInner.style.display = '';
    btnClearFile.hidden = true;
    inputFile.value = '';
    urlPreview.src = '';
    urlPreview.hidden = true;
    formError.textContent = '';
  }

  btnAdd.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  /* ---------- Submit ---------- */
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    formError.textContent = '';

    const title    = inputTitle.value.trim();
    const category = inputCat.value.trim() || 'Uncategorized';
    const size     = inputSize.value;

    if (!title) {
      formError.textContent = 'Please enter a title.';
      inputTitle.focus();
      return;
    }

    let src = '';

    if (currentSourceType === 'file') {
      if (!selectedFileData) {
        formError.textContent = 'Please choose an image from your device.';
        return;
      }
      src = selectedFileData;
    } else {
      const url = inputUrl.value.trim();
      if (!url) {
        formError.textContent = 'Please paste an image URL.';
        inputUrl.focus();
        return;
      }
      // Basic URL validation
      try {
        new URL(url);
      } catch {
        formError.textContent = 'That doesn\'t look like a valid URL.';
        inputUrl.focus();
        return;
      }
      src = url;
    }

    const newImage = { id: uid(), src, title, category, size };
    images.unshift(newImage); // add to top
    saveImages();
    renderGallery();
    closeModal();
  });

  /* ---------- Lightbox ---------- */
  function openLightbox(index) {
    if (!images.length) return;
    currentIndex = index;
    lastFocusedElement = document.activeElement;

    renderLightboxImage();
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-open');
    btnClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-open');
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function renderLightboxImage() {
    const data = images[currentIndex];
    if (!data) return;

    lbImage.classList.add('switching');
    setTimeout(() => {
      lbImage.src = data.src;
      lbImage.alt = data.title || 'Gallery image';
      lbTitle.textContent = data.title || 'Untitled';
      lbCategory.textContent = data.category || '';
      lbCounter.textContent = `${currentIndex + 1} / ${images.length}`;
      lbImage.classList.remove('switching');
    }, 150);
  }

  function showNext() {
    if (!images.length) return;
    currentIndex = (currentIndex + 1) % images.length;
    renderLightboxImage();
  }

  function showPrev() {
    if (!images.length) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    renderLightboxImage();
  }

  btnClose.addEventListener('click', closeLightbox);
  btnNext.addEventListener('click', showNext);
  btnPrev.addEventListener('click', showPrev);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', (e) => {
    // Close modal with Escape
    if (modal.classList.contains('active') && e.key === 'Escape') {
      closeModal();
      return;
    }
    // Lightbox shortcuts
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft')  showPrev();
  });

  /* ---------- Touch swipe ---------- */
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) showNext();
      else          showPrev();
    }
  }, { passive: true });

  /* ---------- Init ---------- */
  loadImages();
  renderGallery();
});
