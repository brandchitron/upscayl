const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Setup multer for file uploads (if you want)
const upload = multer({ dest: 'uploads/' });

app.post('/upscale', async (req, res) => {
  try {
    let imageUrl = req.body.image_url;
    let scale = parseInt(req.body.scale) || 2;

    if (!imageUrl) {
      return res.status(400).json({ error: "image_url is required" });
    }

    // Download image locally
    const inputPath = path.resolve('uploads', `input_${Date.now()}.jpg`);
    const outputPath = path.resolve('uploads', `output_${Date.now()}.png`);

    const writer = fs.createWriteStream(inputPath);
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
    });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Run Upscayl CLI
    const command = `upscayl-cli "${inputPath}" "${outputPath}" --scale ${scale}`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) return reject(error);
        resolve();
      });
    });

    // Send back the upscaled image as base64 or URL (here, base64)
    const imageBuffer = await fs.readFile(outputPath);
    const base64Image = imageBuffer.toString('base64');

    // Cleanup files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json({ 
      success: true,
      upscaled_image_base64: base64Image
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Upscayl API running on port ${port}`);
});
