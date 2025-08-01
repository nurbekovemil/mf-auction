const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // .pdf, .jpg и т.д.
    const uniqueName = uuidv4(); // например: 550e8400-e29b-41d4-a716-446655440000
    cb(null, `${uniqueName}${ext}`);
  }
});

const upload = multer({ storage });
module.exports = upload;
