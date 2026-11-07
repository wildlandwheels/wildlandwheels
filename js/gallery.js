(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".gallery-tabs [role='tab']"));
  var figures = Array.prototype.slice.call(document.querySelectorAll(".photo-grid figure"));
  var panel = document.getElementById("photo-grid");
  var toolbar = document.querySelector(".gallery-top");
  var count = document.getElementById("gallery-count");
  var dialog = document.getElementById("lightbox");
  var dialogImage = document.getElementById("lightbox-image");
  var dialogTitle = document.getElementById("lightbox-title");
  var dialogCategory = document.getElementById("lightbox-category");
  var position = document.getElementById("lightbox-position");
  var previous = document.querySelector(".lightbox-previous");
  var next = document.querySelector(".lightbox-next");
  var close = document.querySelector(".lightbox-close");
  var canShowDialog = dialog && typeof dialog.showModal === "function";
  var category = "all";
  var currentPhoto = null;
  var returnFocus = null;
  var closingWithHistory = false;
  // Only entries created by this page instance may be closed with history.back().
  var historyOwner = "gallery-" + Math.random().toString(36).slice(2);

  if (!panel || !toolbar || !tabs.length || !figures.length) return;

  var categories = tabs.map(function (tab) {
    return tab.getAttribute("data-category") === "All photographs" ? "all" : tab.getAttribute("data-category").toLowerCase();
  });
  var photos = figures.map(function (figure) {
    return {
      id: figure.getAttribute("data-id"),
      category: figure.getAttribute("data-category").toLowerCase(),
      title: figure.getAttribute("data-title"),
      figure: figure,
      link: figure.querySelector(".photo-button"),
      image: figure.querySelector("img")
    };
  });

  function visiblePhotos() {
    return photos.filter(function (photo) { return category === "all" || photo.category === category; });
  }

  function findPhoto(id) {
    return photos.find(function (photo) { return photo.id === id; }) || null;
  }

  function historyState(owner) {
    var state = Object.assign({}, window.history.state);
    delete state.galleryModalOwner;
    if (owner) state.galleryModalOwner = owner;
    return state;
  }

  function makeURL(selectedCategory, photo) {
    var url = new URL(window.location.href);
    url.searchParams.delete("category");
    url.searchParams.delete("photo");
    if (selectedCategory !== "all") url.searchParams.set("category", selectedCategory);
    if (photo) url.searchParams.set("photo", photo.id);
    return url;
  }

  function writeURL(method, photo, owner) {
    window.history[method](historyState(owner), "", makeURL(category, photo));
  }

  function applyCategory(selectedCategory) {
    category = selectedCategory;
    tabs.forEach(function (tab, index) {
      var selected = categories[index] === category;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute("aria-labelledby", tab.id);
    });
    photos.forEach(function (photo) {
      photo.figure.hidden = category !== "all" && photo.category !== category;
    });
    var shown = visiblePhotos().length;
    if (count) count.textContent = shown + (shown === 1 ? " photograph" : " photographs");
  }

  function restoreFocus() {
    var selectedTab = tabs[categories.indexOf(category)];
    var target = returnFocus && !returnFocus.closest("figure").hidden ? returnFocus : selectedTab;
    if (target) target.focus({ preventScroll: true });
    returnFocus = null;
  }

  function hideDialog() {
    currentPhoto = null;
    document.body.classList.remove("lightbox-open");
    if (canShowDialog && dialog.open) {
      dialog.close();
      restoreFocus();
    }
  }

  function showPhoto(photo) {
    currentPhoto = photo;
    if (!canShowDialog) return;
    dialogTitle.textContent = photo.title;
    dialogCategory.textContent = photo.figure.getAttribute("data-category");
    // The original link remains the full-size source even when thumbnails use srcset.
    dialogImage.removeAttribute("srcset");
    dialogImage.removeAttribute("sizes");
    dialogImage.src = photo.link.href;
    dialogImage.alt = photo.image.alt;
    var shown = visiblePhotos();
    var index = shown.indexOf(photo);
    previous.disabled = index === 0;
    next.disabled = index === shown.length - 1;
    position.textContent = (index + 1) + " of " + shown.length;
    if (!dialog.open) {
      returnFocus = photo.link;
      document.body.classList.add("lightbox-open");
      dialog.showModal();
    }
  }

  function restoreFromURL() {
    closingWithHistory = false;
    var params = new URL(window.location.href).searchParams;
    var selectedCategory = params.get("category") || "all";
    if (categories.indexOf(selectedCategory) === -1) selectedCategory = "all";
    var photo = findPhoto(params.get("photo"));
    if (photo && selectedCategory !== "all" && photo.category !== selectedCategory) selectedCategory = photo.category;
    applyCategory(selectedCategory);
    var canonical = makeURL(category, photo);
    if (canonical.href !== window.location.href) window.history.replaceState(window.history.state, "", canonical);
    if (photo) showPhoto(photo);
    else hideDialog();
  }

  function selectTab(tab) {
    var selectedCategory = categories[tabs.indexOf(tab)];
    if (selectedCategory !== category || currentPhoto) {
      applyCategory(selectedCategory);
      hideDialog();
      writeURL("pushState", null);
    }
    tab.focus();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (event) {
      if (["ArrowRight", "ArrowLeft", "Home", "End"].indexOf(event.key) === -1) return;
      event.preventDefault();
      var index = tabs.indexOf(tab);
      if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = tabs.length - 1;
      selectTab(tabs[index]);
    });
  });

  function closePhoto() {
    if (!dialog.open || closingWithHistory) return;
    if (window.history.state && window.history.state.galleryModalOwner === historyOwner) {
      closingWithHistory = true;
      window.history.back();
    } else {
      writeURL("replaceState", null);
      hideDialog();
    }
  }

  function movePhoto(direction) {
    var shown = visiblePhotos();
    var photo = shown[shown.indexOf(currentPhoto) + direction];
    if (!photo) return;
    var owner = window.history.state && window.history.state.galleryModalOwner;
    writeURL("replaceState", photo, owner === historyOwner ? owner : null);
    showPhoto(photo);
  }

  if (canShowDialog) {
    photos.forEach(function (photo) {
      photo.link.setAttribute("role", "button");
      photo.link.setAttribute("aria-haspopup", "dialog");
      photo.link.setAttribute("aria-controls", "lightbox");
      photo.link.addEventListener("click", function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        writeURL("pushState", photo, historyOwner);
        showPhoto(photo);
      });
      photo.link.addEventListener("keydown", function (event) {
        if (event.key === " ") {
          event.preventDefault();
          photo.link.click();
        }
      });
    });
    close.addEventListener("click", closePhoto);
    previous.addEventListener("click", function () { movePhoto(-1); });
    next.addEventListener("click", function () { movePhoto(1); });
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closePhoto();
    });
    dialog.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      movePhoto(event.key === "ArrowLeft" ? -1 : 1);
    });
    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePhoto();
    });
  }

  panel.setAttribute("role", "tabpanel");
  toolbar.hidden = false;
  window.addEventListener("popstate", restoreFromURL);
  restoreFromURL();
})();
