const fs = require('fs');
const path = require('path');
const { imageComponent } = require('./editor');

const uploadImages = async (client, imagePaths, token) => {
  const components = [];
  const errors = [];
  for (let index = 0; index < imagePaths.length; index += 1) {
    const imagePath = imagePaths[index];
    try {
      const buffer = fs.readFileSync(imagePath);
      const uploaded = await client.uploadImage(buffer, path.basename(imagePath), token);
      components.push(imageComponent(uploaded, index === 0));
    } catch (error) {
      errors.push({ imagePath, error: error.message });
    }
  }
  return { components, errors };
};

module.exports = {
  uploadImages,
};
