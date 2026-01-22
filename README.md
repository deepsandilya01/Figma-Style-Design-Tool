# 🎨 Figma-Style Design Tool (DOM Based)

A browser-based visual design editor inspired by Figma, built completely using **HTML, CSS, and Vanilla JavaScript (DOM only)**.  
This tool allows users to visually create, edit, and manage design elements on a canvas with real-time interactions.

> ⚠️ No Canvas, No SVG, No Frameworks – Everything is built using pure DOM manipulation.

---

## 🔗 Live Demo & Source Code

- **GitHub Repository:** [ADD YOUR GITHUB LINK HERE]
- **Live Project (Vercel):** [ADD YOUR LIVE LINK HERE]

---

## 📌 Project Objective

The goal of this project is to demonstrate strong understanding of:

- DOM Manipulation  
- Event Handling  
- State Management  
- Coordinate Calculations  
- UI/UX Design  

By building a mini design tool similar to Figma from scratch.

---

## 🧩 Features Overview

### 1. Element Creation
You can create the following elements on the canvas:

- Rectangle  
- Circle  
- Triangle  
- Line  
- Text Box  

Each element:
- Is a simple `<div>` in the DOM
- Has a unique ID
- Appears with default size and position

---

### 2. Selection System
- Only **one element can be selected at a time**
- Selected element shows:
  - Blue outline
  - 4 resize handles
  - 1 rotation handle
- Clicking on empty canvas will deselect the element

---

### 3. Dragging
- Drag any element using mouse
- Movement is restricted inside the canvas
- Real-time position update

---

### 4. Resizing
- Resize using **corner handles**
- Minimum size is enforced
- Circle always maintains equal width & height

---

### 5. Rotation
- Rotate using:
  - Rotation handle
  - Mouse wheel
  - Keyboard shortcuts
- Rotation uses CSS `transform`

---

### 6. Layers Panel
- Shows all elements in a list
- Click on a layer to select element
- Buttons:
  - Move Up (bring forward)
  - Move Down (send backward)
- Uses `z-index` internally

---

### 7. Properties Panel
You can edit properties of selected element:

- Width  
- Height  
- Rotation  
- Background Color  
- Text Content (only for text elements)

All changes reflect in **real time**.

---

### 8. Multi-Page System
- Create multiple pages
- Each page has its own elements
- Switch between pages easily
- Delete pages (except last one)

---

### 9. Zoom System
- Zoom in/out using buttons
- Zoom range: 25% – 300%
- Canvas scales smoothly

---

### 10. Save & Load (Persistence)
- Uses `localStorage`
- On refresh:
  - All elements are restored
  - Pages are preserved
  - Positions, sizes, rotations remain same

---

### 11. Export System

#### Export JSON
Downloads a JSON file containing:
- All elements
- Positions
- Styles
- Metadata

#### Export HTML
Downloads a standalone HTML file that:
- Visually recreates the design
- Uses inline styles
- Works without any JS

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected element |
| Arrow Up | Move element up |
| Arrow Down | Move element down |
| Arrow Left | Move element left |
| Arrow Right | Move element right |
| R | Rotate clockwise (15°) |
| E | Rotate anticlockwise (15°) |
| [ | Rotate -5° |
| ] | Rotate +5° |
| Ctrl + Shift + Scroll | Zoom canvas |
| Ctrl + Scroll | Rotate element |

---

## 🖱️ Mouse Controls

| Action | Behavior |
|--------|---------|
| Click | Select element |
| Drag | Move element |
| Double Click (Text) | Edit text |
| Resize Handles | Resize element |
| Rotation Handle | Rotate element |
| Mouse Wheel | Rotate / Zoom |

---

## 🛠️ Tech Stack

- HTML5  
- CSS3 / SCSS  
- Vanilla JavaScript (ES6)  
- LocalStorage API  

No external libraries or frameworks used.

---

## 🧠 Internal Architecture

The application is structured using modular managers:

- `AppState` → Global state
- `ElementManager` → Selection logic
- `MouseHandler` → Drag/resize/rotate
- `LayerManager` → Layer panel
- `PropertiesPanel` → Right panel
- `StorageManager` → Save/Load
- `ExportManager` → JSON/HTML export
- `PageManager` → Multi-page logic

This keeps the code clean, scalable, and maintainable.

---

## 🚀 How to Use

1. Select a tool from bottom toolbar
2. Click on canvas to create element
3. Select element to edit
4. Use properties panel to modify
5. Use keyboard/mouse for interactions
6. Save using bottom save button
7. Export JSON/HTML from right panel

---

## 🎯 Learning Outcomes

This project demonstrates:

- Real-world frontend engineering
- Event-driven architecture
- UI state synchronization
- DOM-based rendering
- UX design principles

---

## 🏁 Conclusion

This project is a fully functional **DOM-based Figma-like design tool**, built from scratch without using any external libraries or engines.

It focuses on:
- Correctness
- Clean architecture
- Real-time interactions
- Strong UI/UX experience

Perfect example of advanced frontend fundamentals.
