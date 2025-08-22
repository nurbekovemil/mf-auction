const { File, FileType, User, Auction } = require('../models');

exports.createFile = async (req, res) => {
    const { id } = req.user;
    try {
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        if (!req.file) {
        return res.status(400).json({ message: 'Файл не был предоставлен' });
        }

        const filePath = `/uploads/${req.file.filename}`;
        const newFile = await File.create({
            url: filePath,
            file_type: req.body.file_type,
            auction_id: req.body.auction_id,
            user_id: id
        });

        return res.status(201).json({ message: 'Файл успешно загружен', file: newFile });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при загрузке файла', error: error.message });
    }
}
exports.getMyFileList = async (req, res) => {
    const { id } = req.user;
    try {
        // const files = await File.findAll({
        //     where: { user_id: id },
        //     include: { model: Auction, as: 'auction' }
        // });
        const files = await Auction.findAll({
            attributes: ['id', 'asset'],
            include: [
                {
                    model: File,
                    as: 'files',
                    where: { user_id: id },
                },
            ],
        })
        return res.json(files);
    } catch (err) {
        throw new Error(JSON.stringify({ message: 'Ошибка при получении списка файлов', error: err.message }));
    }
}
exports.getUserFileList = async (req, res) => {
      const { id } = req.params;
    try {
        // const files = await File.findAll({
        //     where: { user_id: id }
        // });
        const files = await Auction.findAll({
            attributes: ['id', 'asset'],
            include: [
                {
                    model: File,
                    as: 'files',
                    where: { user_id: id },
                },
            ],
        })
        return res.json(files);
    } catch (err) {
        throw new Error(JSON.stringify({ message: 'Ошибка при получении списка файлов', error: err.message }));
    }
}
exports.createFileType = async (req, res) => {
  try {
    const { title } = req.body;
    const isFileType = await FileType.findOne({ where: { title } });
    if (isFileType) return res.status(400).json({ message: 'Тип файла уже существует' });
    await FileType.create({ title });
    return res.json({ message: 'Тип файла создан' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании типа файла', error: error.message });
  }
}

exports.getFileTypes = async (req, res) => {
  try {
    const fileTypes = await FileType.findAll();
    return res.json(fileTypes);
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении типов файлов', error: err.message }));
  }
}

exports.getAuctionFileList = async (req, res) => {
  const auction_id = req.params.id;
  try {
    const files = await Auction.findAll({
        where: { id: auction_id },
        attributes: ['id', 'asset'],
        include: [
            {
                model: File,
                as: 'files',
            },
        ],
    })
    return res.json(files);
  } catch (err) {
    throw new Error(JSON.stringify({ message: 'Ошибка при получении списка файлов', error: err.message }));
  }
}


