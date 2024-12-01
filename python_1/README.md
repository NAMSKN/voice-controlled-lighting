# Backend Application Setup Guide

## Prerequisites

### 1. Python Environment
- **Python Version**: 3.11
- Download and install from [python.org](https://www.python.org/)
- Ensure Python is added to system PATH during installation

### 2. Recommended IDE
- **PyCharm** (Recommended)
- Download from [JetBrains Official Website](https://www.jetbrains.com/pycharm/)

## Project Setup

### Step 1: Create Project Folder
```bash
mkdir backend
cd backend
```

### Step 2: Virtual Environment Setup
1. Open PyCharm and select **Open** for the `backend` folder
2. Configure Python Interpreter:
   - Go to **File > Settings > Python Interpreter**
   - Create a new virtual environment using Python 3.11

### Step 3: Install Dependencies
```bash
# Upgrade pip
pip install --upgrade pip

# Install required packages
pip install flask
pip install flask-cors
pip install transformers
pip install mysql-connector-python
pip install tensorflow

# Install PyTorch (CPU version)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Step 4: FFmpeg Installation

#### Windows
1. Download FFmpeg from [FFmpeg Official Website](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `bin` folder to system PATH:
   - Open System Environment Variables
   - Edit PATH variable
   - Add FFmpeg bin path (e.g., `C:\ffmpeg\bin`)

#### macOS/Linux
```bash
# Download and extract FFmpeg
# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH="/path/to/ffmpeg/bin:$PATH"

# Reload configuration
source ~/.bashrc  # or source ~/.zshrc
```

## Running the Application

### Using PyCharm
1. Open `App.py`
2. Right-click and select **Run 'App'**

### Using Terminal
```bash
# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
venv\Scripts\activate     # On Windows


# Run the sql commands for creating tables in ur schema. Drop the tables in `voice_control_system`

# Run the application
python App.py
```

## Troubleshooting

- Ensure all prerequisites are installed
- Check that virtual environment is activated
- Verify all dependencies are correctly installed
- Check system PATH for Python and FFmpeg

## Additional Resources

- [Python Official Documentation](https://docs.python.org/)
- [PyCharm Documentation](https://www.jetbrains.com/help/pycharm/meet-pycharm.html)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
