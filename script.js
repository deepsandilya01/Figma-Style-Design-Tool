(function () {
  "use strict";

  const AppState = {
    elements: [],
    selectedElement: null,
    elementCounter: 0,
    zoomLevel: 1,
    currentTool: "select",
    isDragging: false,
    isResizing: false,
    isRotating: false,
    dragOffset: { x: 0, y: 0 },
    resizeHandle: null,
    rotationStartAngle: 0,
    pages: [
      {
        id: "page_1",
        name: "Page 1",
        elements: [],
        elementCounter: 0,
      },
    ],
    currentPageIndex: 0,
    canvas: {
      width: 1200,
      height: 800,
      minElementSize: 20,
      boundary: 5,
    },
    tools: {
      select: "Select Tool",
      rectangle: "Rectangle",
      circle: "Circle",
      triangle: "Triangle",
      line: "Line",
      text: "Text Box",
    },
    defaultDimensions: {
      rectangle: { width: 120, height: 80 },
      circle: { width: 100, height: 100 },
      triangle: { width: 100, height: 80 },
      line: { width: 150, height: 2 },
      text: { width: 120, height: 40 },
    },
    zoom: {
      step: 0.1,
      min: 0.25,
      max: 3,
    },
  };

  const Utils = {
    clamp: function (value, min, max) {
      return Math.max(min, Math.min(value, max));
    },
    generateElementId: function () {
      return `element_${++AppState.elementCounter}`;
    },
    normalizeAngle: function (angle) {
      angle = angle % 360;
      return angle < 0 ? angle + 360 : angle;
    },
    getAngleFromCenter: function (e, element) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return 0;
      const canvasRect = canvas.getBoundingClientRect();
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      return Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
    },
    getCanvasMousePosition: function (e) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / AppState.zoomLevel,
        y: (e.clientY - rect.top) / AppState.zoomLevel,
      };
    },
  };

  const PageManager = {
    addNewPage: function () {
      const newPageNumber = AppState.pages.length + 1;
      const newPage = {
        id: `page_${newPageNumber}`,
        name: `Page ${newPageNumber}`,
        elements: [],
        elementCounter: 0,
      };
      AppState.pages.push(newPage);
      this.updatePagesPanel();
      this.switchToPage(AppState.pages.length - 1);
    },
    deletePage: function (pageIndex) {
      if (AppState.pages.length <= 1) {
        alert("Cannot delete the last page!");
        return;
      }
      const pageName = AppState.pages[pageIndex].name;
      if (!confirm(`Are you sure you want to delete "${pageName}"?`)) {
        return;
      }
      AppState.pages.splice(pageIndex, 1);
      if (AppState.currentPageIndex >= pageIndex) {
        AppState.currentPageIndex = Math.max(0, AppState.currentPageIndex - 1);
      }
      this.switchToPage(AppState.currentPageIndex);
    },
    switchToPage: function (pageIndex) {
      if (pageIndex < 0 || pageIndex >= AppState.pages.length) return;
      if (AppState.pages[AppState.currentPageIndex]) {
        AppState.pages[AppState.currentPageIndex].elements = [
          ...AppState.elements,
        ];
        AppState.pages[AppState.currentPageIndex].elementCounter =
          AppState.elementCounter;
      }
      AppState.currentPageIndex = pageIndex;
      AppState.elements = [
        ...AppState.pages[AppState.currentPageIndex].elements,
      ];
      AppState.elementCounter =
        AppState.pages[AppState.currentPageIndex].elementCounter;
      CanvasManager.clearCanvas();
      AppState.elements.forEach((element) =>
        ElementRenderer.renderElement(element),
      );
      ElementManager.deselectElement();
      this.updatePagesPanel();
      LayerManager.updateLayersPanel();
      UIManager.updateElementCount();
      PropertiesPanel.clearPropertiesPanel();
      if (AppState.elements.length === 0) {
        UIManager.showCanvasPlaceholder();
      } else {
        UIManager.hideCanvasPlaceholder();
      }
    },
    updatePagesPanel: function () {
      const pagesList = document.querySelector(".pages-list");
      if (!pagesList) return;
      pagesList.innerHTML = "";
      AppState.pages.forEach((page, index) => {
        const pageItem = document.createElement("div");
        pageItem.className = "page-item";
        pageItem.style.cssText = `
                    padding: 0.5rem;
                    cursor: pointer;
                    border-radius: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.25rem;
                    transition: background 0.2s ease;
                    ${index === AppState.currentPageIndex ? "background: #58a6ff; color: white;" : "background: transparent; color: #f0f6fc;"}
                `;
        const pageContent = document.createElement("div");
        pageContent.style.cssText =
          "display: flex; align-items: center; gap: 0.5rem; flex: 1;";
        pageContent.innerHTML = `📄 ${page.name}`;
        pageContent.dataset.pageIndex = index;
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "×";
        deleteBtn.style.cssText = `
                    background: transparent;
                    border: none;
                    color: ${index === AppState.currentPageIndex ? "white" : "#7d8590"};
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 3px;
                    opacity: ${AppState.pages.length > 1 ? "1" : "0"};
                    pointer-events: ${AppState.pages.length > 1 ? "auto" : "none"};
                `;
        deleteBtn.title = "Delete page";
        deleteBtn.dataset.pageIndex = index;
        deleteBtn.dataset.action = "delete-page";
        pageItem.appendChild(pageContent);
        pageItem.appendChild(deleteBtn);
        pagesList.appendChild(pageItem);
      });
    },
  };

  const CanvasManager = {
    clearCanvas: function () {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;
      const elementsToRemove = canvas.querySelectorAll(".canvas-element");
      elementsToRemove.forEach((element) => element.remove());
    },
    handleCanvasClick: function (e) {
      if (AppState.currentTool === "select") {
        ElementManager.handleSelection(e);
      } else {
        ElementCreator.createElement(e);
      }
    },
    handleCanvasDoubleClick: function (e) {
      let target = e.target;
      while (target && !target.classList.contains("canvas-element")) {
        target = target.parentElement;
        if (!target || target === document.body) return;
      }
      if (target && target.classList.contains("canvas-element")) {
        const element = AppState.elements.find((el) => el.id === target.id);
        if (element && element.type === "text") {
          TextEditor.startTextEdit(element, target);
        }
      }
    },
  };

  const ElementCreator = {
    createElement: function (e) {
      const mousePos = Utils.getCanvasMousePosition(e);
      const dimensions =
        AppState.defaultDimensions[AppState.currentTool] ||
        AppState.defaultDimensions.rectangle;
      const constrainedX = Utils.clamp(
        mousePos.x - dimensions.width / 2,
        AppState.canvas.boundary,
        AppState.canvas.width - dimensions.width - AppState.canvas.boundary,
      );
      const constrainedY = Utils.clamp(
        mousePos.y - dimensions.height / 2,
        AppState.canvas.boundary,
        AppState.canvas.height - dimensions.height - AppState.canvas.boundary,
      );
      const element = {
        id: Utils.generateElementId(),
        type: AppState.currentTool,
        x: constrainedX,
        y: constrainedY,
        width: dimensions.width,
        height: dimensions.height,
        rotation: 0,
        backgroundColor: "#3b82f6",
        textContent: AppState.currentTool === "text" ? "Text" : "",
        zIndex: AppState.elements.length,
      };
      AppState.elements.push(element);
      ElementRenderer.renderElement(element);
      ElementManager.selectElement(element);
      LayerManager.updateLayersPanel();
      UIManager.updateElementCount();
      UIManager.hideCanvasPlaceholder();
    },
  };

  const ElementRenderer = {
    renderElement: function (element) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;
      const div = document.createElement("div");
      div.id = element.id;
      div.className = "canvas-element";
      div.dataset.elementId = element.id;
      div.style.cssText = `
                position: absolute;
                left: ${element.x}px;
                top: ${element.y}px;
                cursor: pointer;
                border: 2px solid transparent;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: inherit;
                font-size: 14px;
                color: white;
                user-select: none;
                z-index: ${element.zIndex};
                transform: rotate(${element.rotation}deg);
            `;
      this.applyShapeStyles(div, element);
      canvas.appendChild(div);
    },
    applyShapeStyles: function (div, element) {
      switch (element.type) {
        case "rectangle":
          this.styleRectangle(div, element);
          break;
        case "circle":
          this.styleCircle(div, element);
          break;
        case "triangle":
          this.styleTriangle(div, element);
          break;
        case "line":
          this.styleLine(div, element);
          break;
        case "text":
          this.styleText(div, element);
          break;
      }
    },
    styleRectangle: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = element.height + "px";
      div.style.backgroundColor = element.backgroundColor;
    },
    styleCircle: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = element.width + "px";
      div.style.backgroundColor = element.backgroundColor;
      div.style.borderRadius = "50%";
    },
    styleTriangle: function (div, element) {
      div.style.width = "0";
      div.style.height = "0";
      div.style.backgroundColor = "transparent";
      div.style.borderLeft = `${element.width / 2}px solid transparent`;
      div.style.borderRight = `${element.width / 2}px solid transparent`;
      div.style.borderBottom = `${element.height}px solid ${element.backgroundColor}`;
      div.style.borderTop = "none";
    },
    styleLine: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = "2px";
      div.style.backgroundColor = element.backgroundColor;
      div.style.borderRadius = "1px";
      const arrowHead = document.createElement("div");
      arrowHead.style.cssText = `
                position: absolute;
                right: -6px;
                top: -4px;
                width: 0;
                height: 0;
                border-left: 8px solid ${element.backgroundColor};
                border-top: 5px solid transparent;
                border-bottom: 5px solid transparent;
            `;
      div.appendChild(arrowHead);
    },
    styleText: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = element.height + "px";
      div.style.backgroundColor = "transparent";
      div.style.color = element.backgroundColor;
      div.style.border = `1px solid ${element.backgroundColor}`;
      div.style.padding = "4px";
      div.textContent = element.textContent;
    },
    updateElementDisplay: function (element) {
      const elementDiv = document.getElementById(element.id);
      if (!elementDiv) return;
      elementDiv.style.left = element.x + "px";
      elementDiv.style.top = element.y + "px";
      elementDiv.style.transform = `rotate(${element.rotation}deg)`;
      if (element.type === "line") {
        elementDiv.innerHTML = "";
      }
      this.applyShapeStyles(elementDiv, element);
    },
  };

  const ElementManager = {
    handleSelection: function (e) {
      const target = e.target.closest(".canvas-element");
      if (target) {
        const element = AppState.elements.find((el) => el.id === target.id);
        this.selectElement(element);
      } else {
        this.deselectElement();
      }
    },
    selectElement: function (element) {
      AppState.selectedElement = element;
      document.querySelectorAll(".canvas-element").forEach((el) => {
        el.style.border = "2px solid transparent";
        this.removeResizeHandles(el);
      });
      const elementDiv = document.getElementById(element.id);
      if (elementDiv) {
        elementDiv.style.border = "2px solid #0d99ff";
        this.addResizeHandles(elementDiv);
      }
      PropertiesPanel.updatePropertiesPanel(element);
      LayerManager.updateLayersPanel();
    },
    deselectElement: function () {
      if (AppState.selectedElement) {
        const elementDiv = document.getElementById(AppState.selectedElement.id);
        if (elementDiv) {
          elementDiv.style.border = "2px solid transparent";
          this.removeResizeHandles(elementDiv);
        }
      }
      AppState.selectedElement = null;
      PropertiesPanel.clearPropertiesPanel();
      LayerManager.updateLayersPanel();
    },
    addResizeHandles: function (elementDiv) {
      const handles = ["nw", "ne", "sw", "se"];
      handles.forEach((handle) => {
        const handleDiv = document.createElement("div");
        handleDiv.className = `resize-handle resize-${handle}`;
        handleDiv.dataset.handle = handle;
        handleDiv.style.cssText = `
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: #0d99ff;
                    border: 1px solid white;
                    cursor: ${handle}-resize;
                    z-index: 1000;
                `;
        switch (handle) {
          case "nw":
            handleDiv.style.cssText += "top: -4px; left: -4px;";
            break;
          case "ne":
            handleDiv.style.cssText += "top: -4px; right: -4px;";
            break;
          case "sw":
            handleDiv.style.cssText += "bottom: -4px; left: -4px;";
            break;
          case "se":
            handleDiv.style.cssText += "bottom: -4px; right: -4px;";
            break;
        }
        elementDiv.appendChild(handleDiv);
      });
      const rotateDiv = document.createElement("div");
      rotateDiv.className = "rotation-handle rotate-center";
      rotateDiv.innerHTML = "↻";
      rotateDiv.style.cssText = `
                position: absolute;
                width: 30px;
                height: 30px;
                background: red;
                border: 2px solid white;
                border-radius: 50%;
                cursor: grab;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                color: white;
                font-weight: bold;
                top: -40px;
                left: 50%;
                transform: translateX(-50%);
            `;
      rotateDiv.title = "Drag to rotate";
      elementDiv.appendChild(rotateDiv);
    },
    removeResizeHandles: function (elementDiv) {
      elementDiv
        .querySelectorAll(".resize-handle")
        .forEach((handle) => handle.remove());
      elementDiv
        .querySelectorAll(".rotation-handle")
        .forEach((handle) => handle.remove());
    },
    deleteElement: function () {
      if (!AppState.selectedElement) return;
      const elementDiv = document.getElementById(AppState.selectedElement.id);
      if (elementDiv) elementDiv.remove();
      AppState.elements = AppState.elements.filter(
        (el) => el.id !== AppState.selectedElement.id,
      );
      AppState.selectedElement = null;
      LayerManager.updateLayersPanel();
      UIManager.updateElementCount();
      PropertiesPanel.clearPropertiesPanel();
      if (AppState.elements.length === 0) {
        UIManager.showCanvasPlaceholder();
      }
    },
    moveElement: function (deltaX, deltaY) {
      if (!AppState.selectedElement) return;
      let newX = AppState.selectedElement.x + deltaX;
      let newY = AppState.selectedElement.y + deltaY;
      newX = Utils.clamp(
        newX,
        0,
        AppState.canvas.width - AppState.selectedElement.width,
      );
      newY = Utils.clamp(
        newY,
        0,
        AppState.canvas.height - AppState.selectedElement.height,
      );
      AppState.selectedElement.x = newX;
      AppState.selectedElement.y = newY;
      ElementRenderer.updateElementDisplay(AppState.selectedElement);
      PropertiesPanel.updatePropertiesPanel(AppState.selectedElement);
    },
    rotateElement: function (degrees) {
      if (!AppState.selectedElement) return;
      AppState.selectedElement.rotation = Utils.normalizeAngle(
        AppState.selectedElement.rotation + degrees,
      );
      ElementRenderer.updateElementDisplay(AppState.selectedElement);
      PropertiesPanel.updatePropertiesPanel(AppState.selectedElement);
    },
  };

  const MouseHandler = {
    handleMouseDown: function (e) {
      if (e.target.classList.contains("resize-handle")) {
        AppState.isResizing = true;
        AppState.resizeHandle = e.target.dataset.handle;
        e.preventDefault();
      } else if (e.target.classList.contains("rotation-handle")) {
        AppState.isRotating = true;
        AppState.rotationStartAngle = Utils.getAngleFromCenter(
          e,
          AppState.selectedElement,
        );
        e.target.style.cursor = "grabbing";
        e.preventDefault();
      } else if (e.target.classList.contains("canvas-element")) {
        AppState.isDragging = true;
        const element = AppState.elements.find((el) => el.id === e.target.id);
        if (element) {
          ElementManager.selectElement(element);
          const mousePos = Utils.getCanvasMousePosition(e);
          AppState.dragOffset = {
            x: mousePos.x - element.x,
            y: mousePos.y - element.y,
          };
        }
      }
    },
    handleMouseMove: function (e) {
      if (AppState.isDragging && AppState.selectedElement) {
        this.dragElement(e);
      } else if (AppState.isResizing && AppState.selectedElement) {
        this.resizeElement(e);
      } else if (AppState.isRotating && AppState.selectedElement) {
        this.rotateElementWithMouse(e);
      }
    },
    handleMouseUp: function (e) {
      if (AppState.isRotating) {
        document.querySelectorAll(".rotation-handle").forEach((handle) => {
          handle.style.cursor = "grab";
        });
      }
      AppState.isDragging = false;
      AppState.isResizing = false;
      AppState.isRotating = false;
      AppState.resizeHandle = null;
      AppState.rotationStartAngle = 0;
    },
    dragElement: function (e) {
      const mousePos = Utils.getCanvasMousePosition(e);
      let newX = mousePos.x - AppState.dragOffset.x;
      let newY = mousePos.y - AppState.dragOffset.y;
      newX = Utils.clamp(
        newX,
        0,
        AppState.canvas.width - AppState.selectedElement.width,
      );
      newY = Utils.clamp(
        newY,
        0,
        AppState.canvas.height - AppState.selectedElement.height,
      );
      AppState.selectedElement.x = newX;
      AppState.selectedElement.y = newY;
      const elementDiv = document.getElementById(AppState.selectedElement.id);
      if (elementDiv) {
        elementDiv.style.left = newX + "px";
        elementDiv.style.top = newY + "px";
      }
      PropertiesPanel.updatePropertiesPanel(AppState.selectedElement);
    },
    resizeElement: function (e) {
      const mousePos = Utils.getCanvasMousePosition(e);
      let newWidth = AppState.selectedElement.width;
      let newHeight = AppState.selectedElement.height;
      let newX = AppState.selectedElement.x;
      let newY = AppState.selectedElement.y;
      switch (AppState.resizeHandle) {
        case "se":
          newWidth = Math.max(
            AppState.canvas.minElementSize,
            Math.min(
              mousePos.x - AppState.selectedElement.x,
              AppState.canvas.width - AppState.selectedElement.x,
            ),
          );
          newHeight = Math.max(
            AppState.canvas.minElementSize,
            Math.min(
              mousePos.y - AppState.selectedElement.y,
              AppState.canvas.height - AppState.selectedElement.y,
            ),
          );
          break;
        case "sw":
          newWidth = Math.max(
            AppState.canvas.minElementSize,
            AppState.selectedElement.x +
              AppState.selectedElement.width -
              Math.max(0, mousePos.x),
          );
          newHeight = Math.max(
            AppState.canvas.minElementSize,
            Math.min(
              mousePos.y - AppState.selectedElement.y,
              AppState.canvas.height - AppState.selectedElement.y,
            ),
          );
          newX = Math.max(
            0,
            AppState.selectedElement.x +
              AppState.selectedElement.width -
              newWidth,
          );
          break;
        case "ne":
          newWidth = Math.max(
            AppState.canvas.minElementSize,
            Math.min(
              mousePos.x - AppState.selectedElement.x,
              AppState.canvas.width - AppState.selectedElement.x,
            ),
          );
          newHeight = Math.max(
            AppState.canvas.minElementSize,
            AppState.selectedElement.y +
              AppState.selectedElement.height -
              Math.max(0, mousePos.y),
          );
          newY = Math.max(
            0,
            AppState.selectedElement.y +
              AppState.selectedElement.height -
              newHeight,
          );
          break;
        case "nw":
          newWidth = Math.max(
            AppState.canvas.minElementSize,
            AppState.selectedElement.x +
              AppState.selectedElement.width -
              Math.max(0, mousePos.x),
          );
          newHeight = Math.max(
            AppState.canvas.minElementSize,
            AppState.selectedElement.y +
              AppState.selectedElement.height -
              Math.max(0, mousePos.y),
          );
          newX = Math.max(
            0,
            AppState.selectedElement.x +
              AppState.selectedElement.width -
              newWidth,
          );
          newY = Math.max(
            0,
            AppState.selectedElement.y +
              AppState.selectedElement.height -
              newHeight,
          );
          break;
      }
      if (AppState.selectedElement.type === "circle") {
        const avgSize = Math.min(newWidth, newHeight);
        newWidth = avgSize;
        newHeight = avgSize;
        if (AppState.resizeHandle === "sw" || AppState.resizeHandle === "nw") {
          newX =
            AppState.selectedElement.x +
            AppState.selectedElement.width -
            newWidth;
        }
        if (AppState.resizeHandle === "ne" || AppState.resizeHandle === "nw") {
          newY =
            AppState.selectedElement.y +
            AppState.selectedElement.height -
            newHeight;
        }
      }
      if (newX + newWidth > AppState.canvas.width) {
        newWidth = AppState.canvas.width - newX;
      }
      if (newY + newHeight > AppState.canvas.height) {
        newHeight = AppState.canvas.height - newY;
      }
      AppState.selectedElement.width = newWidth;
      AppState.selectedElement.height = newHeight;
      AppState.selectedElement.x = newX;
      AppState.selectedElement.y = newY;
      ElementRenderer.updateElementDisplay(AppState.selectedElement);
      PropertiesPanel.updatePropertiesPanel(AppState.selectedElement);
    },
    rotateElementWithMouse: function (e) {
      const currentAngle = Utils.getAngleFromCenter(
        e,
        AppState.selectedElement,
      );
      let angleDiff = currentAngle - AppState.rotationStartAngle;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      AppState.selectedElement.rotation = Utils.normalizeAngle(
        AppState.selectedElement.rotation + angleDiff,
      );
      AppState.rotationStartAngle = currentAngle;
      ElementRenderer.updateElementDisplay(AppState.selectedElement);
      PropertiesPanel.updatePropertiesPanel(AppState.selectedElement);
    },
  };

  const TextEditor = {
    startTextEdit: function (element, elementDiv) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = element.textContent;
      input.className = "text-editor";
      input.style.cssText = `
                position: absolute;
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                font-size: 14px;
                font-family: inherit;
                color: ${element.backgroundColor};
                background: transparent;
                border: 2px solid ${element.backgroundColor};
                border-radius: 0;
                padding: 4px;
                z-index: 10000;
                outline: none;
            `;
      const canvas = document.getElementById("canvas");
      if (canvas) {
        canvas.appendChild(input);
        input.focus();
        input.select();
        input.addEventListener("blur", () =>
          this.finishTextEdit(element, elementDiv, input),
        );
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            this.finishTextEdit(element, elementDiv, input);
          } else if (e.key === "Escape") {
            input.remove();
          }
        });
      }
    },
    finishTextEdit: function (element, elementDiv, input) {
      element.textContent = input.value || "Text";
      ElementRenderer.updateElementDisplay(element);
      if (
        AppState.selectedElement &&
        AppState.selectedElement.id === element.id
      ) {
        PropertiesPanel.updatePropertiesPanel(element);
      }
      input.remove();
    },
  };

  const PropertiesPanel = {
    updatePropertiesPanel: function (element) {
      const widthInput = document.getElementById("widthInput");
      const heightInput = document.getElementById("heightInput");
      const rotationInput = document.getElementById("rotationInput");
      const backgroundColorInput = document.getElementById(
        "backgroundColorInput",
      );
      const colorHex = document.querySelector(".color-hex");
      const textGroup = document.getElementById("textContentGroup");
      const textContentInput = document.getElementById("textContentInput");

      if (widthInput) widthInput.value = element.width;
      if (heightInput) heightInput.value = element.height;
      if (rotationInput) rotationInput.value = element.rotation;
      if (backgroundColorInput)
        backgroundColorInput.value = element.backgroundColor;
      if (colorHex) colorHex.textContent = element.backgroundColor;

      if (textGroup) {
        if (element.type === "text") {
          textGroup.style.display = "block";
          if (textContentInput) textContentInput.value = element.textContent;
        } else {
          textGroup.style.display = "none";
        }
      }
    },
    clearPropertiesPanel: function () {
      const widthInput = document.getElementById("widthInput");
      const heightInput = document.getElementById("heightInput");
      const rotationInput = document.getElementById("rotationInput");
      const backgroundColorInput = document.getElementById(
        "backgroundColorInput",
      );
      const colorHex = document.querySelector(".color-hex");
      const textGroup = document.getElementById("textContentGroup");

      if (widthInput) widthInput.value = "";
      if (heightInput) heightInput.value = "";
      if (rotationInput) rotationInput.value = "";
      if (backgroundColorInput) backgroundColorInput.value = "#3b82f6";
      if (colorHex) colorHex.textContent = "#3b82f6";
      if (textGroup) textGroup.style.display = "none";
    },
    updateProperty: function (property, value) {
      if (!AppState.selectedElement) return;
      switch (property) {
        case "width":
          AppState.selectedElement.width = Math.max(
            AppState.canvas.minElementSize,
            parseInt(value) || AppState.canvas.minElementSize,
          );
          if (AppState.selectedElement.type === "circle") {
            AppState.selectedElement.height = AppState.selectedElement.width;
            const heightInput = document.getElementById("heightInput");
            if (heightInput) heightInput.value = AppState.selectedElement.width;
          }
          if (
            AppState.selectedElement.x + AppState.selectedElement.width >
            AppState.canvas.width
          ) {
            AppState.selectedElement.x =
              AppState.canvas.width - AppState.selectedElement.width;
          }
          break;
        case "height":
          AppState.selectedElement.height = Math.max(
            AppState.canvas.minElementSize,
            parseInt(value) || AppState.canvas.minElementSize,
          );
          if (AppState.selectedElement.type === "circle") {
            AppState.selectedElement.width = AppState.selectedElement.height;
            const widthInput = document.getElementById("widthInput");
            if (widthInput) widthInput.value = AppState.selectedElement.height;
          }
          if (
            AppState.selectedElement.y + AppState.selectedElement.height >
            AppState.canvas.height
          ) {
            AppState.selectedElement.y =
              AppState.canvas.height - AppState.selectedElement.height;
          }
          break;
        case "rotation":
          AppState.selectedElement.rotation = parseInt(value) || 0;
          break;
        case "backgroundColor":
          AppState.selectedElement.backgroundColor = value;
          const colorHex = document.querySelector(".color-hex");
          if (colorHex) colorHex.textContent = value;
          break;
        case "textContent":
          AppState.selectedElement.textContent = value;
          break;
      }
      ElementRenderer.updateElementDisplay(AppState.selectedElement);
      this.updatePropertiesPanel(AppState.selectedElement);
    },
  };

  const LayerManager = {
    updateLayersPanel: function () {
      const layersList = document.getElementById("layersList");
      if (!layersList) return;
      if (AppState.elements.length === 0) {
        layersList.innerHTML = `
                    <div class="layer-item">
                        <span class="layer-icon">📄</span>
                        <span class="layer-name">No elements</span>
                    </div>
                `;
        return;
      }
      layersList.innerHTML = "";
      const sortedElements = [...AppState.elements].sort(
        (a, b) => b.zIndex - a.zIndex,
      );
      sortedElements.forEach((element) => {
        const layerItem = document.createElement("div");
        layerItem.className = "layer-item";
        layerItem.id = `layer-${element.id}`;
        layerItem.dataset.elementId = element.id;
        const isSelected =
          AppState.selectedElement &&
          AppState.selectedElement.id === element.id;
        layerItem.style.cssText = `
                    padding: 0.5rem;
                    cursor: pointer;
                    border-radius: 0.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: background 0.2s ease;
                    margin-bottom: 0.5rem;
                    ${isSelected ? "background: #58a6ff; color: white;" : ""}
                `;
        const icon = this.getElementIcon(element.type);
        layerItem.innerHTML = `
                    <span class="layer-icon">${icon}</span>
                    <span class="layer-name">${element.type} ${element.id.split("_")[1]}</span>
                `;
        layersList.appendChild(layerItem);
      });
      this.scrollToSelectedLayer();
    },
    getElementIcon: function (type) {
      const icons = {
        text: "📝",
        circle: "⭕",
        rectangle: "📦",
        triangle: "🔺",
        line: "📏",
      };
      return icons[type] || "📦";
    },
    scrollToSelectedLayer: function () {
      if (!AppState.selectedElement) return;
      const layerItem = document.getElementById(
        `layer-${AppState.selectedElement.id}`,
      );
      const layersList = document.getElementById("layersList");
      if (layerItem && layersList) {
        layerItem.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        layerItem.style.transform = "scale(1.02)";
        setTimeout(() => {
          layerItem.style.transform = "scale(1)";
        }, 200);
      }
    },
    moveLayer: function (direction) {
      if (!AppState.selectedElement) return;
      const visualOrder = [...AppState.elements].sort(
        (a, b) => b.zIndex - a.zIndex,
      );
      const currentIndex = visualOrder.findIndex(
        (el) => el.id === AppState.selectedElement.id,
      );
      if (currentIndex === -1) return;
      let targetIndex;
      if (direction === "up") {
        targetIndex = currentIndex - 1;
      } else if (direction === "down") {
        targetIndex = currentIndex + 1;
      }
      if (targetIndex < 0) {
        targetIndex = visualOrder.length - 1;
      } else if (targetIndex >= visualOrder.length) {
        targetIndex = 0;
      }
      const targetElement = visualOrder[targetIndex];
      ElementManager.selectElement(targetElement);
    },
  };

  const ToolManager = {
    selectTool: function (tool) {
      AppState.currentTool = tool;
      document
        .querySelectorAll(".tool-btn")
        .forEach((btn) => btn.classList.remove("active"));
      const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
      if (toolBtn) toolBtn.classList.add("active");
      const currentToolEl = document.getElementById("currentTool");
      if (currentToolEl) currentToolEl.textContent = AppState.tools[tool];
      const canvas = document.getElementById("canvas");
      if (canvas)
        canvas.style.cursor = tool === "select" ? "default" : "crosshair";
    },
  };

  const ZoomManager = {
    handleZoom: function (isZoomIn) {
      if (isZoomIn) {
        AppState.zoomLevel = Math.min(
          AppState.zoomLevel + AppState.zoom.step,
          AppState.zoom.max,
        );
      } else {
        AppState.zoomLevel = Math.max(
          AppState.zoomLevel - AppState.zoom.step,
          AppState.zoom.min,
        );
      }
      this.applyZoom();
      this.updateZoomDisplay();
    },
    applyZoom: function () {
      const canvas = document.getElementById("canvas");
      const canvasWrapper = canvas ? canvas.parentElement : null;
      if (!canvas || !canvasWrapper) return;
      canvas.style.transform = `scale(${AppState.zoomLevel})`;
      canvas.style.transformOrigin = "center center";
      canvas.style.position = "relative";
      canvas.style.margin = "auto";
      canvas.style.display = "block";
      canvas.style.overflow = "hidden";
      canvasWrapper.style.display = "flex";
      canvasWrapper.style.alignItems = "center";
      canvasWrapper.style.justifyContent = "center";
      canvasWrapper.style.overflow = "auto";
      canvasWrapper.style.padding = "50px";
    },
    updateZoomDisplay: function () {
      const zoomDisplay = document.querySelector(".zoom-level");
      if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(AppState.zoomLevel * 100) + "%";
      }
    },
    resetZoom: function () {
      AppState.zoomLevel = 1;
      this.applyZoom();
      this.updateZoomDisplay();
    },
  };

  const KeyboardHandler = {
    handleKeyDown: function (e) {
      if (!AppState.selectedElement) return;
      switch (e.key) {
        case "Delete":
        case "Backspace":
          ElementManager.deleteElement();
          break;
        case "ArrowUp":
          e.preventDefault();
          ElementManager.moveElement(0, -5);
          break;
        case "ArrowDown":
          e.preventDefault();
          ElementManager.moveElement(0, 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          ElementManager.moveElement(-5, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          ElementManager.moveElement(5, 0);
          break;
        case "r":
        case "R":
          e.preventDefault();
          ElementManager.rotateElement(15);
          break;
        case "e":
        case "E":
          e.preventDefault();
          ElementManager.rotateElement(-15);
          break;
        case "[":
          e.preventDefault();
          ElementManager.rotateElement(-5);
          break;
        case "]":
          e.preventDefault();
          ElementManager.rotateElement(5);
          break;
      }
    },
    handleMouseWheel: function (e) {
      const canvas = document.getElementById("canvas");
      const canvasWrapper = canvas ? canvas.parentElement : null;
      if (!canvasWrapper) return;
      const rect = canvasWrapper.getBoundingClientRect();
      const isOverCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isOverCanvas) return;
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        const isZoomIn = e.deltaY < 0;
        ZoomManager.handleZoom(isZoomIn);
      } else if (e.ctrlKey && AppState.selectedElement) {
        e.preventDefault();
        const rotationAmount = e.deltaY > 0 ? 5 : -5;
        ElementManager.rotateElement(rotationAmount);
      }
    },
  };

  const UIManager = {
    updateElementCount: function () {
      const elementCount = document.getElementById("elementCount");
      if (elementCount) elementCount.textContent = AppState.elements.length;
    },
    hideCanvasPlaceholder: function () {
      const placeholder = document.querySelector(".canvas-placeholder");
      if (placeholder) placeholder.style.display = "none";
    },
    showCanvasPlaceholder: function () {
      const placeholder = document.querySelector(".canvas-placeholder");
      if (placeholder) placeholder.style.display = "flex";
    },
    updateUI: function () {
      this.updateElementCount();
      LayerManager.updateLayersPanel();
    },
  };

  const StorageManager = {
    saveToStorage: function () {
      if (AppState.pages[AppState.currentPageIndex]) {
        AppState.pages[AppState.currentPageIndex].elements = [
          ...AppState.elements,
        ];
        AppState.pages[AppState.currentPageIndex].elementCounter =
          AppState.elementCounter;
      }
      const data = {
        pages: AppState.pages,
        currentPageIndex: AppState.currentPageIndex,
      };
      localStorage.setItem("figmaDesignTool", JSON.stringify(data));
      const saveStatus = document.querySelector(".save-status");
      if (saveStatus) {
        saveStatus.textContent = "✓";
        saveStatus.style.color = "#238636";
        setTimeout(() => {
          saveStatus.textContent = "●";
        }, 2000);
      }
    },
    loadFromStorage: function () {
      const saved = localStorage.getItem("figmaDesignTool");
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.pages) {
        AppState.pages = data.pages;
        AppState.currentPageIndex = data.currentPageIndex || 0;
        if (AppState.pages[AppState.currentPageIndex]) {
          AppState.elements = [
            ...AppState.pages[AppState.currentPageIndex].elements,
          ];
          AppState.elementCounter =
            AppState.pages[AppState.currentPageIndex].elementCounter || 0;
        }
      } else {
        AppState.elements = data.elements || [];
        AppState.elementCounter = data.elementCounter || 0;
        AppState.pages[0].elements = [...AppState.elements];
        AppState.pages[0].elementCounter = AppState.elementCounter;
      }
      AppState.elements.forEach((element) => {
        ElementRenderer.renderElement(element);
      });
      if (AppState.elements.length > 0) {
        UIManager.hideCanvasPlaceholder();
      }
    },
  };

  const ExportManager = {
    exportJSON: function () {
      const data = {
        elements: AppState.elements,
        metadata: {
          created: new Date().toISOString(),
          tool: "Figma-Style Design Tool",
        },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      this.downloadFile(blob, "design.json");
    },
    exportHTML: function () {
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Design</title>
    <style>
        body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
        .canvas { position: relative; width: 800px; height: 600px; background: white; border: 1px solid #ccc; }
        .element { position: absolute; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <div class="canvas">
`;
      AppState.elements.forEach((element) => {
        let style = `
                    left: ${element.x}px;
                    top: ${element.y}px;
                    width: ${element.width}px;
                    height: ${element.height}px;
                    background-color: ${element.backgroundColor};
                    transform: rotate(${element.rotation}deg);
                    z-index: ${element.zIndex};
                `;
        if (element.type === "circle") {
          style += "border-radius: 50%;";
        } else if (element.type === "text") {
          style += `color: ${element.backgroundColor}; background: transparent; border: 1px solid ${element.backgroundColor};`;
        }
        const content = element.type === "text" ? element.textContent : "";
        html += `        <div class="element" style="${style}">${content}</div>\n`;
      });
      html += `    </div>
</body>
</html>`;
      const blob = new Blob([html], { type: "text/html" });
      this.downloadFile(blob, "design.html");
    },
    downloadFile: function (blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };

  const EventHandler = {
    init: function () {
      document.addEventListener("click", this.handleClick.bind(this));
      document.addEventListener("mousedown", this.handleMouseDown.bind(this));
      document.addEventListener("mousemove", this.handleMouseMove.bind(this));
      document.addEventListener("mouseup", this.handleMouseUp.bind(this));
      document.addEventListener("dblclick", this.handleDoubleClick.bind(this));
      document.addEventListener("wheel", this.handleWheel.bind(this));
      document.addEventListener("keydown", this.handleKeyDown.bind(this));
      document.addEventListener("input", this.handleInput.bind(this));
    },
    handleClick: function (e) {
      if (e.target.classList.contains("tool-btn")) {
        const tool = e.target.closest(".tool-btn").dataset.tool;
        if (tool) ToolManager.selectTool(tool);
      } else if (e.target.classList.contains("zoom-btn")) {
        const isZoomIn = e.target.textContent === "+";
        ZoomManager.handleZoom(isZoomIn);
      } else if (e.target.classList.contains("layer-btn")) {
        const action = e.target.title.includes("Up") ? "up" : "down";
        LayerManager.moveLayer(action);
      } else if (e.target.classList.contains("add-btn")) {
        PageManager.addNewPage();
      } else if (e.target.dataset.action === "delete-page") {
        const pageIndex = parseInt(e.target.dataset.pageIndex);
        PageManager.deletePage(pageIndex);
      } else if (e.target.closest("[data-page-index]")) {
        const pageIndex = parseInt(
          e.target.closest("[data-page-index]").dataset.pageIndex,
        );
        PageManager.switchToPage(pageIndex);
      } else if (e.target.id === "exportJSONBtn") {
        ExportManager.exportJSON();
      } else if (e.target.id === "exportHTMLBtn") {
        ExportManager.exportHTML();
      } else if (e.target.id === "status-btn") {
        StorageManager.saveToStorage();
      } else if (
        e.target.classList.contains("layer-item") ||
        e.target.closest(".layer-item")
      ) {
        const layerItem = e.target.classList.contains("layer-item")
          ? e.target
          : e.target.closest(".layer-item");
        const elementId = layerItem.dataset.elementId;
        const element = AppState.elements.find((e) => e.id === elementId);
        if (element) ElementManager.selectElement(element);
      } else if (e.target.id === "canvas" || e.target.closest("#canvas")) {
        CanvasManager.handleCanvasClick(e);
      }
    },
    handleMouseDown: function (e) {
      if (e.target.closest("#canvas")) {
        MouseHandler.handleMouseDown(e);
      }
    },
    handleMouseMove: function (e) {
      if (
        e.target.closest("#canvas") ||
        AppState.isDragging ||
        AppState.isResizing ||
        AppState.isRotating
      ) {
        MouseHandler.handleMouseMove(e);
      }
    },
    handleMouseUp: function (e) {
      MouseHandler.handleMouseUp(e);
    },
    handleDoubleClick: function (e) {
      if (e.target.closest("#canvas")) {
        CanvasManager.handleCanvasDoubleClick(e);
      }
    },
    handleWheel: function (e) {
      KeyboardHandler.handleMouseWheel(e);
    },
    handleKeyDown: function (e) {
      KeyboardHandler.handleKeyDown(e);
    },
    handleInput: function (e) {
      if (e.target.id === "widthInput") {
        PropertiesPanel.updateProperty("width", e.target.value);
      } else if (e.target.id === "heightInput") {
        PropertiesPanel.updateProperty("height", e.target.value);
      } else if (e.target.id === "rotationInput") {
        PropertiesPanel.updateProperty("rotation", e.target.value);
      } else if (e.target.id === "backgroundColorInput") {
        PropertiesPanel.updateProperty("backgroundColor", e.target.value);
      } else if (e.target.id === "textContentInput") {
        PropertiesPanel.updateProperty("textContent", e.target.value);
      }
    },
  };

  const App = {
    init: function () {
      EventHandler.init();
      StorageManager.loadFromStorage();
      UIManager.updateUI();
      PageManager.updatePagesPanel();
      ZoomManager.updateZoomDisplay();
      ZoomManager.applyZoom();
    },
  };

  document.addEventListener("DOMContentLoaded", App.init);
})();
