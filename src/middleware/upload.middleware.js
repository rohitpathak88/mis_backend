const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        const timestamp = Date.now();
        const extension = path.extname(file.originalname);

        cb(
            null,
            `mis-${timestamp}${extension}`
        );
    }
});

const fileFilter = (req, file, cb) => {

    const allowedExtensions = [
        ".xlsx",
        ".xls"
    ];

    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        return cb(
            new Error("Only Excel files are allowed")
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,

    limits: {
        fileSize: 20 * 1024 * 1024
    },

    fileFilter
});

module.exports = upload;