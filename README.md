# 🎨 Figma-Style Design Tool (DOM Based)

A browser-based visual design editor inspired by Figma, built completely using **HTML, CSS, and Vanilla JavaScript (DOM only)**.  
This tool allows users to visually create, edit, and manage design elements on a canvas with real-time interactions.

> ⚠️ No Canvas, No SVG, No Frameworks – Everything is built using pure DOM manipulation.

---

## 🔗 Live Demo & Source Code

- **GitHub Repository:** [Figma-Style Design Tool](https://github.com/deepsandilya01/Figma-Style-Design-Tool)
- **Live Project (Vercel):** [Try it now](https://figma-style-design-tool-two.vercel.app/)

---

## 📌 Project Objective

The goal of this project is to demonstrate strong understanding of:

- DOM Manipulation  
- Event Handling  
- State Management  
- Coordinate Calculations  
- UI/UX Design  

By building a comprehensive design tool similar to Figma from scratch.

---

## 🧩 Features Overview

### 1. 🎯 Tool Selection System
Choose from multiple creation tools:
- **Select Tool (V)** - Select and manipulate elements
- **Rectangle Tool (R)** - Create rectangular shapes
- **Circle Tool (C)** - Create circular/elliptical shapes  
- **Triangle Tool (T)** - Create triangular shapes
- **Star Tool (S)** - Create star shapes
- **Line Tool (L)** - Create arrow lines
- **Text Tool (X)** - Create text elements
- **Pen Tool (P)** - Draw freehand paths
- **Eraser Tool (E)** - Erase drawn paths
- **Pan Tool (H)** - Navigate around canvas

### 2. 🎨 Element Creation & Management
Create various design elements:
- **Shapes**: Rectangle, Circle, Triangle, Star, Line
- **Text Elements**: Editable text boxes with custom content
- **Freehand Drawing**: Pen tool for custom paths using pure DOM elements
- **Interactive Editing**: Double-click text to edit inline

Each element:
- Is a pure `<div>` element in the DOM
- Has unique ID and z-index management
- Supports real-time property updates
- Maintains state across page switches

### 3. 🔄 Advanced Selection System
- **Single Selection**: Click any element to select
- **Visual Feedback**: Selected elements show blue outline
- **Resize Handles**: 4 corner handles for resizing
- **Rotation Handle**: Red circular handle for rotation
- **Path Selection**: Click on pen-drawn paths to select
- **Deselection**: Click empty canvas to deselect

### 4. 🖱️ Interactive Manipulation
**Dragging & Movement:**
- Drag elements anywhere on canvas
- Boundary constraints prevent elements from going outside
- Real-time position updates
- Smooth drag experience

**Resizing:**
- Corner handles for proportional/free resizing
- Minimum size enforcement
- Real-time size updates
- Maintains aspect ratio when needed

**Rotation:**
- Rotation handle for mouse-based rotation
- Keyboard shortcuts for precise rotation
- Mouse wheel rotation support
- Angle normalization (0-360°)

### 5. 📋 Properties Panel
Comprehensive element customization:
- **Dimensions**: Width, Height with real-time updates
- **Position**: X, Y coordinates
- **Rotation**: Angle in degrees (0-360°)
- **Colors**: Background color with color picker
- **Border**: Border color and width
- **Text Content**: For text elements only
- **Live Preview**: All changes reflect immediately

### 6. 📚 Advanced Layer Management
**Layer Panel Features:**
- Visual layer hierarchy with icons
- Layer numbering (L1, L2, etc.)
- Click to select layers
- Layer navigation controls

**Layer Operations:**
- **Bring to Front**: Move layer to top
- **Send to Back**: Move layer to bottom
- **Move Up/Down**: Adjust layer order
- **Layer Navigation**: Ctrl+↑/↓ to navigate between layers
- **Z-index Management**: Automatic z-index handling

### 7. 📄 Multi-Page System
**Page Management:**
- Create unlimited pages
- Each page maintains its own elements
- Switch between pages seamlessly
- Delete pages (protection for last page)
- Page indicators and navigation

**Page Features:**
- Independent element storage per page
- Preserved state when switching
- Page naming and organization
- Visual active page indication

### 8. 🔍 Zoom & Navigation System
**Zoom Controls:**
- Zoom range: 25% - 300%
- Zoom buttons with visual feedback
- Smooth scaling transitions
- Zoom level indicator

**Pan Navigation:**
- Pan tool for canvas navigation
- Mouse-based panning
- Smooth pan transitions
- Reset to center functionality

### 9. ✏️ Drawing System (Pure DOM)
**Pen Tool Features:**
- Freehand drawing using DOM elements
- Each stroke creates connected div elements
- Smooth line rendering
- Path selection and manipulation

**Eraser Tool:**
- Erase drawn paths interactively
- Visual eraser feedback
- Partial path deletion
- Smooth erasing animation

### 10. ⏪ Undo/Redo System
**History Management:**
- Complete undo/redo functionality
- State snapshots for all operations
- 50-state history limit
- Visual button state indicators
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

### 11. 💾 Save & Load (Persistence)
**Local Storage:**
- Automatic state persistence
- All elements and pages saved
- Properties and positions preserved
- Instant loading on refresh

**Save Features:**
- Manual save button
- Visual save confirmation
- Complete project state storage
- Cross-session persistence

### 12. 📤 Export System

**Export JSON:**
- Complete project data export
- All elements, pages, and metadata
- Structured JSON format
- Timestamp and tool information

**Export HTML:**
- Standalone HTML file generation
- Inline CSS styles
- Visual recreation of design
- No JavaScript dependencies
- Ready-to-use output

---

## ⌨️ Comprehensive Keyboard Shortcuts

### Tool Selection
| Key | Tool |
|-----|------|
| V | Select Tool |
| H | Pan Tool |
| P | Pen Tool |
| E | Eraser Tool |
| R | Rectangle Tool |
| C | Circle Tool |
| T | Triangle Tool |
| S | Star Tool |
| L | Line Tool |
| X | Text Tool |

### Element Manipulation
| Key | Action |
|-----|--------|
| Delete | Delete selected element |
| Arrow Keys | Move element (5px steps) |
| [ | Rotate -5° |
| ] | Rotate +5° |

### Layer Management
| Key | Action |
|-----|--------|
| Ctrl + ↑ | Select previous layer |
| Ctrl + ↓ | Select next layer |
| Shift + ↑ | Move layer up |
| Shift + ↓ | Move layer down |
| Shift + ] | Bring to front |
| Shift + [ | Send to back |

### History & Zoom
| Key | Action |
|-----|--------|
| Ctrl + Z | Undo |
| Ctrl + Y / Ctrl + Shift + Z | Redo |
| Ctrl + Shift + Scroll | Zoom canvas |
| Ctrl + Scroll | Rotate selected element |

---

## 🖱️ Mouse Controls

| Action | Behavior |
|--------|---------|
| Click | Select element / Create element |
| Drag | Move selected element |
| Double Click (Text) | Edit text content |
| Resize Handles | Resize element |
| Rotation Handle | Rotate element |
| Mouse Wheel + Ctrl | Zoom canvas |
| Mouse Wheel + Ctrl (on element) | Rotate element |
| Right Click | Context menu (future feature) |

---

## 🛠️ Tech Stack

**Frontend:**
- HTML5 (Semantic structure)
- CSS3 / SCSS (Advanced styling with mixins)
- Vanilla JavaScript ES6+ (Modular architecture)

**APIs Used:**
- DOM API (Element manipulation)
- LocalStorage API (Data persistence)
- File API (Export functionality)
- Event API (User interactions)

**Build Tools:**
- SCSS compilation
- No bundlers or frameworks

> ⚠️ No Canvas, No SVG, No Frameworks – Everything is built using pure DOM manipulation.

---

## 🏗️ Architecture & Code Structure

The application follows a modular architecture with separate managers:

### Core Modules
- **`AppState`** → Global application state management
- **`HistoryManager`** → Undo/redo functionality
- **`ElementManager`** → Element selection and manipulation
- **`MouseHandler`** → Mouse interactions (drag, resize, rotate)
- **`KeyboardHandler`** → Keyboard shortcuts and controls
- **`ToolManager`** → Tool selection and switching

### Feature Modules
- **`DrawingManager`** → Pen and eraser tool functionality
- **`LayerManager`** → Layer panel and z-index management
- **`PageManager`** → Multi-page system
- **`PropertiesPanel`** → Right panel property editing
- **`ZoomManager`** → Canvas zoom and scaling
- **`CanvasManager`** → Canvas interactions and transformations

### Utility Modules
- **`Utils`** → Helper functions and calculations
- **`UIManager`** → UI updates and element counting
- **`StorageManager`** → Local storage operations
- **`ExportManager`** → JSON and HTML export
- **`TextEditor`** → Inline text editing
- **`EventHandler`** → Central event management

This modular approach ensures:
- Clean separation of concerns
- Easy maintenance and debugging
- Scalable codebase
- Reusable components

---

## 🚀 How to Use

### Getting Started
1. **Select a Tool**: Choose from the bottom toolbar
2. **Create Elements**: Click on canvas to create shapes/text
3. **Select & Edit**: Click elements to select and modify
4. **Customize**: Use properties panel for detailed editing

### Advanced Usage
1. **Drawing**: Use pen tool for freehand drawing
2. **Layer Management**: Organize elements using layer panel
3. **Multi-Page**: Create multiple pages for complex projects
4. **Keyboard Shortcuts**: Use shortcuts for faster workflow
5. **Export**: Save your work as JSON or HTML

### Pro Tips
- Double-click text elements to edit content
- Use Ctrl+Scroll for quick zoom
- Hold Shift while resizing for constraints
- Use layer navigation shortcuts for efficiency
- Save frequently using Ctrl+S or save button

---

## 🎯 Learning Outcomes

This project demonstrates mastery of:

### Frontend Engineering
- **DOM Manipulation**: Complex element creation and management
- **Event Handling**: Mouse, keyboard, and custom events
- **State Management**: Application state synchronization
- **Performance**: Efficient rendering and updates

### Software Architecture
- **Modular Design**: Clean separation of concerns
- **Design Patterns**: Manager pattern implementation
- **Code Organization**: Scalable and maintainable structure
- **Error Handling**: Robust error management

### UI/UX Design
- **Interactive Design**: Smooth user interactions
- **Visual Feedback**: Clear user interface indicators
- **Accessibility**: Keyboard navigation support
- **Responsive Design**: Adaptive interface elements

### Advanced Concepts
- **Coordinate Systems**: Complex position calculations
- **Transform Mathematics**: Rotation and scaling algorithms
- **File Operations**: Export and import functionality
- **Browser APIs**: LocalStorage and File API usage

---

## 🔧 Installation & Setup

### Local Development
```bash
# Clone the repository
git clone https://github.com/deepsandilya01/Figma-Style-Design-Tool.git

# Navigate to project directory
cd Figma-Style-Design-Tool

# Open in browser (no build process required)
# Simply open index.html in your browser
# Or use a local server:
python -m http.server 8000
# or
npx serve .
```

### SCSS Compilation (Optional)
If you want to modify styles:
```bash
# Install SCSS compiler
npm install -g sass

# Watch for changes
sass --watch style.scss:style.css
```

---

## 🌟 Key Highlights

### Technical Achievements
- **Pure DOM Implementation**: No Canvas or SVG dependencies
- **Complex Interactions**: Drag, resize, rotate with pure JavaScript
- **Real-time Updates**: Instant property synchronization
- **Memory Efficient**: Optimized DOM manipulation
- **Cross-browser Compatible**: Works in all modern browsers

### User Experience
- **Intuitive Interface**: Familiar design tool interactions
- **Smooth Performance**: 60fps interactions
- **Keyboard Shortcuts**: Power user functionality
- **Visual Feedback**: Clear interaction indicators
- **Persistent State**: Never lose your work

### Code Quality
- **Modular Architecture**: Clean, maintainable code
- **Comprehensive Comments**: Well-documented functionality
- **Error Handling**: Robust error management
- **Performance Optimized**: Efficient algorithms
- **Scalable Design**: Easy to extend and modify

---

## 🏁 Conclusion

This project represents a **complete, production-ready design tool** built entirely with vanilla web technologies. It demonstrates advanced frontend engineering skills while maintaining the core principle:

> ⚠️ No Canvas, No SVG, No Frameworks – Everything is built using pure DOM manipulation.

**Key Achievements:**
- ✅ Full-featured design tool functionality
- ✅ Complex user interactions with pure DOM
- ✅ Professional-grade code architecture
- ✅ Comprehensive feature set
- ✅ Excellent user experience
- ✅ Zero external dependencies

Perfect showcase of **advanced frontend fundamentals** and **creative problem-solving** in web development.

---

## 👨‍💻 Developer

**Deep Sandilya**
- GitHub: [@deepsandilya01](https://github.com/deepsandilya01)
- LinkedIn: [Deep Sandilya](https://www.linkedin.com/in/deepsandilya01)
- Instagram: [@deepsandilya_01](https://www.instagram.com/deepsandilya_01)

---

*Built with ❤️ using pure web technologies*

