import { Router } from 'express';
import { extractInvoiceData } from '../services/ocr';
import { config } from '../config';

const router = Router();

// 识别发票
router.post('/extract', async (req, res) => {
  try {
    const { image, category } = req.body;

    // category 可以用于后续业务逻辑，目前先接收但不强制使用
    if (category) {
      console.log('Received category:', category);
    }

    if (!image) {
      return res.status(400).json({ error: '请提供图片' });
    }

    // 检测文件类型
    let base64Data = image;
    let fileType = 'image';

    if (image.startsWith('data:application/pdf;base64,')) {
      // PDF文件
      base64Data = image.replace(/^data:application\/pdf;base64,/, '');
      fileType = 'pdf';
      console.log('Processing PDF file');
    } else if (image.startsWith('data:image/')) {
      // 图片文件
      base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      fileType = 'image';
      console.log('Processing image file');
    }

    const data = await extractInvoiceData(base64Data, fileType);

    // 校验购买方
    const isBuyerValid = data.buyerName.includes(config.school.name) &&
                         data.buyerTaxId.includes(config.school.taxId);

    res.json({
      ...data,
      isBuyerValid,
    });
  } catch (error: any) {
    console.error('OCR error:', error);
    res.status(500).json({ error: '发票识别失败' });
  }
});

export default router;
