// upload-worker.js
self.addEventListener('message', async (e) => {
  const { file, category, tempDataID, API_URL } = e.data;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    let base64Data = event.target.result;
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }
    
    const formData = new FormData();
    formData.append("action", "uploadCalamityFile");
    formData.append("fileData", base64Data);
    formData.append("fileName", file.name);
    formData.append("category", category);
    formData.append("dataID", tempDataID.toString());
    
    const response = await fetch(API_URL, { method: "POST", body: formData });
    const result = await response.json();
    
    if (result.success) {
      self.postMessage({ success: true, fileLink: `https://drive.google.com/file/d/${result.fileId}/view`, category });
    } else {
      self.postMessage({ success: false, error: result.error, category });
    }
  };
  
  reader.readAsDataURL(file);
});