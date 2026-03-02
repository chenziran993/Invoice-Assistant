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

    // 移除 data:image/xxx;base64, 前缀
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const data = await extractInvoiceData(base64Data);

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
