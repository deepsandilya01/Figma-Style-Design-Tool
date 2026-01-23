// Figma-Style Design Tool - Main Application
(function () {
  "use strict";

  // Main application state - stores all elements, current tool, zoom level, etc.
  const AppState = {
    elements: [],
    selectedElement: null,
    elementCounter: 0,
    zIndexCounter: 0,
    zoomLevel: 1,
    currentTool: "select",
    isDragging: false,
    isResizing: false,
    isRotating: false,
    isPanning: false,
    isDrawing: false,
    dragOffset: { x: 0, y: 0 },
    panOffset: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    currentPath: null,
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
      minElementSize: 0,
      boundary: 5,
    },
    tools: {
      select: "Select Tool",
      pan: "Pan Tool",
      pen: "Pen Tool",
      eraser: "Eraser Tool",
      rectangle: "Rectangle",
      circle: "Circle",
      triangle: "Triangle",
      star: "Star",
      line: "Line",
      text: "Text Box",
    },
    defaultDimensions: {
      rectangle: { width: 120, height: 80 },
      circle: { width: 100, height: 100 },
      triangle: { width: 100, height: 80 },
      star: { width: 100, height: 100 },
      line: { width: 150, height: 2 },
      text: { width: 120, height: 40 },
    },
    zoom: {
      step: 0.1,
      min: 0.25,
      max: 3,
    },
    // History management for undo/redo
    history: {
      states: [],
      currentIndex: -1,
      maxStates: 50,
    },
  };

  // History management system for undo/redo functionality
  const HistoryManager = {
    saveState: function () {
      // Create a deep copy of current state
      const currentState = {
        elements: JSON.parse(JSON.stringify(AppState.elements)),
        elementCounter: AppState.elementCounter,
        selectedElementId: AppState.selectedElement
          ? AppState.selectedElement.id
          : null,
        timestamp: Date.now(),
      };

      // Remove states after current index (when user made changes after undo)
      AppState.history.states = AppState.history.states.slice(
        0,
        AppState.history.currentIndex + 1,
      );

      // Add new state
      AppState.history.states.push(currentState);
      AppState.history.currentIndex++;

      // Limit history size
      if (AppState.history.states.length > AppState.history.maxStates) {
        AppState.history.states.shift();
        AppState.history.currentIndex--;
      }

      this.updateUndoRedoButtons();
    },

    undo: function () {
      if (!this.canUndo()) return;

      AppState.history.currentIndex--;
      this.restoreState();
      this.updateUndoRedoButtons();
    },

    redo: function () {
      if (!this.canRedo()) return;

      AppState.history.currentIndex++;
      this.restoreState();
      this.updateUndoRedoButtons();
    },

    canUndo: function () {
      return AppState.history.currentIndex > 0;
    },

    canRedo: function () {
      return AppState.history.currentIndex < AppState.history.states.length - 1;
    },

    restoreState: function () {
      const state = AppState.history.states[AppState.history.currentIndex];
      if (!state) return;

      // Clear current canvas
      CanvasManager.clearCanvas();

      // Restore elements
      AppState.elements = JSON.parse(JSON.stringify(state.elements));
      AppState.elementCounter = state.elementCounter;

      // Re-render all elements
      AppState.elements.forEach((element) => {
        ElementRenderer.renderElement(element);
      });

      // Restore selection
      if (state.selectedElementId) {
        const selectedElement = AppState.elements.find(
          (el) => el.id === state.selectedElementId,
        );
        if (selectedElement) {
          ElementManager.selectElement(selectedElement);
        } else {
          ElementManager.deselectElement();
        }
      } else {
        ElementManager.deselectElement();
      }

      // Update UI
      LayerManager.updateLayersPanel();
      UIManager.updateElementCount();

      if (AppState.elements.length === 0) {
        UIManager.showCanvasPlaceholder();
      } else {
        UIManager.hideCanvasPlaceholder();
      }
    },

    updateUndoRedoButtons: function () {
      const undoBtn = document.getElementById("undoBtn");
      const redoBtn = document.getElementById("redoBtn");

      if (undoBtn) {
        undoBtn.disabled = !this.canUndo();
        undoBtn.style.opacity = this.canUndo() ? "1" : "0.4";
      }

      if (redoBtn) {
        redoBtn.disabled = !this.canRedo();
        redoBtn.style.opacity = this.canRedo() ? "1" : "0.4";
      }
    },

    initialize: function () {
      // Save initial state
      this.saveState();
      this.updateUndoRedoButtons();
    },
  };

  // Drawing manager for pen tool and eraser functionality
  const DrawingManager = {
    startDrawing: function (e) {
      if (AppState.currentTool !== "pen") return;

      AppState.isDrawing = true;
      const mousePos = Utils.getCanvasMousePosition(e);

      // Create new path element with highest z-index using pure DOM approach
      const maxZIndex = ++AppState.zIndexCounter;
      const pathElement = {
        id: Utils.generateElementId(),
        type: "path",
        points: [{ x: mousePos.x, y: mousePos.y }],
        x: mousePos.x,
        y: mousePos.y,
        width: 2,
        height: 2,
        rotation: 0,
        backgroundColor: "#3b82f6",
        borderColor: "#000000",
        borderWidth: 2,
        strokeWidth: 2,
        zIndex: maxZIndex,
        pathDivs: [], // Store individual div elements for the path
      };

      AppState.currentPath = pathElement;
      AppState.elements.push(pathElement);

      // Create first point as a small div
      this.addPathPoint(pathElement, mousePos.x, mousePos.y);

      UIManager.hideCanvasPlaceholder();
    },

    startErasing: function (e) {
      if (AppState.currentTool !== "eraser") return;

      AppState.isDrawing = true;
      const mousePos = Utils.getCanvasMousePosition(e);

      // Start erasing at current position
      this.eraseAtPosition(mousePos.x, mousePos.y);
    },

    continueDrawing: function (e) {
      if (!AppState.isDrawing) return;

      if (AppState.currentTool === "pen" && AppState.currentPath) {
        this.continuePenDrawing(e);
      } else if (AppState.currentTool === "eraser") {
        this.continueErasing(e);
      }
    },

    continuePenDrawing: function (e) {
      const mousePos = Utils.getCanvasMousePosition(e);
      const lastPoint =
        AppState.currentPath.points[AppState.currentPath.points.length - 1];

      // Only add point if it's far enough from last point (smooth drawing)
      const distance = Math.sqrt(
        Math.pow(mousePos.x - lastPoint.x, 2) +
          Math.pow(mousePos.y - lastPoint.y, 2),
      );

      if (distance > 3) {
        AppState.currentPath.points.push({ x: mousePos.x, y: mousePos.y });

        // Add visual connection between points using div elements
        this.addPathPoint(AppState.currentPath, mousePos.x, mousePos.y);
        this.connectPoints(AppState.currentPath, lastPoint, {
          x: mousePos.x,
          y: mousePos.y,
        });

        // Update bounding box
        this.updatePathBounds(AppState.currentPath);
      }
    },

    continueErasing: function (e) {
      const mousePos = Utils.getCanvasMousePosition(e);
      this.eraseAtPosition(mousePos.x, mousePos.y);
    },

    finishDrawing: function () {
      if (!AppState.isDrawing) return;

      AppState.isDrawing = false;

      if (AppState.currentTool === "pen" && AppState.currentPath) {
        this.finishPenDrawing();
      } else if (AppState.currentTool === "eraser") {
        this.finishErasing();
      }
    },

    finishPenDrawing: function () {
      // Finalize the path
      if (AppState.currentPath.points.length < 3) {
        // Remove path if too short
        this.removePathElements(AppState.currentPath);
        AppState.elements = AppState.elements.filter(
          (el) => el.id !== AppState.currentPath.id,
        );
      } else {
        // Select the completed path
        ElementManager.selectElement(AppState.currentPath);
        LayerManager.updateLayersPanel();
        UIManager.updateElementCount();

        // Auto-switch to select tool after drawing
        ToolManager.selectTool("select");

        // Save state for undo/redo
        HistoryManager.saveState();
      }

      AppState.currentPath = null;
    },

    finishErasing: function () {
      // Save state after erasing
      HistoryManager.saveState();
      LayerManager.updateLayersPanel();
      UIManager.updateElementCount();

      // Check if canvas is empty
      if (AppState.elements.length === 0) {
        UIManager.showCanvasPlaceholder();
      }
    },

    eraseAtPosition: function (x, y) {
      const eraseRadius = 15; // Increased eraser size for better usability
      const elementsToRemove = [];

      // Check all path elements for collision with eraser
      AppState.elements.forEach((element) => {
        if (element.type === "path" && element.pathDivs) {
          const divsToRemove = [];

          // Check each path div for collision
          element.pathDivs.forEach((div, index) => {
            const divRect = div.getBoundingClientRect();
            const canvas = document.getElementById("canvas");
            const canvasRect = canvas.getBoundingClientRect();

            // Convert div position to canvas coordinates
            const divX = (divRect.left - canvasRect.left) / AppState.zoomLevel;
            const divY = (divRect.top - canvasRect.top) / AppState.zoomLevel;

            // Check if eraser overlaps with this div
            const distance = Math.sqrt(
              Math.pow(x - divX, 2) + Math.pow(y - divY, 2),
            );

            if (distance <= eraseRadius) {
              divsToRemove.push({ div, index });
            }
          });

          // Remove colliding divs with visual feedback
          divsToRemove.forEach(({ div, index }) => {
            // Add erasing animation
            div.style.transition = "opacity 0.1s ease-out";
            div.style.opacity = "0";

            setTimeout(() => {
              if (div.parentNode) {
                div.parentNode.removeChild(div);
              }
            }, 100);

            element.pathDivs.splice(element.pathDivs.indexOf(div), 1);

            // Also remove corresponding point
            if (element.points && element.points[index]) {
              element.points.splice(index, 1);
            }
          });

          // If path has too few elements left, mark for complete removal
          if (element.pathDivs.length < 2 || element.points.length < 2) {
            elementsToRemove.push(element);
          } else {
            // Update path bounds
            this.updatePathBounds(element);
          }
        }
      });

      // Remove completely erased paths
      elementsToRemove.forEach((element) => {
        this.removePathElements(element);
        AppState.elements = AppState.elements.filter(
          (el) => el.id !== element.id,
        );

        // If this was the selected element, deselect it
        if (
          AppState.selectedElement &&
          AppState.selectedElement.id === element.id
        ) {
          ElementManager.deselectElement();
        }
      });
    },

    addPathPoint: function (pathElement, x, y) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;

      // Create a small div for each point
      const pointDiv = document.createElement("div");
      pointDiv.className = "path-point";
      pointDiv.style.cssText = `
        position: absolute;
        left: ${x - 1}px;
        top: ${y - 1}px;
        width: ${pathElement.strokeWidth}px;
        height: ${pathElement.strokeWidth}px;
        background-color: ${pathElement.backgroundColor};
        border-radius: 50%;
        pointer-events: auto;
        cursor: pointer;
        z-index: ${pathElement.zIndex};
      `;

      canvas.appendChild(pointDiv);

      // Store reference to the div
      if (!pathElement.pathDivs) pathElement.pathDivs = [];
      pathElement.pathDivs.push(pointDiv);
    },

    connectPoints: function (pathElement, point1, point2) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;

      // Calculate line properties
      const deltaX = point2.x - point1.x;
      const deltaY = point2.y - point1.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Create a div to represent the line between points
      const lineDiv = document.createElement("div");
      lineDiv.className = "path-line";
      lineDiv.style.cssText = `
        position: absolute;
        left: ${point1.x}px;
        top: ${point1.y - pathElement.strokeWidth / 2}px;
        width: ${distance}px;
        height: ${pathElement.strokeWidth}px;
        background-color: ${pathElement.backgroundColor};
        transform-origin: 0 50%;
        transform: rotate(${angle}deg);
        pointer-events: auto;
        cursor: pointer;
        z-index: ${pathElement.zIndex};
      `;

      canvas.appendChild(lineDiv);

      // Store reference to the div
      if (!pathElement.pathDivs) pathElement.pathDivs = [];
      pathElement.pathDivs.push(lineDiv);
    },

    removePathElements: function (pathElement) {
      if (pathElement.pathDivs) {
        pathElement.pathDivs.forEach((div) => {
          if (div.parentNode) {
            div.parentNode.removeChild(div);
          }
        });
        pathElement.pathDivs = [];
      }
    },

    updatePathElement: function (pathElement) {
      // Remove existing path elements
      this.removePathElements(pathElement);

      // Recreate path with updated properties
      if (pathElement.points && pathElement.points.length > 0) {
        // Add all points
        pathElement.points.forEach((point) => {
          this.addPathPoint(pathElement, point.x, point.y);
        });

        // Connect consecutive points
        for (let i = 1; i < pathElement.points.length; i++) {
          this.connectPoints(
            pathElement,
            pathElement.points[i - 1],
            pathElement.points[i],
          );
        }
      }
    },

    updatePathBounds: function (pathElement) {
      if (pathElement.points.length === 0) return;

      let minX = pathElement.points[0].x;
      let maxX = pathElement.points[0].x;
      let minY = pathElement.points[0].y;
      let maxY = pathElement.points[0].y;

      pathElement.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });

      // Add some padding for stroke width
      const padding = (pathElement.strokeWidth || 2) / 2;
      pathElement.x = minX - padding;
      pathElement.y = minY - padding;
      pathElement.width = maxX - minX + padding * 2;
      pathElement.height = maxY - minY + padding * 2;
    },
  };

  // Utility functions for calculations and element management
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

  // Page management system for multiple design pages
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
      this.updatePagesPanel(); // Add this line to update the UI
      this.switchToPage(AppState.currentPageIndex);
    },

    switchToPage: function (pageIndex) {
      if (pageIndex < 0 || pageIndex >= AppState.pages.length) return;

      if (AppState.currentPageIndex === pageIndex) return;

      if (AppState.pages[AppState.currentPageIndex]) {
        AppState.pages[AppState.currentPageIndex].elements = AppState.elements;
        AppState.pages[AppState.currentPageIndex].elementCounter =
          AppState.elementCounter;
      }

      AppState.currentPageIndex = pageIndex;
      AppState.elements = [
        ...AppState.pages[AppState.currentPageIndex].elements,
      ];
      AppState.elementCounter =
        AppState.pages[AppState.currentPageIndex].elementCounter;

      requestAnimationFrame(() => {
        CanvasManager.clearCanvas();

        const fragment = document.createDocumentFragment();
        AppState.elements.forEach((element) => {
          const elementDiv = this.createElementDiv(element);
          fragment.appendChild(elementDiv);
        });

        const canvas = document.getElementById("canvas");
        if (canvas) {
          canvas.appendChild(fragment);
        }

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
      });
    },

    createElementDiv: function (element) {
      if (element.type === "path") {
        // Path elements need special handling with DOM elements
        DrawingManager.updatePathElement(element);
        return null; // Return null since path is handled differently
      }

      const div = document.createElement("div");
      div.id = element.id;
      div.className = "canvas-element";
      div.dataset.elementId = element.id;
      div.style.cssText = `
        position: absolute;
        left: ${element.x}px;
        top: ${element.y}px;
        cursor: pointer;
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
      ElementRenderer.applyShapeStyles(div, element);
      return div;
    },

    updatePagesPanel: function () {
      const pagesList = document.querySelector(".pages-list");
      if (!pagesList) return;

      const fragment = document.createDocumentFragment();

      AppState.pages.forEach((page, index) => {
        const pageItem = document.createElement("div");
        pageItem.className = "page-item";

        if (index === AppState.currentPageIndex) {
          pageItem.classList.add("active");
        }

        const pageContent = document.createElement("div");
        pageContent.className = "page-content";
        pageContent.innerHTML = `📄 ${page.name}`;
        pageContent.dataset.pageIndex = index;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "page-delete-btn";
        deleteBtn.innerHTML = "×";
        deleteBtn.title = "Delete page";
        deleteBtn.dataset.pageIndex = index;
        deleteBtn.dataset.action = "delete-page";

        if (AppState.pages.length <= 1) {
          deleteBtn.style.display = "none";
        }

        pageItem.appendChild(pageContent);
        pageItem.appendChild(deleteBtn);
        fragment.appendChild(pageItem);
      });

      pagesList.innerHTML = "";
      pagesList.appendChild(fragment);
    },
  };

  // Canvas management for handling canvas interactions and transformations
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
      } else if (AppState.currentTool === "pan") {
        // Pan tool doesn't create elements on click
        return;
      } else if (AppState.currentTool === "pen") {
        // Pen tool handles drawing in mouse events
        return;
      } else {
        ElementCreator.createElement(e);
      }
    },

    applyPanTransform: function () {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;

      const currentTransform = `scale(${AppState.zoomLevel}) translate(${AppState.panOffset.x}px, ${AppState.panOffset.y}px)`;
      canvas.style.transform = currentTransform;
      canvas.style.transformOrigin = "0 0";
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

  // Element creation system for shapes and text
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
        borderColor: "#000000",
        borderWidth: 0,
        textContent: AppState.currentTool === "text" ? "Text" : "",
        zIndex: ++AppState.zIndexCounter,
      };

      AppState.elements.push(element);
      ElementRenderer.renderElement(element);
      ElementManager.selectElement(element);
      LayerManager.updateLayersPanel();
      UIManager.updateElementCount();
      UIManager.hideCanvasPlaceholder();

      // Auto-switch to select tool after creating element
      ToolManager.selectTool("select");

      // Save state for undo/redo
      HistoryManager.saveState();
    },
  };

  // Element rendering system for displaying shapes on canvas
  const ElementRenderer = {
    renderElement: function (element) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;

      if (element.type === "path") {
        // Path elements are handled differently with pure DOM elements
        DrawingManager.updatePathElement(element);
        return;
      }

      const div = document.createElement("div");
      div.id = element.id;
      div.className = "canvas-element";
      div.dataset.elementId = element.id;
      div.style.cssText = `
                position: absolute;
                left: ${element.x}px;
                top: ${element.y}px;
                cursor: pointer;
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
        case "star":
          this.styleStar(div, element);
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
      div.style.border = `${element.borderWidth || 0}px solid ${element.borderColor || "#000000"}`;
    },

    styleCircle: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = element.height + "px"; // Use actual height instead of width
      div.style.backgroundColor = element.backgroundColor;
      div.style.borderRadius = "50%";
      div.style.border = `${element.borderWidth || 0}px solid ${element.borderColor || "#000000"}`;
    },

    styleTriangle: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = element.height + "px";
      div.style.backgroundColor = element.backgroundColor;
      div.style.border = `${element.borderWidth || 0}px solid ${element.borderColor || "#000000"}`;
      // Use clip-path for better triangle shape
      div.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
    },

    styleStar: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = element.height + "px";
      div.style.backgroundColor = element.backgroundColor;
      div.style.border = `${element.borderWidth || 0}px solid ${element.borderColor || "#000000"}`;
      // Use clip-path for 5-pointed star shape
      div.style.clipPath =
        "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
    },

    styleLine: function (div, element) {
      div.style.width = element.width + "px";
      div.style.height = "2px";
      div.style.backgroundColor = element.backgroundColor;
      div.style.borderRadius = "1px";
      div.style.border = `${element.borderWidth || 0}px solid ${element.borderColor || "#000000"}`;
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
      div.style.border = `${element.borderWidth || 1}px solid ${element.borderColor || element.backgroundColor}`;
      div.style.padding = "4px";
      div.textContent = element.textContent;
    },

    updateElementDisplay: function (element) {
      if (element.type === "path") {
        DrawingManager.updatePathElement(element);
        return;
      }

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

  // Element management for selection, deletion, and manipulation
  const ElementManager = {
    handleSelection: function (e) {
      // Check if clicking on a path element (pen drawing)
      if (
        e.target.classList.contains("path-point") ||
        e.target.classList.contains("path-line")
      ) {
        // Find the path element this div belongs to
        const pathElement = AppState.elements.find(
          (el) =>
            el.type === "path" && el.pathDivs && el.pathDivs.includes(e.target),
        );
        if (pathElement) {
          this.selectAndBringToFront(pathElement);
          return;
        }
      }

      // Regular element selection
      const target = e.target.closest(".canvas-element");
      if (target) {
        const element = AppState.elements.find((el) => el.id === target.id);
        this.selectAndBringToFront(element);
      } else {
        this.deselectElement();
      }
    },

    selectElement: function (element) {
      AppState.selectedElement = element;

      // Clear previous selections
      document.querySelectorAll(".canvas-element").forEach((el) => {
        el.style.outline = "none";
        this.removeResizeHandles(el);
      });

      // Clear path selections
      document.querySelectorAll(".path-point, .path-line").forEach((el) => {
        el.style.filter = "none";
      });

      // Highlight selected element
      if (element.type === "path") {
        // Highlight path elements
        if (element.pathDivs) {
          element.pathDivs.forEach((div) => {
            div.style.filter = "drop-shadow(0 0 4px #0d99ff) brightness(1.2)";
          });
        }
      } else {
        const elementDiv = document.getElementById(element.id);
        if (elementDiv) {
          elementDiv.style.outline = "2px solid #0d99ff";
          elementDiv.style.outlineOffset = "2px";
          this.addResizeHandles(elementDiv);
        }
      }

      PropertiesPanel.updatePropertiesPanel(element);
      LayerManager.updateLayersPanel();
    },

    selectAndBringToFront: function (element) {
      // Bring selected element to front by updating z-index
      const maxZIndex = Math.max(...AppState.elements.map((el) => el.zIndex));
      if (element.zIndex < maxZIndex) {
        element.zIndex = ++AppState.zIndexCounter;

        // Update the element's z-index in DOM
        if (element.type === "path") {
          // Update z-index for all path divs
          if (element.pathDivs) {
            element.pathDivs.forEach((div) => {
              div.style.zIndex = element.zIndex;
            });
          }
        } else {
          const elementDiv = document.getElementById(element.id);
          if (elementDiv) {
            elementDiv.style.zIndex = element.zIndex;
          }
        }
      }

      // Then select the element
      this.selectElement(element);
    },

    deselectElement: function () {
      if (AppState.selectedElement) {
        if (AppState.selectedElement.type === "path") {
          // Remove path highlighting
          if (AppState.selectedElement.pathDivs) {
            AppState.selectedElement.pathDivs.forEach((div) => {
              div.style.filter = "none";
            });
          }
        } else {
          const elementDiv = document.getElementById(
            AppState.selectedElement.id,
          );
          if (elementDiv) {
            elementDiv.style.outline = "none";
            elementDiv.style.outlineOffset = "0";
            this.removeResizeHandles(elementDiv);
          }
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

      // Special handling for path elements
      if (AppState.selectedElement.type === "path") {
        DrawingManager.removePathElements(AppState.selectedElement);
      } else {
        const elementDiv = document.getElementById(AppState.selectedElement.id);
        if (elementDiv) elementDiv.remove();
      }

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

      // Save state for undo/redo
      HistoryManager.saveState();
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

  // Mouse interaction handler for drag, resize, rotate operations
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
      } else if (
        AppState.currentTool === "pen" &&
        (e.target.id === "canvas" || e.target.closest("#canvas"))
      ) {
        DrawingManager.startDrawing(e);
        e.preventDefault();
      } else if (
        AppState.currentTool === "eraser" &&
        (e.target.id === "canvas" || e.target.closest("#canvas"))
      ) {
        DrawingManager.startErasing(e);
        e.preventDefault();
      } else if (
        AppState.currentTool === "pan" &&
        (e.target.id === "canvas" || e.target.closest("#canvas"))
      ) {
        AppState.isPanning = true;
        AppState.panStart = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = "grabbing";
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
      if (AppState.isPanning) {
        this.panCanvas(e);
      } else if (AppState.isDrawing) {
        DrawingManager.continueDrawing(e);
      } else if (AppState.isDragging && AppState.selectedElement) {
        this.dragElement(e);
      } else if (AppState.isResizing && AppState.selectedElement) {
        this.resizeElement(e);
      } else if (AppState.isRotating && AppState.selectedElement) {
        this.rotateElementWithMouse(e);
      }
    },

    handleMouseUp: function (e) {
      const wasInteracting =
        AppState.isDragging ||
        AppState.isResizing ||
        AppState.isRotating ||
        AppState.isPanning ||
        AppState.isDrawing;

      if (AppState.isRotating) {
        document.querySelectorAll(".rotation-handle").forEach((handle) => {
          handle.style.cursor = "grab";
        });
      }

      if (AppState.isPanning) {
        document.body.style.cursor = "default";
      }

      if (AppState.isDrawing) {
        DrawingManager.finishDrawing();
      }

      AppState.isDragging = false;
      AppState.isResizing = false;
      AppState.isRotating = false;
      AppState.isPanning = false;
      AppState.resizeHandle = null;
      AppState.rotationStartAngle = 0;

      // Save state after interaction ends (except panning and drawing - they handle their own state saving)
      if (wasInteracting && !AppState.isPanning && !AppState.isDrawing) {
        HistoryManager.saveState();
      }
    },

    panCanvas: function (e) {
      const deltaX = e.clientX - AppState.panStart.x;
      const deltaY = e.clientY - AppState.panStart.y;

      AppState.panOffset.x += deltaX / AppState.zoomLevel;
      AppState.panOffset.y += deltaY / AppState.zoomLevel;

      AppState.panStart = { x: e.clientX, y: e.clientY };

      CanvasManager.applyPanTransform();
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

  // Text editing system for text elements
  const TextEditor = {
    startTextEdit: function (element, elementDiv) {
      // Hide original text during editing
      elementDiv.style.opacity = "0.3";
      elementDiv.textContent = "";

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
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid ${element.backgroundColor};
                border-radius: 4px;
                padding: 4px;
                z-index: 10000;
                outline: none;
                box-sizing: border-box;
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
            // Cancel edit - restore original text
            elementDiv.style.opacity = "1";
            elementDiv.textContent = element.textContent;
            input.remove();
          }
        });
      }
    },

    finishTextEdit: function (element, elementDiv, input) {
      element.textContent = input.value || "Text";

      // Restore original element visibility and update display
      elementDiv.style.opacity = "1";
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

  // Properties panel management for element customization
  const PropertiesPanel = {
    updatePropertiesPanel: function (element) {
      const widthInput = document.getElementById("widthInput");
      const heightInput = document.getElementById("heightInput");
      const rotationInput = document.getElementById("rotationInput");
      const backgroundColorInput = document.getElementById(
        "backgroundColorInput",
      );
      const borderColorInput = document.getElementById("borderColorInput");
      const borderWidthInput = document.getElementById("borderWidthInput");
      const colorHex = document.querySelector(".color-hex");
      const borderColorHex = document.querySelector(".border-color-hex");
      const textGroup = document.getElementById("textContentGroup");
      const textContentInput = document.getElementById("textContentInput");

      if (widthInput) widthInput.value = element.width;
      if (heightInput) heightInput.value = element.height;
      if (rotationInput) rotationInput.value = element.rotation;
      if (backgroundColorInput)
        backgroundColorInput.value = element.backgroundColor;
      if (borderColorInput)
        borderColorInput.value = element.borderColor || "#000000";
      if (borderWidthInput) borderWidthInput.value = element.borderWidth || 0;
      if (colorHex) colorHex.textContent = element.backgroundColor;
      if (borderColorHex)
        borderColorHex.textContent = element.borderColor || "#000000";

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
          const inputWidth = parseInt(value);
          const newWidth = isNaN(inputWidth) || inputWidth < 0 ? 0 : inputWidth;
          AppState.selectedElement.width = newWidth;

          if (
            AppState.selectedElement.x + AppState.selectedElement.width >
            AppState.canvas.width
          ) {
            AppState.selectedElement.x =
              AppState.canvas.width - AppState.selectedElement.width;
          }
          break;
        case "height":
          const inputHeight = parseInt(value);
          const newHeight =
            isNaN(inputHeight) || inputHeight < 0 ? 0 : inputHeight;
          AppState.selectedElement.height = newHeight;

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
        case "borderColor":
          AppState.selectedElement.borderColor = value;
          const borderColorHex = document.querySelector(".border-color-hex");
          if (borderColorHex) borderColorHex.textContent = value;
          break;
        case "borderWidth":
          const inputBorderWidth = parseInt(value);
          AppState.selectedElement.borderWidth =
            isNaN(inputBorderWidth) || inputBorderWidth < 0
              ? 0
              : inputBorderWidth;
          break;
        case "textContent":
          AppState.selectedElement.textContent = value;
          break;
      }
      ElementRenderer.updateElementDisplay(AppState.selectedElement);
      this.updatePropertiesPanel(AppState.selectedElement);

      // Save state for undo/redo after property change
      HistoryManager.saveState();
    },
  };

  // Layer management system for element ordering and navigation
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
      sortedElements.forEach((element, index) => {
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
        const layerNumber = sortedElements.length - index; // Front layer = highest number
        layerItem.innerHTML = `
                    <span class="layer-icon">${icon}</span>
                    <span class="layer-name">${element.type} ${element.id.split("_")[1]}</span>
                    <span class="layer-number" style="margin-left: auto; font-size: 0.7rem; opacity: 0.7;">L${layerNumber}</span>
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
        star: "⭐",
        line: "📏",
        path: "✏️",
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
        // Add a subtle highlight animation
        layerItem.style.transform = "scale(1.02)";
        layerItem.style.transition = "transform 0.2s ease";
        setTimeout(() => {
          layerItem.style.transform = "scale(1)";
        }, 200);
      }
    },

    moveLayer: function (direction) {
      if (!AppState.selectedElement) return;

      // Get all elements sorted by z-index (highest to lowest = front to back)
      const sortedElements = [...AppState.elements].sort(
        (a, b) => b.zIndex - a.zIndex,
      );

      if (sortedElements.length <= 1) return; // Need at least 2 elements

      const currentIndex = sortedElements.findIndex(
        (el) => el.id === AppState.selectedElement.id,
      );

      if (currentIndex === -1) return;

      let targetIndex;
      if (direction === "up") {
        // Move up means select previous element in list (towards front)
        targetIndex = currentIndex - 1;
      } else if (direction === "down") {
        // Move down means select next element in list (towards back)
        targetIndex = currentIndex + 1;
      }

      // Wrap around if at boundaries
      if (targetIndex < 0) {
        targetIndex = sortedElements.length - 1; // Go to last element
      } else if (targetIndex >= sortedElements.length) {
        targetIndex = 0; // Go to first element
      }

      // Select the target element
      const targetElement = sortedElements[targetIndex];
      ElementManager.selectElement(targetElement);

      // Update layers panel to reflect new selection
      this.updateLayersPanel();
    },

    normalizeZIndices: function () {
      // Sort elements by current z-index
      const sortedElements = [...AppState.elements].sort(
        (a, b) => a.zIndex - b.zIndex,
      );

      // Reassign sequential z-indices
      sortedElements.forEach((element, index) => {
        element.zIndex = index;

        // Update DOM z-index
        if (element.type === "path") {
          if (element.pathDivs) {
            element.pathDivs.forEach((div) => {
              div.style.zIndex = element.zIndex;
            });
          }
        } else {
          const elementDiv = document.getElementById(element.id);
          if (elementDiv) {
            elementDiv.style.zIndex = element.zIndex;
          }
        }
      });
    },

    reorderLayer: function (direction) {
      if (!AppState.selectedElement) return;

      const selectedElement = AppState.selectedElement;

      // Get all elements sorted by z-index (highest to lowest = front to back)
      const sortedElements = [...AppState.elements].sort(
        (a, b) => b.zIndex - a.zIndex,
      );
      const currentIndex = sortedElements.findIndex(
        (el) => el.id === selectedElement.id,
      );

      if (currentIndex === -1) return;

      let targetIndex;
      if (direction === "up") {
        // Move up means towards front (lower index in sorted array)
        targetIndex = currentIndex - 1;
      } else if (direction === "down") {
        // Move down means towards back (higher index in sorted array)
        targetIndex = currentIndex + 1;
      }

      // Check bounds
      if (targetIndex < 0 || targetIndex >= sortedElements.length) return;

      // Swap elements in the sorted array
      [sortedElements[currentIndex], sortedElements[targetIndex]] = [
        sortedElements[targetIndex],
        sortedElements[currentIndex],
      ];

      // Reassign z-indices based on new order (highest z-index = front)
      sortedElements.forEach((element, index) => {
        element.zIndex = sortedElements.length - index - 1;

        // Update DOM z-index
        if (element.type === "path") {
          if (element.pathDivs) {
            element.pathDivs.forEach((div) => {
              div.style.zIndex = element.zIndex;
            });
          }
        } else {
          const elementDiv = document.getElementById(element.id);
          if (elementDiv) {
            elementDiv.style.zIndex = element.zIndex;
          }
        }
      });

      // Update layers panel to reflect new order
      this.updateLayersPanel();

      // Save state for undo/redo
      HistoryManager.saveState();
    },

    bringToFront: function () {
      if (!AppState.selectedElement) return;

      const selectedElement = AppState.selectedElement;
      const maxZIndex = Math.max(...AppState.elements.map((el) => el.zIndex));

      if (selectedElement.zIndex === maxZIndex) return; // Already at front

      selectedElement.zIndex = ++AppState.zIndexCounter;

      // Update DOM z-index
      if (selectedElement.type === "path") {
        if (selectedElement.pathDivs) {
          selectedElement.pathDivs.forEach((div) => {
            div.style.zIndex = selectedElement.zIndex;
          });
        }
      } else {
        const elementDiv = document.getElementById(selectedElement.id);
        if (elementDiv) {
          elementDiv.style.zIndex = selectedElement.zIndex;
        }
      }

      this.updateLayersPanel();
      HistoryManager.saveState();
    },

    sendToBack: function () {
      if (!AppState.selectedElement) return;

      const selectedElement = AppState.selectedElement;
      const minZIndex = Math.min(...AppState.elements.map((el) => el.zIndex));

      if (selectedElement.zIndex === minZIndex) return; // Already at back

      selectedElement.zIndex = minZIndex - 1;

      // Update DOM z-index
      if (selectedElement.type === "path") {
        if (selectedElement.pathDivs) {
          selectedElement.pathDivs.forEach((div) => {
            div.style.zIndex = selectedElement.zIndex;
          });
        }
      } else {
        const elementDiv = document.getElementById(selectedElement.id);
        if (elementDiv) {
          elementDiv.style.zIndex = selectedElement.zIndex;
        }
      }

      this.updateLayersPanel();
      HistoryManager.saveState();
    },
  };

  // Tool management system for switching between different tools
  const ToolManager = {
    selectTool: function (tool) {
      if (AppState.currentTool === tool) return;

      AppState.currentTool = tool;

      const currentActive = document.querySelector(".tool-btn.active");
      if (currentActive) {
        currentActive.classList.remove("active");
      }

      const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
      if (toolBtn) {
        toolBtn.classList.add("active");
      }

      const currentToolEl = document.getElementById("currentTool");
      if (currentToolEl) {
        currentToolEl.textContent = AppState.tools[tool];
      }

      const canvas = document.getElementById("canvas");
      if (canvas) {
        if (tool === "select") {
          canvas.style.cursor = "default";
        } else if (tool === "pan") {
          canvas.style.cursor = "grab";
        } else if (tool === "eraser") {
          canvas.style.cursor = "crosshair";
          // Add eraser visual feedback
          canvas.classList.add("eraser-active");
        } else {
          canvas.style.cursor = "crosshair";
        }

        // Remove eraser class if not eraser tool
        if (tool !== "eraser") {
          canvas.classList.remove("eraser-active");
        }
      }
    },
  };

  // Zoom management for canvas scaling
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

  // Keyboard shortcuts and mouse wheel handling
  const KeyboardHandler = {
    handleKeyDown: function (e) {
      // Skip keyboard shortcuts when user is typing in input fields
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return; // Allow normal typing in input fields
      }

      // Handle global shortcuts first (undo/redo work without selection)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              HistoryManager.redo(); // Ctrl+Shift+Z for redo
            } else {
              HistoryManager.undo(); // Ctrl+Z for undo
            }
            return;
          case "y":
            e.preventDefault();
            HistoryManager.redo(); // Ctrl+Y for redo
            return;
        }
      }

      // Tool shortcuts (work globally)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            e.preventDefault();
            ToolManager.selectTool("select");
            return;
          case "h":
            e.preventDefault();
            ToolManager.selectTool("pan");
            return;
          case "p":
            e.preventDefault();
            ToolManager.selectTool("pen");
            return;
          case "e":
            e.preventDefault();
            ToolManager.selectTool("eraser");
            return;
          case "r":
            e.preventDefault();
            ToolManager.selectTool("rectangle");
            return;
          case "c":
            e.preventDefault();
            ToolManager.selectTool("circle");
            return;
          case "t":
            e.preventDefault();
            ToolManager.selectTool("triangle");
            return;
          case "s":
            e.preventDefault();
            ToolManager.selectTool("star");
            return;
          case "l":
            e.preventDefault();
            ToolManager.selectTool("line");
            return;
          case "x":
            e.preventDefault();
            ToolManager.selectTool("text");
            return;
        }
      }

      // Element-specific shortcuts (require selection)
      if (!AppState.selectedElement) return;

      // Layer navigation shortcuts (Ctrl + Arrow keys)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            LayerManager.moveLayer("up"); // Navigate to previous layer
            return;
          case "ArrowDown":
            e.preventDefault();
            LayerManager.moveLayer("down"); // Navigate to next layer
            return;
        }
      }

      // Layer reordering shortcuts (Shift + Arrow keys)
      if (e.shiftKey) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            LayerManager.reorderLayer("up"); // Move layer towards front
            return;
          case "ArrowDown":
            e.preventDefault();
            LayerManager.reorderLayer("down"); // Move layer towards back
            return;
          case "]":
            e.preventDefault();
            LayerManager.bringToFront();
            return;
          case "[":
            e.preventDefault();
            LayerManager.sendToBack();
            return;
        }
      }

      switch (e.key) {
        case "Delete":
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

  // UI management for updating interface elements
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

  // Local storage management for saving/loading projects
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

  // Export functionality for JSON and HTML formats
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
        } else if (element.type === "triangle") {
          style += "clip-path: polygon(50% 0%, 0% 100%, 100% 100%);";
        } else if (element.type === "star") {
          style +=
            "clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);";
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

  // Main event handler system for all user interactions
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
      if (e.target.closest(".tool-btn")) {
        e.preventDefault();
        const toolBtn = e.target.closest(".tool-btn");
        const tool = toolBtn.dataset.tool;
        if (tool && !toolBtn.classList.contains("active")) {
          ToolManager.selectTool(tool);
        }
        return;
      }

      // Handle undo/redo buttons
      if (e.target.id === "undoBtn" || e.target.closest("#undoBtn")) {
        e.preventDefault();
        HistoryManager.undo();
        return;
      }

      if (e.target.id === "redoBtn" || e.target.closest("#redoBtn")) {
        e.preventDefault();
        HistoryManager.redo();
        return;
      }

      // Handle delete button
      if (e.target.id === "deleteBtn" || e.target.closest("#deleteBtn")) {
        e.preventDefault();
        if (AppState.selectedElement) {
          ElementManager.deleteElement();
        }
        return;
      }

      if (
        e.target.classList.contains("zoom-btn") ||
        e.target.closest(".zoom-btn")
      ) {
        const zoomBtn = e.target.classList.contains("zoom-btn")
          ? e.target
          : e.target.closest(".zoom-btn");
        const isZoomIn = zoomBtn.querySelector(".ri-add-line") !== null;
        ZoomManager.handleZoom(isZoomIn);
      } else if (e.target.classList.contains("layer-btn")) {
        const action = e.target.title.includes("Up") ? "up" : "down";
        LayerManager.moveLayer(action);
      } else if (e.target.classList.contains("add-btn")) {
        PageManager.addNewPage();
      } else if (e.target.dataset.action === "delete-page") {
        const pageIndex = parseInt(e.target.dataset.pageIndex);
        PageManager.deletePage(pageIndex);
      } else if (e.target.closest(".page-content")) {
        const pageContent = e.target.closest(".page-content");
        const pageIndex = parseInt(pageContent.dataset.pageIndex);
        if (!isNaN(pageIndex)) {
          // Check if clicked on page name span for editing
          if (e.target.classList.contains("page-name")) {
            PageManager.editPageName(pageIndex);
          } else {
            PageManager.switchToPage(pageIndex);
          }
        }
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
      } else if (e.target.id === "borderColorInput") {
        PropertiesPanel.updateProperty("borderColor", e.target.value);
      } else if (e.target.id === "borderWidthInput") {
        PropertiesPanel.updateProperty("borderWidth", e.target.value);
      } else if (e.target.id === "textContentInput") {
        PropertiesPanel.updateProperty("textContent", e.target.value);
      }
    },
  };

  // Main application initialization
  const App = {
    init: function () {
      EventHandler.init();
      StorageManager.loadFromStorage();
      UIManager.updateUI();
      PageManager.updatePagesPanel();
      ZoomManager.updateZoomDisplay();
      ZoomManager.applyZoom();

      // Initialize history manager
      HistoryManager.initialize();
    },
  };

  document.addEventListener("DOMContentLoaded", App.init);
})();
