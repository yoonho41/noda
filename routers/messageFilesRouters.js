const mongoose = require('mongoose');
const express = require('express');
const crypto = require('crypto'); //파일 업로드할 때 key역할을 해주는 hash값 생성
const multer = require('multer');
const cd = require('content-disposition'); //한글명 파일도 다운로드 할 수 있게 해줌

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 16); // 몽고DB에서 한 파일당 16MB가 거의 최대임
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});

const MessageFiles = mongoose.model('message_files') //collection 호출 (table)


module.exports = (app) => {

    //파일 다운로드
    app.get('/api/files', async (req, res) => {
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20', 10), 1), 100);
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            MessageFiles.find({}, { data: 0 }).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
            MessageFiles.countDocuments(),
        ]);
        res.json({ items, page, pageSize, total });
    });

    //id로 파일 찾기
    app.get('/api/files/:id', async (req, res) => {
        const id = req.params.id;
        const doc = await MessageFiles.findById(id).lean(false);

        if (!doc) return res.status(404).json({ error: 'not found' });

        const data = toBuffer(doc.data);
        res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
        res.setHeader('Content-Length', String(data.length));
        res.setHeader('Content-Disposition', cd(doc.originalName,{type:'attachment'}));

        return res.end(doc.data);
    });

    //messageId로 파일 찾기 (해당 메일에 첨부된 파일만 찾아오기 위해서 사용)
    app.get('/api/files/messageId/:messageId', async (req, res) => {
        const { messageId } = req.params;
        const items = await MessageFiles
            .find({ messageId }, { data: 0 })
            .sort({ createdAt: -1 })
            .lean()
        if (items.length === 0) {
            return res.status(404).json({ error: 'no files', items: [], count: 0 });
        }

        const mapped = items.map((d) => ({
            id: String(d._id),
            originalName: d.originalName,
            mimeType: d.mimeType,
            size: d.size,
            createdAt: d.createdAt,
            downloadUrl: `/api/files/${d._id}`, //이 Url로 파일 다운로드 할 수 있음
        }))

        return res.json({ items: mapped, count: mapped.length });
    });


    //파일 업로드
    app.post('/api/files', upload.single('upload'), async (req, res) => {
        try {
            if (!req.file) 
                return res.status(400).json({ error: 'file(multipart field "upload") required' });

            const f = req.file;
            const checksum = sha256(f.buffer); //업로드 할 때 안 꼬이게 crypto 암호화 키 생성
            const doc = await MessageFiles.create({
                originalName: sanitizeFilename(f.originalname),
                mimeType: f.mimetype || 'application/octet-stream',
                size: f.size,
                checksum,
                data: f.buffer,
                messageId: req.body?.messageId,
            });

            

            const downloadUrl = `/api/files/${doc._id}`;

            return res.status(201).json({ id: String(doc._id), downloadUrl });

        } catch (err) {

            if (err && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: `file too large (>${MAX_FILE_MB}MB)` });
            }
            console.error(err);

            return res.status(500).json({ error: 'upload failed' });
        }
    });


    // 파일 삭제
    app.delete('/api/files/:messageId',async(req,res) => {
        const {messageId} = req.params;
        try {
            const r = await MessageFiles.deleteMany({ messageId });
            if (r.deletedCount === 0) return res.status(404).json({ ok: false, error: "not_found" });
            return res.status(200).send({ ok: true, error:false, r, deletedNo: no });
        } catch (e) {
            return res.status(500).json({ ok: false, error: "server_error" });
        }
    })




    function sha256(buf) {
        return crypto.createHash('sha256').update(buf).digest('hex');
    }


    //경로/제어문자 차단 + 한글 허용 (이거 없으면 파일명 한글부분 다 깨짐)
    //const cd = require('content-disposition'); 를 통해서 쉽게 할 수도 있지만 이런 방법도 있다는 것
    function sanitizeFilename(name, maxLen = 200) {
    
        // return String(name).replace(/[^\w.\-\s가-힣]/g, '_').slice(0, 200);

        // 1) 정규화(NFC): macOS 등 NFD 분해형 → 조합형으로
        let n = fixMojibakeName(String(name)).normalize("NFC");

        // 2) 제어문자/경로문자 제거 (윈도우 예약문자 포함)
        n = n
            .replace(/[\u0000-\u001F\u007F]/g, "")   // 제어문자
            .replace(/[\/\\:*?"<>|]/g, "_");         // 경로/예약

        // 3) 유니코드 문자/숫자 및 안전기호만 허용, 나머지는 '_'
        //    \p{L} = 모든 언어의 문자, \p{N} = 숫자 (u 플래그 필수)
        n = n.replace(/[^\p{L}\p{N}._\-\s]/gu, "_");

        // 4) 공백 정리 및 길이 제한
        n = n.replace(/\s+/g, " ").trim().slice(0, maxLen);

        // 5) 빈 문자열 대비
        return n.length ? n : "file";
    }


    // (위에서 이어짐) 업로드 중 latin1로 잘못 해석된 UTF-8 파일명을 복원 
    function fixMojibakeName(name) {
        if (!name) return "file";
        const looksLatin1 = /[\u00C0-\u00FF]/.test(name); // ì, ë 등
        const hasCJK = /[가-힣一-龥ぁ-ゖァ-ヺ]/.test(name);
        if (looksLatin1 && !hasCJK) {
            const decoded = Buffer.from(name, "latin1").toString("utf8");
            if (/[가-힣]/.test(decoded) && !/�/.test(decoded)) return decoded;
        }
        return name;
    }


    function contentDisposition1(filename) {
        const fallback = String(filename).replace(/["\\]/g, '_');
        const encoded = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
        return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
    }

    // Database에 있는 data를 buffer로 읽어서 다운로드
    function toBuffer(v) {
        // v: Buffer | BSON Binary | { data: number[] } | ArrayBuffer
        if (!v) return Buffer.alloc(0);
        if (Buffer.isBuffer(v)) return v;
        if (v.buffer) {
            // BSON Binary: v.buffer가 Buffer(또는 ArrayBuffer)
            return Buffer.isBuffer(v.buffer) ? v.buffer : Buffer.from(v.buffer);
        }
        if (v instanceof ArrayBuffer) return Buffer.from(v);
        if (Array.isArray(v.data)) return Buffer.from(v.data); // JSON 직렬화된 Buffer 케이스
        throw new TypeError('Unsupported binary type for response');
    }


}