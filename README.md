# FuseClassroomLoadTest

## Project Setup Guide

Before running the tests, ensure the required sample files are present in the **data/** directory at the root of the project. Make sure the file name matches as follows to avoid any errors.

1. Scan Document Sample File

-   Add a sample image for document scanning:
    `sample_image.png (or .jpg/.jpeg)`

2. Audio Sample File

-   Add a sample audio file: `sample_audio.wav`

3. Video Test Sample Files

-   Add three images for video testing: `face_front.jpeg`, `face_right.jpeg` & `face_left.jpeg`

-   Directory Structure - Ensure the folder structure is as follows:

    AI-Shikshya/  
    ├── data/  
    │ ├── sample_image.png  
    │ ├── sample_audio.wav  
    │ ├── face_front.jpeg  
    │ ├── face_right.jpeg  
    │ ├── face_left.jpeg

## Configuration Setup

Modify the configuration file by adding the required authentication credentials: Navigate to the config file.

-   Add the following credentials: `Token=YOUR_TOKEN_HERE` & `ID_Token=YOUR_ID_TOKEN_HERE`
-   Replace the values with the actual values obtained from the site.

## Installation Guide

This project uses k6 for load testing. Follow the steps below to install and run the tests.

1. Install k6

-   Linux
    `sudo apt update && sudo apt install k6`
-   macOS
    `brew install k6`
-   Windows
    `choco install k6`

2. Running the Tests

-   `k6 run loadTesting.js`
