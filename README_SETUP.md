# Setup Instructions for Enhanced ARNG Hand Receipt Tracker

## 1. Gemini API Setup

To use the enhanced OCR functionality with Google Gemini AI, you'll need to:

1. **Get a Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure the API Key:**
   - Open the `.env` file in the project root
   - Replace `your_gemini_api_key_here` with your actual API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

## 2. Camera Permissions

The app now includes direct camera access. Make sure to:
- Grant camera permissions when prompted
- Use HTTPS in production (required for camera access)
- Test on both mobile and desktop devices

## 3. New Features

### Enhanced Camera Capture
- **Direct Camera Access**: Click "Open Camera (AI Enhanced)" to launch the camera interface
- **Live Preview**: Real-time camera feed with framing guides
- **Camera Switching**: Toggle between front and rear cameras (on supported devices)
- **High-Quality Capture**: Optimized for receipt photography

### Gemini AI OCR
- **Intelligent Extraction**: Uses Gemini AI to extract structured data from receipts
- **Military Context**: Specifically trained to recognize military terminology and forms
- **Automatic Categorization**: AI suggests appropriate equipment categories
- **Error Handling**: Graceful fallback if AI processing fails

### Data Flow
- **Capture → Extract → Review → Save**
- Extracted data automatically populates all form fields
- Manual review and editing step ensures accuracy
- Data flows seamlessly to ledger and dashboard

## 4. Testing the Enhanced Features

1. **Camera Test:**
   - Click "Open Camera (AI Enhanced)"
   - Grant camera permissions
   - Position a receipt in the frame
   - Click "Capture Photo"

2. **OCR Test:**
   - After capturing, wait for "Processing with Gemini AI OCR..."
   - Review the extracted data
   - Edit any fields as needed
   - Save the receipt

3. **Data Flow Test:**
   - Navigate to the Ledger to see the saved receipt
   - Check the Dashboard for updated analytics
   - Export to CSV to verify all data is included

## 5. Troubleshooting

### Camera Issues
- **Permission Denied**: Grant camera permissions in browser settings
- **Camera Not Found**: Ensure you have a working camera device
- **Black Screen**: Try refreshing the page and re-granting permissions

### Gemini API Issues
- **API Key Error**: Verify your API key is correctly set in `.env`
- **Rate Limits**: Free Gemini API has usage limits
- **Processing Failed**: Check network connection and try again

### Fallback Options
- If Gemini API fails, the app will still work with manual data entry
- You can upload photos from your gallery as an alternative to camera capture
- All existing functionality remains intact

## 6. Security Notes

- **API Key**: Never commit your `.env` file to version control
- **Local Storage**: All data is stored locally in your browser
- **Privacy**: No data is sent to external servers except for OCR processing
- **Production**: Use HTTPS and secure your API key in production deployments