const express = require('express');
const router = express.Router();
const fileService = require('../services/file');
const {auth} = require('../middlewares/authMiddleware');
const upload = require('../middlewares/fileMiddleware');

router.get('/my-list', auth, fileService.getMyFileList);
router.get('/:id/list', auth, fileService.getUserFileList);
router.post('/create', auth, upload.single('file'), fileService.createFile);
// router.put('/:id/update', auth, fileService.updateFile);

router.get('/type/list', auth, fileService.getFileTypes);
router.post('/type/create', auth, fileService.createFileType);

module.exports = router;
