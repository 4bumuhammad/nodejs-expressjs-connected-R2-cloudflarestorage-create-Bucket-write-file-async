require('dotenv').config();
const express = require('express');
const { S3Client, CreateBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = 3000;

app.use(express.json());

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`, //Cloudflare R2 endpoint URL
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
  }
});

const createBucket = async (bucketName) => {
  console.log(`Creating bucket ${bucketName}`);
  const command = new CreateBucketCommand({ Bucket: bucketName });
  try {
    const { Location } = await s3.send(command);
    console.log(`Bucket ${bucketName} created with location ${Location}`);
    return Location;
  } catch (error) {
    if (error.name === "BucketAlreadyOwnedByYou") {
      console.log(`Bucket ${bucketName} already exists, skipping...`);
    } else {
      console.error(`Error creating bucket ${bucketName}`, error);
      throw error;
    }
  }
}

const uploadFile = async (bucketName, fileName, fileContent) => {
  console.log(`Upload file ${fileName} to bucket ${bucketName}`);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent
  });

  try {
    const { ETag } = await s3.send(command);
    console.log(`File ${fileName} uploaded with ETag ${ETag}`);
    return ETag;
  } catch (error) {
    console.error(`Error uploading file ${fileName} to bucket ${bucketName}`, error);
    throw error;
  }
};

app.post('/buckets', async (req, res) => {
  const bucketName = req.body.bucketName;
  try {
    const location = await createBucket(bucketName);
    res.status(201).json({ bucketName, location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bucket' });
  }
});

app.post('/upload', async (req, res) => {
  const { bucketName, fileName, fileContent } = req.body;
  try {
    const ETag = await uploadFile(bucketName, fileName, fileContent);
    res.status(201).json({ fileName, ETag });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan pada port ${port}`);
  console.log(`Access Key ID: ${process.env.ACCESS_KEY_ID}`);
  console.log(`Secret Access Key: ${process.env.SECRET_ACCESS_KEY}`);  
});
