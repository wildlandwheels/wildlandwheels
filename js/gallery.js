(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".gallery-tabs [role='tab']"));
  var figures = Array.prototype.slice.call(document.querySelectorAll(".photo-grid figure"));
  var empty = document.querySelector(".gallery-empty");
  var dialog = document.getElementById("lightbox");
  var dialogImage = document.getElementById("lightbox-image");
  var dialogTitle = document.getElementById("lightbox-title");
  var dialogCategory = document.getElementById("lightbox-category");

  function selectTab(tab) {
    var category = tab.getAttribute("data-category");
    var panel = document.getElementById("photo-grid");
    var shown = 0;
    if (panel) panel.setAttribute("aria-labelledby", tab.id);
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
    });
    figures.forEach(function (figure) {
      var match = category === "All photographs" || figure.getAttribute("data-category") === category;
      figure.hidden = !match;
      if (match) shown += 1;
    });
    if (empty) empty.hidden = shown > 0;
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectTab(tab);
      tab.focus();
    });
    tab.addEventListener("keydown", function (event) {
      var keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();
      var index = tabs.indexOf(tab);
      if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = tabs.length - 1;
      selectTab(tabs[index]);
      tabs[index].focus();
    });
  });

  document.querySelectorAll(".photo-button").forEach(function (button) {
    button.addEventListener("click", function () {
      var figure = button.closest("figure");
      var source = button.querySelector("img");
      dialogTitle.textContent = figure.getAttribute("data-title");
      dialogCategory.textContent = figure.getAttribute("data-category");
      dialogImage.src = source.getAttribute("src");
      dialogImage.alt = source.getAttribute("alt");
      dialog.showModal();
    });
  });

  dialog.querySelector(".lightbox-close").addEventListener("click", function () {
    dialog.close();
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
})();
