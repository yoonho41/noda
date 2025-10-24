const multer = require('multer')
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const Images = mongoose.model('imagedbs')

//파일 업로드 폴더 만들기
try {
    fs.readdirSync('uploads')
} catch(error) {
    fs.mkdirSync('uploads')
}

const fileUploadRouters = (app,router) => {
    const storage = multer.diskStorage({
        destination:(req,fileUpload,callback) => {
            callback(null,'uploads')
        },
        filename:(req,fileUpload,callback) => {
            callback(null,Date.now().toString()+path.extname(fileUpload.originalname))
        }
    })

    var uploads = multer({
        storage:storage,
        limits:{
            files:10,
            fileSize:1024*1024*1024
        }
    })

    //라우터 추가
    router.route('/api/fileUpload').post(uploads.array('upload',1),(req,res) => {
        const files = req.files

        let originalName = ''
        let saveName = ''
        
        if (Array.isArray(files)) {
            for (let i=0; i<files.length; i++) {
                originalName = encoding(files[i].originalname)
                saveName = files[i].filename

                Images.create({
                    originalFileName:originalName,
                    saveFileName:saveName,
                    path:'http://localhost:8080/'+saveName
                })
            }
        }
        return res.status(200).send()

    })
    //라우터 app에 등록
    app.use('/',router)

}


//한글 파일이름 깨짐 방지
function encoding(fileName){
    return Buffer.from(fileName,'latin1').toString('utf8')
}

module.exports = fileUploadRouters